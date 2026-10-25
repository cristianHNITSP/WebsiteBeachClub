"""Bases de todos los esquemas (docs/PLAN-BACKEND.md §17.1).

- Entrada: estricta. Un campo que no está en el contrato es un 422
  (`extra="forbid"`), nunca se ignora en silencio; los textos llegan recortados.
- Salida: se arma desde los modelos de SQLAlchemy (`from_attributes`) y solo
  expone lo que declara: nunca se devuelve un modelo tal cual.
"""

from pydantic import BaseModel, ConfigDict


class Entrada(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)


class Salida(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class Meta(BaseModel):
    total: int
    pagina: int
    por_pagina: int
    paginas: int


class Pagina[T](BaseModel):
    """Forma única de las listas paginadas (BACKEND-ARQUITECTURA §8)."""

    items: list[T]
    meta: Meta


class MetaCursor(BaseModel):
    siguiente: str | None  # None = no hay más


class PaginaCursor[T](BaseModel):
    """Para tablas que solo crecen (papelera, historial): sin COUNT(*) ni OFFSET (PLAN-BACKEND §9)."""

    items: list[T]
    meta: MetaCursor
