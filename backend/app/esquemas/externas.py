"""Contrato de otras plataformas y del bot con el panel (PLAN-BACKEND §13)."""

import re
from datetime import date, datetime
from decimal import Decimal
from typing import Literal
from uuid import UUID

from pydantic import Field, field_validator

from app.esquemas.base import Entrada, Salida
from app.esquemas.texto import Texto

Canal = Literal["booking", "airbnb", "expedia", "vrbo", "otro"]
_DOMINIO = re.compile(r"^[a-z0-9-]+(\.[a-z0-9-]+)+$")


class CalendarioNuevo(Entrada):
    habitacion_id: UUID
    canal: Canal
    url: str = Field(max_length=1000, pattern=r"^https://\S+$")


class CalendarioSalida(Salida):
    id: UUID
    propiedad_id: UUID
    habitacion_id: UUID
    canal: Canal
    url: str  # oculta: dominio y final (lleva el token de la plataforma)
    activo: bool
    ultima_lectura: datetime | None
    ultimo_error: str | None
    eventos: int
    creado: datetime


class ExternaSalida(Salida):
    id: UUID
    propiedad_id: UUID
    habitacion_id: UUID | None
    habitacion_nombre: str | None
    canal: Canal
    uid_externo: str
    llegada: date
    salida: date
    titulo: str | None
    estado: Literal["vigente", "cancelada"]
    origen: Literal["ical", "csv"]
    leida_en: datetime
    choca: bool  # cae sobre una reserva propia activa de la misma habitación


class ImportacionSalida(Salida):
    filas: int
    nuevas: int
    cambiadas: int
    canceladas: int
    choques: int


class MencionSalida(Salida):
    id: UUID
    url: str
    dominio: str
    consulta: str
    titulo: str | None
    descripcion: str | None
    estado: str
    detalle: str | None
    precio: str | None
    calificacion: Decimal | None
    resenas: int | None
    encontrada_en: datetime
    leida_en: datetime | None


class BotSalida(Salida):
    tiene_clave: bool
    tope_mensual: int
    consultas_mes: int
    contacto: str | None
    consultas: list[str]
    dominios_bloqueados: list[str]
    ultima_ejecucion: datetime | None
    ultimo_resultado: str | None


class BotCambio(Entrada):
    tope_mensual: int = Field(ge=0, le=10_000)
    contacto: Texto | None = Field(default=None, max_length=120)
    consultas: list[Texto] = Field(min_length=1, max_length=10)
    dominios_bloqueados: list[str] = Field(max_length=100)

    @field_validator("consultas")
    @classmethod
    def _consultas(cls, v: list[str]) -> list[str]:
        v = [c for c in v if c]
        if any(len(c) > 120 for c in v) or not v:
            raise ValueError("De 1 a 10 búsquedas de hasta 120 caracteres")
        return v

    @field_validator("dominios_bloqueados")
    @classmethod
    def _dominios(cls, v: list[str]) -> list[str]:
        v = sorted({d.strip().lower().removeprefix("www.") for d in v if d.strip()})
        malos = [d for d in v if not _DOMINIO.fullmatch(d)]
        if malos:
            raise ValueError(f"Dominio no válido (solo el dominio, sin https:// ni rutas): {malos[0]}")
        return v
