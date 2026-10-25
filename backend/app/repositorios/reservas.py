"""Consultas de reservas. Todas con `Alcance` (PLAN-BACKEND §11.1); además Postgres
filtra por RLS."""

from datetime import date
from uuid import UUID

from sqlalchemy import func, or_, select
from sqlalchemy.dialects.postgresql import Range
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.auth.alcance import Alcance
from app.modelos import AjusteCobro, Pago, Reserva, ReservaEvento
from app.modelos.base import INCLUIR_ELIMINADOS
from app.modelos.reservas import ACTIVOS

# La habitación se carga aunque esté en la papelera o eliminada definitivamente
# (lápida): la reserva tiene que poder decir en qué habitación fue.
_CON_HABITACION = {INCLUIR_ELIMINADOS: True}


def _base(alcance: Alcance):
    return (
        select(Reserva)
        .where(alcance.filtro(Reserva.propiedad_id))
        .options(selectinload(Reserva.habitacion))
        # populate_existing: tras mover de habitación, la relación se vuelve a leer.
        .execution_options(**_CON_HABITACION, populate_existing=True)
    )


async def listar(
    sesion: AsyncSession,
    alcance: Alcance,
    *,
    desde: date,
    hasta: date,
    habitacion_id: UUID | None,
    estados: tuple[str, ...] | None,
    q: str | None,
    limite: int,
) -> list[Reserva]:
    """Las que tocan la ventana [desde, hasta), por llegada."""
    consulta = _base(alcance).where(Reserva.estancia.overlaps(Range(desde, hasta)))
    if habitacion_id:
        consulta = consulta.where(Reserva.habitacion_id == habitacion_id)
    if estados:
        consulta = consulta.where(Reserva.estado.in_(estados))
    if q:
        consulta = consulta.where(
            or_(Reserva.huesped_nombre.icontains(q, autoescape=True), Reserva.codigo == q.upper())
        )
    consulta = consulta.order_by(func.lower(Reserva.estancia), Reserva.id).limit(limite)
    return list((await sesion.execute(consulta)).scalars())


async def por_id(
    sesion: AsyncSession, alcance: Alcance, reserva_id: UUID, *, bloquear: bool = False
) -> Reserva | None:
    consulta = _base(alcance).where(Reserva.id == reserva_id)
    if bloquear:
        # FOR UPDATE: quien cambia una reserva la tiene para sí hasta el COMMIT.
        consulta = consulta.with_for_update(of=Reserva)
    return (await sesion.execute(consulta)).scalar_one_or_none()


async def por_codigo(
    sesion: AsyncSession, alcance: Alcance, codigo: str, *, sitio_id: UUID, bloquear: bool = False
) -> Reserva | None:
    consulta = _base(alcance).where(Reserva.codigo == codigo, Reserva.sitio_id == sitio_id)
    if bloquear:
        consulta = consulta.with_for_update(of=Reserva)
    return (await sesion.execute(consulta)).scalar_one_or_none()


async def choque(
    sesion: AsyncSession, habitacion_id: UUID, llegada: date, salida: date, *, excluir: UUID | None = None
) -> Reserva | None:
    """La reserva activa que ocupa alguna de esas noches (para explicar el choque)."""
    consulta = select(Reserva).where(
        Reserva.habitacion_id == habitacion_id,
        Reserva.estado.in_(ACTIVOS),
        Reserva.estancia.overlaps(Range(llegada, salida)),
    )
    if excluir:
        consulta = consulta.where(Reserva.id != excluir)
    return (await sesion.execute(consulta.limit(1))).scalar_one_or_none()


async def ajuste_cobro(sesion: AsyncSession, propiedad_id: UUID) -> AjusteCobro | None:
    return await sesion.get(AjusteCobro, propiedad_id)


async def ajustes_cobro(sesion: AsyncSession, alcance: Alcance) -> list[AjusteCobro]:
    consulta = select(AjusteCobro).where(alcance.filtro(AjusteCobro.propiedad_id))
    return list((await sesion.execute(consulta)).scalars())


async def pagos(sesion: AsyncSession, reserva_id: UUID) -> list[Pago]:
    consulta = select(Pago).where(Pago.reserva_id == reserva_id).order_by(Pago.creado, Pago.id)
    return list((await sesion.execute(consulta)).scalars())


async def eventos(sesion: AsyncSession, reserva_id: UUID) -> list[ReservaEvento]:
    consulta = select(ReservaEvento).where(ReservaEvento.reserva_id == reserva_id).order_by(ReservaEvento.id)
    return list((await sesion.execute(consulta)).scalars())
