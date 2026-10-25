"""Qué propiedades puede ver esta petición (PLAN-BACKEND §11.1).

Dos barreras:
1. El servicio: todo repositorio de datos con propiedad recibe un `Alcance`
   OBLIGATORIO y filtra con él.
2. Postgres (Row-Level Security, migración 0003): la transacción lleva
   `app.propiedades` y una política solo deja ver y escribir esas filas. Si un
   día se olvida un filtro en el código, la base sigue sin entregar nada ajeno.
"""

from dataclasses import dataclass
from typing import Annotated
from uuid import UUID

from fastapi import Depends, Query
from sqlalchemy import ColumnElement, func, select, true
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Session

from app.auth.dependencias import ActorActual
from app.db import Sesion
from app.errores import NoEncontrado

TODAS = "*"


@dataclass(frozen=True, slots=True)
class Alcance:
    propiedades: frozenset[UUID] | None  # None = todas (permiso `propiedades.todas`)

    def permite(self, propiedad_id: UUID) -> bool:
        return self.propiedades is None or propiedad_id in self.propiedades

    def filtro(self, columna) -> ColumnElement[bool]:
        return true() if self.propiedades is None else columna.in_(self.propiedades)

    def valor_rls(self) -> str:
        return TODAS if self.propiedades is None else ",".join(sorted(map(str, self.propiedades)))


def _fijar(alcance: Alcance):
    # set_config(..., true) = SET LOCAL: dura lo que la transacción y no se
    # cuela a la siguiente petición que use la misma conexión del pool.
    return select(func.set_config("app.propiedades", alcance.valor_rls(), True))


async def fijar_en_base(sesion: AsyncSession, alcance: Alcance) -> None:
    await sesion.execute(_fijar(alcance))


def fijar_en_base_sincrona(sesion: Session, alcance: Alcance) -> None:
    """Para Celery y la CLI (sesión síncrona)."""
    sesion.execute(_fijar(alcance))


async def alcance_actual(
    actor: ActorActual,
    sesion: Sesion,
    propiedad: Annotated[
        UUID | None, Query(description="Solo esta propiedad (el selector del panel)")
    ] = None,
) -> Alcance:
    permitidas = None if actor.todas_las_propiedades else actor.propiedades
    if propiedad is not None:
        if permitidas is not None and propiedad not in permitidas:
            raise NoEncontrado("Esa propiedad no existe")  # 404: no se confirma que exista
        alcance = Alcance(frozenset({propiedad}))
    else:
        alcance = Alcance(permitidas)
    await fijar_en_base(sesion, alcance)
    return alcance


AlcanceActual = Annotated[Alcance, Depends(alcance_actual)]
