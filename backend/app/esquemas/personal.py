"""Contrato de la gestión del personal (fase 3e)."""

import re
from datetime import datetime
from uuid import UUID

from pydantic import EmailStr, Field, field_validator

from app.auth.claves import CLAVE_MAXIMO
from app.esquemas.base import Entrada, Salida
from app.esquemas.texto import Texto

USUARIO = r"^[a-z0-9][a-z0-9._-]{2,39}$"


class _Campos(Entrada):
    nombre: Texto = Field(min_length=2, max_length=120)
    correo: EmailStr
    rol: str = Field(min_length=2, max_length=40)
    propiedades: list[UUID] = Field(default_factory=list, max_length=20)

    @field_validator("propiedades")
    @classmethod
    def _sin_repetir(cls, v: list[UUID]) -> list[UUID]:
        return list(dict.fromkeys(v))


class PersonaNueva(_Campos):
    usuario: str = Field(min_length=3, max_length=40)
    # Temporal: la persona la cambia al entrar (`debe_cambiar_clave`).
    clave_temporal: str = Field(min_length=1, max_length=CLAVE_MAXIMO)

    @field_validator("usuario", mode="before")
    @classmethod
    def _usuario(cls, v):
        v = str(v).strip().lower()
        if not re.fullmatch(USUARIO, v):
            raise ValueError("3 a 40: minúsculas, números, punto, guion o guion bajo")
        return v


class PersonaCambios(_Campos):
    pass


class ClaveTemporal(Entrada):
    clave_temporal: str = Field(min_length=1, max_length=CLAVE_MAXIMO)


class PersonaSalida(Salida):
    id: UUID
    usuario: str
    nombre: str
    correo: str
    rol: str
    rol_nombre: str
    activo: bool
    propiedades: list[UUID]
    todas_las_propiedades: bool
    debe_cambiar_clave: bool
    ultimo_acceso: datetime | None
    creado: datetime


class PermisoSalida(Salida):
    clave: str
    descripcion: str


class RolSalida(Salida):
    clave: str
    nombre: str
    permisos: list[PermisoSalida]
