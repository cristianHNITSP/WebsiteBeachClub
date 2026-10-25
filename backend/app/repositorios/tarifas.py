"""Consultas de tarifas de temporada (con `Alcance`, PLAN-BACKEND §11.1)."""

from datetime import date
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.dialects.postgresql import Range
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.alcance import Alcance
from app.modelos import Tarifa
from app.modelos.base import INCLUIR_ELIMINADOS


async def de_habitacion(sesion: AsyncSession, alcance: Alcance, habitacion_id: UUID) -> list[Tarifa]:
    consulta = (
        select(Tarifa)
        .where(Tarifa.habitacion_id == habitacion_id, alcance.filtro(Tarifa.propiedad_id))
        .order_by(func.lower(Tarifa.periodo))
    )
    return list((await sesion.execute(consulta)).scalars())


async def que_tocan(sesion: AsyncSession, habitacion_id: UUID, llegada: date, salida: date) -> list[Tarifa]:
    """Las temporadas vigentes que cubren alguna noche de [llegada, salida)."""
    consulta = select(Tarifa).where(
        Tarifa.habitacion_id == habitacion_id, Tarifa.periodo.overlaps(Range(llegada, salida))
    )
    return list((await sesion.execute(consulta)).scalars())


async def por_id(sesion, alcance: Alcance, habitacion_id: UUID, tarifa_id: UUID) -> Tarifa | None:
    consulta = (
        select(Tarifa)
        .where(
            Tarifa.id == tarifa_id, Tarifa.habitacion_id == habitacion_id, alcance.filtro(Tarifa.propiedad_id)
        )
        .execution_options(**{INCLUIR_ELIMINADOS: True})
    )
    return (await sesion.execute(consulta)).scalar_one_or_none()
