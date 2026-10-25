"""La papelera de cualquier modelo con `ConBorradoLogico` (PLAN-BACKEND §19.3)."""

from datetime import datetime
from uuid import UUID

from sqlalchemy import ColumnElement, select, tuple_
from sqlalchemy.ext.asyncio import AsyncSession

from app.modelos.base import INCLUIR_ELIMINADOS


async def en_papelera(
    sesion: AsyncSession,
    modelo,
    filtro: ColumnElement[bool],
    *,
    despues_de: tuple[datetime, UUID] | None,
    limite: int,
) -> list:
    """Lo enviado a la papelera y aún no eliminado definitivamente, lo más reciente
    primero, por cursor (eliminado_en, id). `filtro` es el alcance del recurso."""
    consulta = (
        select(modelo)
        .where(modelo.eliminado_en.is_not(None), modelo.purgado_en.is_(None), filtro)
        .order_by(modelo.eliminado_en.desc(), modelo.id.desc())
        .limit(limite)
        .execution_options(**{INCLUIR_ELIMINADOS: True})
    )
    if despues_de:
        consulta = consulta.where(tuple_(modelo.eliminado_en, modelo.id) < tuple_(*despues_de))
    return list((await sesion.execute(consulta)).scalars())
