"""Consultas de fotos, siempre con `Alcance` (PLAN-BACKEND §11.1)."""

from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.dialects.postgresql import distinct_on
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.alcance import Alcance
from app.modelos import Foto
from app.modelos.base import INCLUIR_ELIMINADOS


async def de_habitacion(sesion: AsyncSession, alcance: Alcance, habitacion_id: UUID) -> list[Foto]:
    consulta = (
        select(Foto)
        .where(Foto.habitacion_id == habitacion_id, alcance.filtro(Foto.propiedad_id))
        .order_by(Foto.orden, Foto.creada, Foto.id)
    )
    return list((await sesion.execute(consulta)).scalars())


async def por_id(
    sesion: AsyncSession, alcance: Alcance, habitacion_id: UUID, foto_id: UUID, *, incluir_eliminadas=False
) -> Foto | None:
    consulta = select(Foto).where(
        Foto.id == foto_id, Foto.habitacion_id == habitacion_id, alcance.filtro(Foto.propiedad_id)
    )
    if incluir_eliminadas:
        consulta = consulta.execution_options(**{INCLUIR_ELIMINADOS: True})
    return (await sesion.execute(consulta)).scalar_one_or_none()


async def portadas(sesion: AsyncSession, habitaciones: list[UUID]) -> dict[UUID, Foto]:
    """La portada (menor `orden`) de cada habitación, en UNA consulta (cero N+1)."""
    if not habitaciones:
        return {}
    consulta = (
        select(Foto)
        .where(Foto.habitacion_id.in_(habitaciones))
        .ext(distinct_on(Foto.habitacion_id))  # DISTINCT ON: una por habitación
        .order_by(Foto.habitacion_id, Foto.orden, Foto.creada, Foto.id)
    )
    return {f.habitacion_id: f for f in (await sesion.execute(consulta)).scalars()}


async def siguiente_orden(sesion: AsyncSession, habitacion_id: UUID) -> tuple[int, int]:
    """(cuántas vigentes hay, el siguiente `orden`)."""
    fila = (
        await sesion.execute(
            select(func.count(), func.coalesce(func.max(Foto.orden) + 1, 0)).where(
                Foto.habitacion_id == habitacion_id
            )
        )
    ).one()
    return fila[0], fila[1]


def lapidas_con_archivos(sesion, limite: int = 200) -> list[Foto]:
    """Para la tarea que borra archivos de fotos eliminadas definitivamente."""
    consulta = (
        select(Foto)
        .where(Foto.purgado_en.is_not(None), Foto.archivos_borrados.is_(False))
        .limit(limite)
        .execution_options(**{INCLUIR_ELIMINADOS: True})
    )
    return list(sesion.execute(consulta).scalars())
