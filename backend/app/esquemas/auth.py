"""Contrato del login del panel."""

from datetime import datetime
from uuid import UUID

from pydantic import Field

from app.auth.claves import CLAVE_MAXIMO
from app.esquemas.base import Entrada, Salida


class EntrarEntrada(Entrada):
    identificador: str = Field(min_length=1, max_length=254, description="Usuario o correo")
    clave: str = Field(min_length=1, max_length=CLAVE_MAXIMO)
    recordar: bool = False


class PropiedadSalida(Salida):
    id: UUID
    clave: str
    nombre: str
    lugar: str


class SesionSalida(Salida):
    """Lo que el panel necesita al cargar (`GET /api/auth/yo`) y al entrar."""

    id: UUID
    usuario: str
    nombre: str
    correo: str
    rol: str
    permisos: list[str]
    propiedades: list[PropiedadSalida]  # a las que tiene acceso (todas, si tiene `propiedades.todas`)
    todas_las_propiedades: bool
    vence: datetime  # fin de la sesión: 12 h desde que se inició
    debe_cambiar_clave: bool = False  # contraseña temporal puesta por un gerente


class SesionAbiertaSalida(Salida):
    id: UUID
    ip: str | None
    agente: str | None
    creada: datetime
    usada: datetime
    vence: datetime
    actual: bool


class CambiarClaveEntrada(Entrada):
    actual: str = Field(min_length=1, max_length=CLAVE_MAXIMO)
    nueva: str = Field(min_length=1, max_length=CLAVE_MAXIMO)
