"""Avisos del panel (fase 4). Sin FastAPI.

- `desde_evento`: traduce un evento del outbox al aviso que verá el personal
  (o None si ese evento no amerita aviso). Pura: se prueba sin base.
- Consultar y marcar: leído y borrado son de cada persona.
"""

from datetime import date
from uuid import UUID

from sqlalchemy import and_, func, select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencias import Actor
from app.errores import NoEncontrado
from app.modelos import Aviso, AvisoUsuario, Outbox
from app.servicios.auth import ahora

LIMITE = 200  # los más recientes; lo viejo se consulta en la auditoría


def _rango(llegada: str, salida: str) -> str:
    a, b = date.fromisoformat(llegada), date.fromisoformat(salida)
    meses = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"]
    return f"{a.day} {meses[a.month - 1]} → {b.day} {meses[b.month - 1]}"


def _pesos(centavos: int) -> str:
    return f"MXN ${centavos / 100:,.2f}".replace(".00", "")


def desde_evento(e: Outbox) -> dict | None:
    """El aviso (campos de `Aviso`) para un evento del outbox, o None."""
    d = e.datos or {}
    if e.tipo == "externas.nuevas":
        return _externas_nuevas(e, d)
    if e.agregado != "reserva" or d.get("tipo") == "bloqueo":
        return None
    # Una retención de la web no es noticia hasta que se paga (la mayoría vencen
    # solas); tampoco que se cancele o venza sin haberse pagado.
    if d.get("estado") == "retenida" or d.get("de") == "retenida":
        return None
    quien = d.get("huesped_nombre") or "Sin nombre"
    sitio = f"{d.get('habitacion_nombre')}, {_rango(d['llegada'], d['salida'])}" if d.get("llegada") else ""
    detalle = d.get("detalle") or {}
    plantillas = {
        "reserva.creada": ("reserva", "Nueva reserva", f"{quien}, {sitio} ({d.get('noches')} noches)."),
        "reserva.movida": ("reserva", "Reserva modificada", f"{quien} ahora: {sitio}."),
        "reserva.cancelada": ("reserva", "Reserva cancelada", f"{quien}, {sitio}."),
        "reserva.llegada": (
            "operacion",
            "Llegada registrada",
            f"{quien} llegó a {d.get('habitacion_nombre')}.",
        ),
        "reserva.salida": ("operacion", "Salida registrada", f"{quien} dejó {d.get('habitacion_nombre')}."),
        "pago.registrado": (
            "pago",
            "Pago registrado",
            f"{_pesos(detalle.get('monto_centavos', 0))} de {quien}.",
        ),
        "pago.devuelto": (
            "pago",
            "Devolución registrada",
            f"{_pesos(detalle.get('monto_centavos', 0))} a {quien}.",
        ),
    }
    if e.tipo not in plantillas:
        return None
    tipo, titulo, texto = plantillas[e.tipo]
    return {
        "evento_id": e.id,
        "propiedad_id": e.propiedad_id,
        "permiso": "reservas.ver",
        "tipo": tipo,
        "titulo": titulo,
        "texto": texto[:300],
        "destino": f"/admin/calendario?vista=linea&reserva={e.agregado_id}",  # ruta del panel
        "causado_por": UUID(d["por"]) if d.get("por") else None,
    }


CANALES = {
    "booking": "Booking.com",
    "airbnb": "Airbnb",
    "expedia": "Expedia",
    "vrbo": "Vrbo",
    "otro": "otra plataforma",
}


def _externas_nuevas(e: Outbox, d: dict) -> dict:
    n, canal = d.get("nuevas", 0), CANALES.get(d.get("canal"), d.get("canal"))
    donde = f" ({d['habitacion_nombre']})" if d.get("habitacion_nombre") else ""
    fechas = ", ".join(_rango(a, b) for a, b in d.get("rangos", []))
    mas = f" y {n - len(d.get('rangos', []))} más" if n > len(d.get("rangos", [])) else ""
    cuantas = "1 reserva nueva" if n == 1 else f"{n} reservas nuevas"
    return {
        "evento_id": e.id,
        "propiedad_id": e.propiedad_id,
        "permiso": "externas.ver",
        "tipo": "reserva",
        "titulo": "Reservas fuera de la app",
        "texto": f"{cuantas} de {canal}{donde}: {fechas}{mas}."[:300],
        "destino": "/admin/otras-plataformas",
        "causado_por": None,
    }


def guardar_sincrono(sesion, e: Outbox) -> bool:
    """Para el despachador (Celery). Idempotente: si el evento ya tiene aviso, nada."""
    datos = desde_evento(e)
    if datos is None:
        return False
    r = sesion.execute(insert(Aviso).values(**datos).on_conflict_do_nothing(index_elements=["evento_id"]))
    return r.rowcount > 0


def _visibles(actor: Actor, *, incluir_borrados: bool = False):
    marca = AvisoUsuario
    consulta = (
        select(Aviso, marca.leido_en, marca.borrado_en)
        .outerjoin(marca, and_(marca.aviso_id == Aviso.id, marca.usuario_id == actor.id))
        .where(Aviso.permiso.in_(actor.permisos))  # la propiedad la filtra RLS
    )
    if not incluir_borrados:
        consulta = consulta.where(marca.borrado_en.is_(None))
    return consulta


async def listar(sesion: AsyncSession, actor: Actor):
    filas = await sesion.execute(
        _visibles(actor).order_by(Aviso.creado.desc(), Aviso.id.desc()).limit(LIMITE)
    )
    return [(a, leido is not None) for a, leido, _ in filas.all()]


async def sin_leer(sesion: AsyncSession, actor: Actor) -> int:
    sub = _visibles(actor).where(AvisoUsuario.leido_en.is_(None)).limit(LIMITE).subquery()
    return (await sesion.execute(select(func.count()).select_from(sub))).scalar_one()


async def _marcar(sesion: AsyncSession, actor: Actor, aviso_id: UUID, **campos) -> None:
    if (
        await sesion.execute(_visibles(actor, incluir_borrados=True).where(Aviso.id == aviso_id))
    ).first() is None:
        raise NoEncontrado("Ese aviso no existe")
    await sesion.execute(
        insert(AvisoUsuario)
        .values(aviso_id=aviso_id, usuario_id=actor.id, **campos)
        .on_conflict_do_update(index_elements=["aviso_id", "usuario_id"], set_=campos)
    )


async def marcar_leido(sesion, actor, aviso_id: UUID, leido: bool) -> None:
    await _marcar(sesion, actor, aviso_id, leido_en=ahora() if leido else None)


async def borrar(sesion, actor, aviso_id: UUID) -> None:
    await _marcar(sesion, actor, aviso_id, borrado_en=ahora())


async def restaurar(sesion, actor, aviso_id: UUID) -> None:
    await _marcar(sesion, actor, aviso_id, borrado_en=None)


async def leer_todos(sesion: AsyncSession, actor: Actor) -> int:
    pendientes = (
        await sesion.execute(_visibles(actor).where(AvisoUsuario.leido_en.is_(None)).limit(LIMITE))
    ).all()
    momento = ahora()
    for a, _, _ in pendientes:
        await sesion.execute(
            insert(AvisoUsuario)
            .values(aviso_id=a.id, usuario_id=actor.id, leido_en=momento)
            .on_conflict_do_update(index_elements=["aviso_id", "usuario_id"], set_={"leido_en": momento})
        )
    return len(pendientes)
