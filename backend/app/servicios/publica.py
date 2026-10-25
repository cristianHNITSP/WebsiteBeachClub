"""API pública v1: lo que una website puede hacer (PLAN-BACKEND §4.3). Sin FastAPI.

Siempre con el `Alcance` del sitio (las propiedades que vende) y RLS. Reutiliza
las reglas de las reservas del panel: misma exclusión, mismo cálculo de montos,
mismo historial, auditoría y outbox. Lo único distinto: nace `retenida` y vence
a los 15 min si no se paga.

Mientras no se elija proveedor de pagos (PENDIENTE 1), no hay enlace de pago:
la retención se crea, aparta las noches y vence sola.
"""

import hashlib
import hmac
import secrets
from datetime import date, timedelta
from uuid import UUID

from sqlalchemy import and_, exists, select
from sqlalchemy.dialects.postgresql import Range
from sqlalchemy.ext.asyncio import AsyncSession

from app import imagenes
from app.auth.alcance import Alcance
from app.auth.sitio import SitioQueLlama
from app.errores import Conflicto, NoEncontrado, ReglaDeNegocio
from app.esquemas.reservas import ReservaNueva
from app.modelos import Foto, Habitacion, Propiedad, Reserva
from app.modelos.reservas import ACTIVOS
from app.repositorios import reservas as repo
from app.servicios import reservas
from app.servicios.auth import ahora
from app.servicios.reservas import anticipo_de, hoy
from app.servicios.tarifas import total_de

RETENCION = timedelta(minutes=15)


def _hash(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


async def _propiedades(sesion: AsyncSession, alcance: Alcance) -> dict[UUID, Propiedad]:
    filas = await sesion.scalars(select(Propiedad).where(alcance.filtro(Propiedad.id)))
    return {p.id: p for p in filas}


async def _fotos(sesion: AsyncSession, habitaciones: list[UUID], base: str) -> dict[UUID, list[dict]]:
    """Todas las fotos de esas habitaciones en UNA consulta, con URL absoluta (el
    sitio vive en otro dominio)."""
    filas = await sesion.scalars(
        select(Foto).where(Foto.habitacion_id.in_(habitaciones)).order_by(Foto.orden, Foto.creada, Foto.id)
    )
    por_habitacion: dict[UUID, list[dict]] = {h: [] for h in habitaciones}
    for f in filas:
        por_habitacion[f.habitacion_id].append(
            {
                "ancho": f.ancho,
                "alto": f.alto,
                "urls": {
                    str(a): base + imagenes.url(f.propiedad_id, f.habitacion_id, f.id, a).lstrip("/")
                    for a in imagenes.ANCHOS
                },
            }
        )
    return por_habitacion


def _habitacion(h: Habitacion, propiedades: dict, fotos: dict) -> dict:
    p = propiedades[h.propiedad_id]
    return {
        "id": h.id,
        "propiedad": {"id": p.id, "nombre": p.nombre, "lugar": p.lugar},
        "nombre": h.nombre,
        "tipo": h.tipo,
        "capacidad": h.capacidad,
        "cama": h.cama,
        "tamano_m2": h.tamano_m2,
        "amenidades": h.amenidades,
        "descripcion": h.descripcion,
        "tarifa_base_centavos": h.tarifa_centavos,
        "fotos": fotos.get(h.id, []),
    }


async def catalogo(sesion: AsyncSession, alcance: Alcance, base: str) -> list[dict]:
    """Las que se pueden reservar (activas); en mantenimiento no se ofrecen."""
    hs = list(
        await sesion.scalars(
            select(Habitacion)
            .where(alcance.filtro(Habitacion.propiedad_id), Habitacion.estado == "activa")
            .order_by(Habitacion.nombre, Habitacion.id)
        )
    )
    propiedades = await _propiedades(sesion, alcance)
    fotos = await _fotos(sesion, [h.id for h in hs], base)
    return [_habitacion(h, propiedades, fotos) for h in hs]


def _no_pasada(llegada: date) -> None:
    if llegada < hoy():
        raise ReglaDeNegocio("La llegada no puede ser en el pasado", codigo="fecha_pasada")


async def disponibilidad(
    sesion: AsyncSession, alcance: Alcance, base: str, llegada: date, salida: date, huespedes: int
) -> list[dict]:
    """Las libres esas noches para ese número de personas, con su precio total y
    lo que se paga hoy y en el hotel (el sitio nunca calcula montos)."""
    _no_pasada(llegada)
    ocupada = exists().where(
        Reserva.habitacion_id == Habitacion.id,
        Reserva.estado.in_(ACTIVOS),
        Reserva.estancia.overlaps(Range(llegada, salida)),
    )
    hs = list(
        await sesion.scalars(
            select(Habitacion)
            .where(
                alcance.filtro(Habitacion.propiedad_id),
                and_(Habitacion.estado == "activa", Habitacion.capacidad >= huespedes),
                ~ocupada,
            )
            .order_by(Habitacion.tarifa_centavos, Habitacion.nombre, Habitacion.id)
        )
    )
    propiedades = await _propiedades(sesion, alcance)
    fotos = await _fotos(sesion, [h.id for h in hs], base)
    ajustes = {a.propiedad_id: a for a in await repo.ajustes_cobro(sesion, alcance)}
    noches = (salida - llegada).days
    salida_lista = []
    for h in hs:
        # ponytail: una consulta de tarifas por habitación (decenas, no miles; y
        # Nginx cachea la respuesta 5 s). Juntarlas si el catálogo crece mucho.
        total = await total_de(sesion, h, llegada, salida)
        a = ajustes[h.propiedad_id]
        hoy_ = anticipo_de(total, a.modalidad, a.porcentaje_anticipo)
        salida_lista.append(
            {
                **_habitacion(h, propiedades, fotos),
                "noches": noches,
                "total_centavos": total,
                "modalidad": a.modalidad,
                "porcentaje_anticipo": a.porcentaje_anticipo,
                "pagar_hoy_centavos": hoy_,
                "pagar_en_hotel_centavos": total - hoy_,
            }
        )
    return salida_lista


def a_salida(r: Reserva, token: str | None = None) -> dict:
    return {
        "codigo": r.codigo,
        "estado": r.estado,
        "vence_en": r.vence_en if r.estado == "retenida" else None,
        "habitacion": {"id": r.habitacion_id, "nombre": r.habitacion.nombre},
        "llegada": r.llegada,
        "salida": r.salida,
        "noches": r.noches,
        "adultos": r.adultos,
        "ninos": r.ninos,
        "huesped_nombre": r.huesped_nombre,
        "total_centavos": r.total_centavos,
        "modalidad": r.modalidad,
        "pagar_hoy_centavos": r.anticipo_centavos,
        "pagar_en_hotel_centavos": r.saldo_centavos,
        "pagado_centavos": r.pagado_centavos,
        "enlace_pago": None,  # llega con el proveedor de pagos (PENDIENTE 1)
        "token": token,  # solo al crearla: con él el huésped la consulta o cancela
    }


async def retener(sesion: AsyncSession, sitio: SitioQueLlama, datos) -> tuple[Reserva, str]:
    token = secrets.token_urlsafe(32)
    r = await reservas.crear(
        sesion,
        None,
        sitio.alcance,
        ReservaNueva(**datos.model_dump()),
        estado="retenida",
        extra={"sitio_id": sitio.id, "vence_en": ahora() + RETENCION, "token_hash": _hash(token)},
    )
    return r, token


async def _del_huesped(sesion, sitio: SitioQueLlama, codigo: str, token: str, *, bloquear=False) -> Reserva:
    """La reserva solo con su código Y su token, y solo del sitio que la creó.
    Cualquier fallo es el mismo 404: no se confirma que el código exista."""
    r = await repo.por_codigo(sesion, sitio.alcance, codigo.upper(), sitio_id=sitio.id, bloquear=bloquear)
    if r is None or not hmac.compare_digest(r.token_hash or "", _hash(token)):
        raise NoEncontrado("No encontramos esa reserva")
    return r


async def consultar(sesion: AsyncSession, sitio: SitioQueLlama, codigo: str, token: str) -> Reserva:
    return await _del_huesped(sesion, sitio, codigo, token)


async def cancelar(sesion: AsyncSession, sitio: SitioQueLlama, codigo: str, token: str) -> Reserva:
    """Solo libera una retención (sin pago no hay dinero que devolver). Una
    confirmada se cancela con el hotel hasta que exista la política de
    cancelación (cuánto se devuelve y hasta cuándo, PLAN-BACKEND §5.4)."""
    r = await _del_huesped(sesion, sitio, codigo, token, bloquear=True)
    if r.estado in ("confirmada", "en_curso"):
        raise Conflicto(
            "Para cancelar una reserva confirmada comunícate con el hotel", codigo="cancelar_con_el_hotel"
        )
    return await reservas._cambiar_estado(
        sesion,
        None,
        sitio.alcance,
        r.id,
        None,
        "cancelada",
        aviso="reserva.cancelada",
        tipo="cancelar",
        motivo="Cancelada por el huésped desde el sitio web",
    )
