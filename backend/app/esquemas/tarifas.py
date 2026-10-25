"""Contrato de las tarifas de temporada."""

from datetime import date
from typing import Self
from uuid import UUID

from pydantic import Field, model_validator

from app.esquemas.base import Entrada, Salida
from app.esquemas.habitaciones import TARIFA_MAXIMA
from app.esquemas.texto import Texto


class TarifaEntrada(Entrada):
    nombre: Texto = Field(min_length=2, max_length=80)
    desde: date  # primera noche con esta tarifa
    hasta: date  # primera noche que YA NO la tiene
    tarifa_centavos: int = Field(gt=0, le=TARIFA_MAXIMA)

    @model_validator(mode="after")
    def _periodo(self) -> Self:
        if self.hasta <= self.desde:
            raise ValueError("El fin debe ser después del inicio")
        if (self.hasta - self.desde).days > 366:
            raise ValueError("Una temporada dura un año como máximo")
        return self


class TarifaSalida(Salida):
    id: UUID
    habitacion_id: UUID
    nombre: str
    desde: date
    hasta: date
    tarifa_centavos: int
