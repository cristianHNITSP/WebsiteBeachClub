"""Reglas de las reservas del panel (PLAN-BACKEND §5, §6, §17.3). Sin FastAPI.

Toda acción, dentro de su transacción y en este orden: permiso (la ruta),
propiedad (alcance + RLS), estado de origen (máquina cerrada), versión (bloqueo
optimista) y reglas del negocio. Si algo falla, no se escribe nada. Si todo pasa,
se escriben juntos: el cambio, su historial, su auditoría y su aviso (outbox).

Las reservas del panel nacen `confirmada` (las captura el personal, §5.2: "paga
en el hotel"). Las de la API pública nacen `retenida` y vencen solas (fase 6,
`servicios/publica.py`); ahí no hay empleado: `actor` es None.
"""

import secrets
from datetime import date, datetime, timedelta
from uuid import UUID
from zoneinfo import ZoneInfo

from psycopg.errors import ExclusionViolation, UniqueViolation
from sqlalchemy import func, select
from sqlalchemy.dialects.postgresql import Range
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from sqlalchemy.orm.exc import StaleDataError

from app.auth.alcance import Alcance
from app.auth.dependencias import Actor
from app.errores import Conflicto, NoEncontrado, ReglaDeNegocio
from app.esquemas.reservas import AjusteCobroCambio, Mover, PagoNuevo, ReservaNueva
from app.modelos import Habitacion, Outbox, Pago, Reserva, ReservaEvento
from app.modelos.base import INCLUIR_ELIMINADOS
from app.repositorios import habitaciones as repo_habitaciones
from app.repositorios import reservas as repo
from app.repositorios import tarifas as repo_tarifas
from app.servicios import outbox
from app.servicios.auditoria import auditar
from app.servicios.auditoria import nueva as nueva_auditoria
from app.servicios.tarifas import precios_por_noche, total_de

MERIDA = ZoneInfo("America/Merida")
OTRO_LA_CAMBIO = "Alguien más cambió esta reserva mientras la veías. Recarga para ver lo nuevo."
ETIQUETA = {
    "retenida": "pendiente de pago",
    "confirmada": "confirmada",
    "en_curso": "en curso",
    "completada": "completada",
    "expirada": "vencida",
    "cancelada": "cancelada",
}
# Máquina de estados CERRADA (§5.3, §17.3): cualquier otra transición es un error,
# aunque el usuario tenga permiso.
TRANSICIONES = {
    ("retenida", "confirmada"),
    ("retenida", "expirada"),
    ("retenida", "cancelada"),
    ("confirmada", "en_curso"),
    ("confirmada", "cancelada"),
    ("en_curso", "completada"),
}
_ALFABETO = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"  # sin 0/O ni 1/I: se dicta por teléfono


def hoy() -> date:
    """Las noches son fechas de Mérida, no del servidor."""
    return datetime.now(MERIDA).date()


def _codigo() -> str:
    return "FRD-" + "".join(secrets.choice(_ALFABETO) for _ in range(6))


def anticipo_de(total: int, modalidad: str, porcentaje: int | None) -> int:
    """Lo que se cobra al reservar (centavos), redondeado al centavo más cercano."""
    return total if modalidad == "completo" else (total * porcentaje + 50) // 100


def proporcional(total: int, noches_antes: int, noches_ahora: int) -> int:
    """Mover o estirar respeta lo pactado: el total cambia en proporción a las
    noches (mismas noches = mismo total, exacto), no a las tarifas de hoy."""
    return (total * noches_ahora + noches_antes // 2) // noches_antes


def a_salida(r: Reserva) -> dict:
    return {
        "id": r.id,
        "codigo": r.codigo,
        "propiedad_id": r.propiedad_id,
        "habitacion_id": r.habitacion_id,
        "habitacion_nombre": r.habitacion.nombre,
        "habitacion_situacion": r.habitacion.situacion,
        "tipo": r.tipo,
        "estado": r.estado,
        "llegada": r.llegada,
        "salida": r.salida,
        "noches": r.noches,
        "adultos": r.adultos,
        "ninos": r.ninos,
        "huesped_nombre": r.huesped_nombre,
        "huesped_correo": r.huesped_correo,
        "huesped_telefono": r.huesped_telefono,
        "notas": r.notas,
        "modalidad": r.modalidad,
        "porcentaje_anticipo": r.porcentaje_anticipo,
        "tarifa_noche_centavos": r.tarifa_noche_centavos,
        "total_centavos": r.total_centavos,
        "anticipo_centavos": r.anticipo_centavos,
        "saldo_centavos": r.saldo_centavos,
        "pagado_centavos": r.pagado_centavos,
        "por_cobrar_centavos": r.por_cobrar_centavos,
        "motivo_cancelacion": r.motivo_cancelacion,
        "sitio_id": r.sitio_id,
        "vence_en": r.vence_en,
        "version": r.version,
        "creada": r.creada,
    }


def _foto(r: Reserva) -> dict:
    """Estado para auditoría y outbox (JSON)."""
    return {k: (str(v) if isinstance(v, UUID | date | datetime) else v) for k, v in a_salida(r).items()}


def _rango(d1: date, d2: date) -> str:
    corto = lambda d: d.strftime("%d/%m")  # noqa: E731
    return f"{corto(d1)} → {corto(d2)}"


def _describir(r: Reserva) -> str:
    quien = "un bloqueo de mantenimiento" if r.tipo == "bloqueo" else f"la reserva de {r.huesped_nombre}"
    return f"{quien} ({_rango(r.llegada, r.salida)})"


async def _explicar_choque(sesion, habitacion_id, llegada, salida, excluir=None) -> Conflicto:
    otra = await repo.choque(sesion, habitacion_id, llegada, salida, excluir=excluir)
    detalle = f": choca con {_describir(otra)}" if otra else ""
    return Conflicto(f"Esas noches ya están ocupadas{detalle}", codigo="sin_disponibilidad")


async def _turno_de(sesion: AsyncSession, *habitaciones: UUID) -> None:
    """Una escritura a la vez POR HABITACIÓN (candado de Postgres hasta el COMMIT).

    La restricción `sin_choque` ya impide la sobreventa, pero con inserciones
    simultáneas cada transacción espera a la otra para comprobarla y Postgres
    termina una con *deadlock* (500 en vez de un claro 409). Lo vio la prueba de
    concurrencia. En fila, la segunda ve a la primera ya guardada y recibe
    «esas noches ya están ocupadas». En orden fijo, para no cruzarse entre sí."""
    for h in sorted(set(habitaciones)):
        await sesion.execute(select(func.pg_advisory_xact_lock(func.hashtextextended(str(h), 0))))


async def _cargar(
    sesion: AsyncSession, alcance: Alcance, reserva_id: UUID, version: int | None = None
) -> Reserva:
    r = await repo.por_id(sesion, alcance, reserva_id, bloquear=True)
    if r is None:
        raise NoEncontrado("Esa reserva no existe")  # o es de otra propiedad
    if version is not None and r.version != version:
        raise Conflicto(OTRO_LA_CAMBIO, codigo="version")
    return r


def _transicion(r: Reserva, a: str) -> None:
    if (r.estado, a) not in TRANSICIONES:
        raise Conflicto(
            f"Una reserva {ETIQUETA[r.estado]} no puede pasar a {ETIQUETA[a]}", codigo="transicion"
        )


async def _habitacion(sesion: AsyncSession, alcance: Alcance, habitacion_id: UUID) -> Habitacion:
    h = await repo_habitaciones.por_id(sesion, alcance, habitacion_id)
    if h is None:
        raise NoEncontrado("Esa habitación no existe")
    return h


def _validar_habitacion(h: Habitacion, tipo: str, adultos: int, ninos: int) -> None:
    if tipo == "bloqueo":
        return  # se bloquea también una en mantenimiento: es justo para eso
    if h.estado != "activa":
        raise ReglaDeNegocio(
            f"«{h.nombre}» no se puede reservar: está {h.estado}", codigo="habitacion_no_disponible"
        )
    if adultos + ninos > h.capacidad:
        raise ReglaDeNegocio(f"«{h.nombre}» es para {h.capacidad} personas como máximo", codigo="capacidad")


async def _registrar(
    sesion, actor: Actor | None, r: Reserva, tipo: str, *, de: str | None = None, detalle: dict | None = None,
    antes: dict | None = None, aviso: str,
) -> None:  # fmt: skip
    """Historial + auditoría + outbox del cambio, en la misma transacción."""
    sesion.add(
        ReservaEvento(
            reserva_id=r.id,
            propiedad_id=r.propiedad_id,
            usuario_id=actor and actor.id,
            tipo=tipo,
            de_estado=de,
            a_estado=r.estado,
            detalle=detalle,
        )
    )
    despues = _foto(r)
    await auditar(
        sesion, accion=f"reserva.{tipo}", entidad="reserva", entidad_id=r.id, antes=antes, despues=despues
    )
    await outbox.encolar(
        sesion,
        aviso,
        agregado="reserva",
        agregado_id=r.id,
        propiedad_id=r.propiedad_id,
        # Quién lo causó: el panel no le avisa a esa misma persona de lo que acaba de hacer.
        datos={**despues, "detalle": detalle, "de": de, "por": str(actor.id) if actor else None},
    )


# ── Cotizar y crear ──


async def cotizar(
    sesion: AsyncSession,
    alcance: Alcance,
    habitacion_id: UUID,
    llegada: date,
    salida: date,
    excluir: UUID | None,
) -> dict:
    h = await _habitacion(sesion, alcance, habitacion_id)
    ajuste = await repo.ajuste_cobro(sesion, h.propiedad_id)
    noches = (salida - llegada).days
    precios = precios_por_noche(
        h.tarifa_centavos, await repo_tarifas.que_tocan(sesion, h.id, llegada, salida), llegada, salida
    )  # con temporadas
    total = sum(precios)
    anticipo = anticipo_de(total, ajuste.modalidad, ajuste.porcentaje_anticipo)
    otra = await repo.choque(sesion, habitacion_id, llegada, salida, excluir=excluir)
    return {
        "habitacion_id": h.id,
        "noches": noches,
        "tarifa_noche_centavos": (total + noches // 2) // noches,  # promedio (con temporadas)
        "total_centavos": total,
        "modalidad": ajuste.modalidad,
        "porcentaje_anticipo": ajuste.porcentaje_anticipo,
        "anticipo_centavos": anticipo,
        "saldo_centavos": total - anticipo,
        "disponible": otra is None,
        "choque": _describir(otra) if otra else None,
        "precios_noche_centavos": precios,
    }


async def crear(
    sesion: AsyncSession,
    actor: Actor | None,
    alcance: Alcance,
    datos: ReservaNueva,
    *,
    estado: str = "confirmada",
    extra: dict | None = None,
) -> Reserva:
    """`estado` y `extra` (sitio, vencimiento, token): los de la API pública."""
    if datos.llegada < hoy():
        raise ReglaDeNegocio("La llegada no puede ser en el pasado", codigo="fecha_pasada")
    h = await _habitacion(sesion, alcance, datos.habitacion_id)
    _validar_habitacion(h, datos.tipo, datos.adultos, datos.ninos)
    reserva = datos.tipo == "reserva"
    campos = {
        "propiedad_id": h.propiedad_id,
        "habitacion_id": h.id,
        "tipo": datos.tipo,
        "estado": estado,
        "estancia": Range(datos.llegada, datos.salida),
        "adultos": datos.adultos if reserva else 0,
        "ninos": datos.ninos if reserva else 0,
        "huesped_nombre": datos.huesped_nombre,
        "huesped_correo": str(datos.huesped_correo) if datos.huesped_correo else None,
        "huesped_telefono": datos.huesped_telefono,
        "notas": datos.notas,
        "creada_por": actor and actor.id,
        **(extra or {}),
    }
    if reserva:
        ajuste = await repo.ajuste_cobro(sesion, h.propiedad_id)
        noches = (datos.salida - datos.llegada).days
        total = await total_de(sesion, h, datos.llegada, datos.salida)  # cada noche con su temporada
        anticipo = anticipo_de(total, ajuste.modalidad, ajuste.porcentaje_anticipo)
        campos |= {
            "modalidad": ajuste.modalidad,
            "porcentaje_anticipo": ajuste.porcentaje_anticipo,
            "tarifa_noche_centavos": (total + noches // 2) // noches,  # promedio pactado
            "total_centavos": total,
            "anticipo_centavos": anticipo,
        }
    await _turno_de(sesion, h.id)
    for _ in range(3):  # el código público es aleatorio: si choca (rarísimo), otro
        r = Reserva(codigo=_codigo(), **campos)
        try:
            async with sesion.begin_nested():  # el choque no tumba la transacción
                sesion.add(r)
                await sesion.flush()
            break
        except IntegrityError as e:
            if isinstance(e.orig, ExclusionViolation):
                raise await _explicar_choque(sesion, h.id, datos.llegada, datos.salida) from e
            if not (isinstance(e.orig, UniqueViolation) and "codigo" in str(e.orig)):
                raise
    else:
        raise Conflicto("No se pudo generar el código de la reserva. Intenta de nuevo.", codigo="codigo")
    r = await repo.por_id(sesion, alcance, r.id)  # con su habitación cargada
    await _registrar(sesion, actor, r, "crear", aviso="reserva.creada")
    if datos.pago_inicial:
        monto = datos.pago_inicial.monto_centavos or r.anticipo_centavos
        await _cobrar(
            sesion,
            actor,
            r,
            concepto=concepto_de(r, monto),
            metodo=datos.pago_inicial.metodo,
            monto=monto,  # _cobrar rechaza más de lo que falta por cobrar
            referencia=datos.pago_inicial.referencia,
        )
    return r


def concepto_de(r: Reserva, monto: int) -> str:
    """Cómo se registra un cobro según lo que cubre."""
    if monto >= r.por_cobrar_centavos:
        return "total" if r.pagado_centavos == 0 else "saldo"
    if r.pagado_centavos == 0 and r.modalidad == "anticipo" and monto == r.anticipo_centavos:
        return "anticipo"
    return "abono"


# ── Mover, estirar, cambiar de habitación ──


async def mover(
    sesion: AsyncSession, actor: Actor, alcance: Alcance, reserva_id: UUID, datos: Mover
) -> Reserva:
    r = await _cargar(sesion, alcance, reserva_id, datos.version)
    if r.estado not in ("retenida", "confirmada", "en_curso"):
        raise Conflicto(f"Una reserva {ETIQUETA[r.estado]} ya no se mueve", codigo="transicion")
    if r.estado == "en_curso" and datos.llegada != r.llegada:
        raise ReglaDeNegocio("Ya está en curso: solo se cambia la salida o la habitación", codigo="en_curso")
    if datos.llegada != r.llegada and datos.llegada < hoy():
        raise ReglaDeNegocio("La llegada no puede quedar en el pasado", codigo="fecha_pasada")
    if datos.habitacion_id != r.habitacion_id:
        h = await _habitacion(sesion, alcance, datos.habitacion_id)
        if h.propiedad_id != r.propiedad_id:
            raise ReglaDeNegocio("Una reserva no cambia de propiedad", codigo="otra_propiedad")
        _validar_habitacion(h, r.tipo, r.adultos, r.ninos)
    await _turno_de(sesion, r.habitacion_id, datos.habitacion_id)
    antes = _foto(r)
    noches = (datos.salida - datos.llegada).days
    # Se respeta lo pactado: el total en proporción a las noches y la modalidad
    # de la reserva, no las tarifas ni el ajuste de hoy.
    if r.tipo == "reserva":
        total = proporcional(r.total_centavos, r.noches, noches)
        anticipo = anticipo_de(total, r.modalidad, r.porcentaje_anticipo)
    else:
        total, anticipo = 0, 0
    if r.pagado_centavos > total:
        raise ReglaDeNegocio(
            "Ya se cobró más que el nuevo total. Registra primero la devolución.", codigo="pagado_excede"
        )
    try:
        async with sesion.begin_nested():  # los cambios DENTRO del savepoint (BACKEND-ARQUITECTURA §6)
            r.habitacion_id, r.estancia = datos.habitacion_id, Range(datos.llegada, datos.salida)
            r.total_centavos, r.anticipo_centavos = total, anticipo
            await sesion.flush()
    except StaleDataError as e:
        raise Conflicto(OTRO_LA_CAMBIO, codigo="version") from e
    except IntegrityError as e:
        if isinstance(e.orig, ExclusionViolation):
            raise await _explicar_choque(
                # `reserva_id` y no `r.id`: tras el rollback del savepoint `r` queda expirada
                sesion,
                datos.habitacion_id,
                datos.llegada,
                datos.salida,
                reserva_id,
            ) from e
        raise
    r = await repo.por_id(sesion, alcance, r.id)
    await _registrar(
        sesion,
        actor,
        r,
        "mover",
        antes=antes,
        aviso="reserva.movida",
        detalle={
            "antes": {
                "habitacion": antes["habitacion_nombre"],
                "llegada": antes["llegada"],
                "salida": antes["salida"],
            },
            "despues": {
                "habitacion": r.habitacion.nombre,
                "llegada": str(r.llegada),
                "salida": str(r.salida),
            },
        },
    )
    return r


# ── Cambios de estado ──


async def _cambiar_estado(
    sesion, actor, alcance, reserva_id, version, a: str, *, aviso: str, tipo: str, motivo: str | None = None
) -> Reserva:
    r = await _cargar(sesion, alcance, reserva_id, version)
    _transicion(r, a)
    if a == "en_curso":
        if r.tipo == "bloqueo":
            raise ReglaDeNegocio("Un bloqueo no tiene llegada", codigo="bloqueo")
        if not r.llegada <= hoy() < r.salida:
            raise ReglaDeNegocio("La llegada se registra el día de su estancia", codigo="fuera_de_fecha")
    if a == "completada" and r.por_cobrar_centavos > 0:
        raise ReglaDeNegocio(
            f"Falta cobrar ${r.por_cobrar_centavos / 100:,.2f} antes de registrar la salida",
            codigo="saldo_pendiente",
        )
    antes, de = _foto(r), r.estado
    r.estado = a
    if motivo is not None:
        r.motivo_cancelacion = motivo
    try:
        await sesion.flush()
    except StaleDataError as e:
        raise Conflicto(OTRO_LA_CAMBIO, codigo="version") from e
    await _registrar(
        sesion,
        actor,
        r,
        tipo,
        de=de,
        antes=antes,
        aviso=aviso,
        detalle={"motivo": motivo} if motivo else None,
    )
    return r


async def llegada(sesion, actor, alcance, reserva_id: UUID, version: int) -> Reserva:
    return await _cambiar_estado(
        sesion, actor, alcance, reserva_id, version, "en_curso", aviso="reserva.llegada", tipo="llegada"
    )


async def salida(sesion, actor, alcance, reserva_id: UUID, version: int) -> Reserva:
    return await _cambiar_estado(
        sesion, actor, alcance, reserva_id, version, "completada", aviso="reserva.salida", tipo="salida"
    )


async def cancelar(sesion, actor, alcance, reserva_id: UUID, version: int, motivo: str | None) -> Reserva:
    return await _cambiar_estado(
        sesion,
        actor,
        alcance,
        reserva_id,
        version,
        "cancelada",
        aviso="reserva.cancelada",
        tipo="cancelar",
        motivo=motivo or "",
    )


# ── Pagos (registrados a mano en el panel) ──


async def _cobrar(sesion, actor: Actor, r: Reserva, *, concepto, metodo, monto: int, referencia) -> Pago:
    if r.tipo != "reserva":
        raise ReglaDeNegocio("Un bloqueo no lleva pagos", codigo="bloqueo")
    if r.estado not in ("confirmada", "en_curso", "completada"):
        raise ReglaDeNegocio(f"No se cobra una reserva {ETIQUETA[r.estado]}", codigo="transicion")
    if monto > r.por_cobrar_centavos:
        raise ReglaDeNegocio(
            f"Es más de lo que falta por cobrar (${r.por_cobrar_centavos / 100:,.2f})", codigo="excede"
        )
    pago = Pago(
        reserva_id=r.id,
        propiedad_id=r.propiedad_id,
        concepto=concepto,
        metodo=metodo,
        estado="cobrado",
        monto_centavos=monto,
        referencia=referencia,
        registrado_por=actor.id,
    )
    sesion.add(pago)
    antes = _foto(r)
    r.pagado_centavos += monto
    await sesion.flush()
    await _registrar(
        sesion,
        actor,
        r,
        "pago",
        antes=antes,
        aviso="pago.registrado",
        detalle={"pago_id": str(pago.id), "concepto": concepto, "metodo": metodo, "monto_centavos": monto},
    )
    return pago


async def registrar_pago(sesion, actor, alcance, reserva_id: UUID, datos: PagoNuevo) -> Reserva:
    # Sin `version`: sumar un pago no pisa nada, y la fila está bloqueada (FOR UPDATE).
    r = await _cargar(sesion, alcance, reserva_id)
    await _cobrar(
        sesion,
        actor,
        r,
        concepto=datos.concepto,
        metodo=datos.metodo,
        monto=datos.monto_centavos,
        referencia=datos.referencia,
    )
    return r


# ── Lecturas ──


async def listar(sesion, alcance, **filtros) -> list[Reserva]:
    return await repo.listar(sesion, alcance, **filtros)


async def detalle(sesion, alcance, reserva_id: UUID) -> tuple[Reserva, list[Pago], list[dict]]:
    r = await repo.por_id(sesion, alcance, reserva_id)
    if r is None:
        raise NoEncontrado("Esa reserva no existe")
    return r, await repo.pagos(sesion, r.id), await desglose(sesion, r)


def repartir(total: int, pesos: list[int]) -> list[int]:
    """`total` en partes proporcionales a `pesos`, exacto al centavo: los
    centavos que sobra el redondeo van a las primeras noches."""
    if not pesos:
        return []
    if sum(pesos) <= 0:
        pesos = [1] * len(pesos)
    suma = sum(pesos)
    partes = [total * p // suma for p in pesos]
    for i in range(total - sum(partes)):
        partes[i % len(partes)] += 1
    return partes


async def desglose(sesion: AsyncSession, r: Reserva) -> list[dict]:
    """Cada noche con su parte del total PACTADO y cuánto de ella está pagado.
    La parte de cada noche sigue el precio de esa noche (temporadas), escalado al
    total pactado: mover o cambiar tarifas después nunca hace que la suma no
    cuadre. Lo pagado cubre las noches en orden (primero la primera)."""
    if r.tipo != "reserva" or r.noches == 0:
        return []
    temporadas = await repo_tarifas.que_tocan(sesion, r.habitacion_id, r.llegada, r.salida)
    montos = repartir(
        r.total_centavos, precios_por_noche(r.habitacion.tarifa_centavos, temporadas, r.llegada, r.salida)
    )
    restante, noches = r.pagado_centavos, []
    for i, monto in enumerate(montos):
        pagado = min(monto, max(restante, 0))
        restante -= pagado
        estado = "pagada" if pagado == monto else ("parcial" if pagado else "pendiente")
        noches.append(
            {
                "fecha": r.llegada + timedelta(days=i),
                "monto_centavos": monto,
                "pagado_centavos": pagado,
                "estado": estado,
            }
        )
    return noches


async def historial(sesion, alcance, reserva_id: UUID) -> list[ReservaEvento]:
    if await repo.por_id(sesion, alcance, reserva_id) is None:
        raise NoEncontrado("Esa reserva no existe")
    return await repo.eventos(sesion, reserva_id)


# ── Ajuste de cobro por propiedad (§5.4) ──


async def ajustes_cobro(sesion, alcance):
    return await repo.ajustes_cobro(sesion, alcance)


async def cambiar_cobro(sesion, actor, alcance: Alcance, propiedad_id: UUID, datos: AjusteCobroCambio):
    if not alcance.permite(propiedad_id):
        raise NoEncontrado("Esa propiedad no existe")
    ajuste = await repo.ajuste_cobro(sesion, propiedad_id)
    if ajuste is None:
        raise NoEncontrado("Esa propiedad no existe")
    antes = {"modalidad": ajuste.modalidad, "porcentaje_anticipo": ajuste.porcentaje_anticipo}
    ajuste.modalidad, ajuste.porcentaje_anticipo, ajuste.actualizado_por = (
        datos.modalidad,
        datos.porcentaje_anticipo,
        actor.id,
    )
    await sesion.flush()
    await sesion.refresh(ajuste)
    await auditar(
        sesion,
        accion="cobro.cambiar",
        entidad="propiedad",
        entidad_id=propiedad_id,
        antes=antes,
        despues={"modalidad": ajuste.modalidad, "porcentaje_anticipo": ajuste.porcentaje_anticipo},
    )
    return ajuste


async def devolver(sesion, actor: Actor, alcance: Alcance, reserva_id: UUID, datos) -> Reserva:
    """Registra dinero que SALE hacia el huésped. No toca pagos anteriores: es
    una fila más. Se puede en cualquier estado (típico: tras cancelar)."""
    r = await _cargar(sesion, alcance, reserva_id)
    if r.tipo != "reserva":
        raise ReglaDeNegocio("Un bloqueo no lleva pagos", codigo="bloqueo")
    if datos.monto_centavos > r.pagado_centavos:
        raise ReglaDeNegocio(
            f"Es más de lo que se ha cobrado (${r.pagado_centavos / 100:,.2f})", codigo="excede"
        )
    pago = Pago(
        reserva_id=r.id,
        propiedad_id=r.propiedad_id,
        concepto="devolucion",
        metodo=datos.metodo,
        estado="reembolsado",
        monto_centavos=datos.monto_centavos,
        referencia=datos.referencia,
        motivo=datos.motivo,
        registrado_por=actor.id,
    )
    sesion.add(pago)
    antes = _foto(r)
    r.pagado_centavos -= datos.monto_centavos
    await sesion.flush()
    await _registrar(
        sesion,
        actor,
        r,
        "devolucion",
        antes=antes,
        aviso="pago.devuelto",
        detalle={
            "pago_id": str(pago.id),
            "metodo": datos.metodo,
            "monto_centavos": datos.monto_centavos,
            "motivo": datos.motivo,
        },
    )
    return r


# ── Vencer retenciones (Celery, cada minuto) ──


def vencer_retenciones(sesion, limite: int = 200) -> int:
    """Las retenidas cuyo plazo pasó se vuelven `expirada` y liberan sus noches
    (PLAN-BACKEND §5.2), con historial, auditoría y outbox como cualquier cambio.
    Síncrona (Celery). SKIP LOCKED: si alguien la está tocando, la siguiente vuelta."""
    filas = (
        sesion.execute(
            select(Reserva)
            .where(Reserva.estado == "retenida", Reserva.vence_en < func.now())
            .options(selectinload(Reserva.habitacion))
            .execution_options(**{INCLUIR_ELIMINADOS: True})
            .order_by(Reserva.vence_en)
            .limit(limite)
            .with_for_update(of=Reserva, skip_locked=True)
        )
        .scalars()
        .all()
    )
    for r in filas:
        antes = _foto(r)
        r.estado = "expirada"
        sesion.flush()
        despues = _foto(r)
        sesion.add(
            ReservaEvento(
                reserva_id=r.id, propiedad_id=r.propiedad_id, tipo="expirar", de_estado="retenida",
                a_estado="expirada",
            )
        )  # fmt: skip
        sesion.add(
            nueva_auditoria(
                accion="reserva.expirar", entidad="reserva", entidad_id=r.id, antes=antes, despues=despues
            )
        )
        sesion.add(
            Outbox(
                tipo="reserva.expirada", agregado="reserva", agregado_id=r.id, propiedad_id=r.propiedad_id,
                datos={**despues, "detalle": None, "de": "retenida", "por": None},
            )
        )  # fmt: skip
    sesion.flush()
    return len(filas)
