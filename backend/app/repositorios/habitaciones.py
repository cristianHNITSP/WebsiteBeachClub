"""Consultas de habitaciones. Todas reciben el `Alcance` (obligatorio): nunca se
consulta una habitación sin decir de qué propiedades (PLAN-BACKEND §11.1)."""

from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.alcance import Alcance
from app.modelos import Habitacion
from app.modelos.base import INCLUIR_ELIMINADOS


async def listar(
    sesion: AsyncSession,
    alcance: Alcance,
    *,
    q: str | None,
    estado: str | None,
    pagina: int,
    por_pagina: int,
) -> tuple[list[Habitacion], int]:
    filtros = [alcance.filtro(Habitacion.propiedad_id)]
    if q:
        # autoescape: un «%» o «_» que escriba la persona se busca literal.
        filtros.append(Habitacion.nombre.icontains(q, autoescape=True))
    if estado:
        filtros.append(Habitacion.estado == estado)
    total = (await sesion.execute(select(func.count()).select_from(Habitacion).where(*filtros))).scalar_one()
    consulta = (
        select(Habitacion)
        .where(*filtros)
        .order_by(Habitacion.nombre, Habitacion.id)
        .limit(por_pagina)
        .offset((pagina - 1) * por_pagina)
    )
    return list((await sesion.execute(consulta)).scalars()), total


async def por_id(
    sesion: AsyncSession, alcance: Alcance, habitacion_id: UUID, *, incluir_eliminadas: bool = False
) -> Habitacion | None:
    consulta = select(Habitacion).where(
        Habitacion.id == habitacion_id, alcance.filtro(Habitacion.propiedad_id)
    )
    if incluir_eliminadas:
        consulta = consulta.execution_options(**{INCLUIR_ELIMINADOS: True})
    return (await sesion.execute(consulta)).scalar_one_or_none()
