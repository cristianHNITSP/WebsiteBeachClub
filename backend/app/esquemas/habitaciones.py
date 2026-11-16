"""Contrato de habitaciones con el panel (forma pensada desde `frontend/src/data/admin.js`)."""

from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import Field, field_validator, model_validator

from app.esquemas.base import Entrada, Salida
from app.esquemas.texto import Texto

Estado = Literal["activa", "mantenimiento", "inactiva"]
Situacion = Literal["vigente", "en_papelera", "eliminado_definitivo"]
Cama = Literal["king", "queen", "matrimonial", "individuales"]
Amenidad = Literal[
    "A/C",
    "Alberca",
    "Vista al mar",
    "Cocina",
    "Jacuzzi",
    "Balcón",
    "Wi-Fi",
    "Caja fuerte",
    "Smart TV",
    "Estacionamiento",
    "Minibar",
    "Gym",
]
TARIFA_MAXIMA = 10_000_000  # 100 mil pesos la noche: más es un dedo de más


class _Campos(Entrada):
    nombre: Texto = Field(min_length=2, max_length=120)
    tipo: Texto = Field(min_length=2, max_length=40)
    capacidad: int = Field(ge=1, le=20)
    cama: Cama | None = None
    tamano_m2: int | None = Field(default=None, ge=5, le=2000)
    amenidades: list[Amenidad] = Field(default_factory=list, max_length=12)
    descripcion: Texto = Field(default="", max_length=2000)
    tarifa_centavos: int = Field(gt=0, le=TARIFA_MAXIMA)
    # Personas que cubre la tarifa y extra por noche de quien va de más. Sin `adultos_incluidos`,
    # la tarifa cubre la capacidad completa (nadie paga extra).
    adultos_incluidos: int | None = Field(default=None, ge=1, le=20)
    menores_incluidos: int = Field(default=0, ge=0, le=20)
    extra_adulto_centavos: int = Field(default=0, ge=0, le=TARIFA_MAXIMA)
    extra_menor_centavos: int = Field(default=0, ge=0, le=TARIFA_MAXIMA)
    estado: Estado = "activa"
    venta_en_linea: bool = False  # True: se vende en plataformas y en la web; False: solo recepción

    @field_validator("amenidades")
    @classmethod
    def _sin_repetir(cls, v: list[str]) -> list[str]:
        return list(dict.fromkeys(v))

    @model_validator(mode="after")
    def _incluidos(self):
        if self.adultos_incluidos is None:
            self.adultos_incluidos = self.capacidad  # sin dato: la tarifa cubre a todos
        if self.adultos_incluidos > self.capacidad:
            raise ValueError("Los adultos incluidos no pueden ser más que la capacidad")
        return self


class HabitacionNueva(_Campos):
    propiedad_id: UUID


class HabitacionCambios(_Campos):
    """Edición completa. `version` es la que vio el panel: si otro la cambió
    después, 409 y el panel muestra lo nuevo (PLAN-BACKEND §6.3)."""

    version: int = Field(ge=1)


class HabitacionSalida(Salida):
    id: UUID
    propiedad_id: UUID
    nombre: str
    tipo: str
    capacidad: int
    cama: Cama | None
    tamano_m2: int | None
    amenidades: list[str]
    descripcion: str
    tarifa_centavos: int
    estado: Estado
    venta_en_linea: bool
    adultos_incluidos: int
    menores_incluidos: int
    extra_adulto_centavos: int
    extra_menor_centavos: int
    version: int
    # vigente | en_papelera | eliminado_definitivo. El panel lo usa para decir,
    # donde se nombre la habitación, si está en la papelera o se eliminó.
    situacion: Situacion
    eliminado_en: datetime | None
    foto: str | None = None  # fase 3c (PLAN-BACKEND §18): hasta entonces, sin foto


class EnPapelera(Salida):
    id: UUID
    tipo: Literal["habitacion"]
    nombre: str
    propiedad_id: UUID
    eliminado_en: datetime
    motivo: str | None
