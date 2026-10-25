"""Contrato de la gestión de sitios web en el panel (PLAN-BACKEND §4.2)."""

import re
from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import Field, field_validator

from app.esquemas.base import Entrada, Salida
from app.esquemas.texto import Texto

# Origen exacto, como lo manda el navegador: esquema + dominio (+ puerto), sin ruta
# ni barra final. http solo para probar en el propio equipo.
_ORIGEN = re.compile(r"^(https://[a-z0-9.-]+\.[a-z]{2,}|http://(localhost|127\.0\.0\.1))(:\d{2,5})?$")


class SitioEntrada(Entrada):
    """Alta y edición: los mismos campos."""

    nombre: Texto = Field(min_length=2, max_length=80)
    origenes: list[str] = Field(default_factory=list, max_length=10)
    webhook_url: str | None = Field(default=None, max_length=500)
    propiedades: list[UUID] = Field(min_length=1, max_length=10)

    @field_validator("origenes")
    @classmethod
    def _origenes(cls, v: list[str]) -> list[str]:
        v = [o.strip().lower() for o in v]
        malos = [o for o in v if not _ORIGEN.fullmatch(o)]
        if malos:
            raise ValueError(f"Origen no válido (solo https://dominio, sin ruta ni barra final): {malos[0]}")
        return sorted(set(v))

    @field_validator("webhook_url")
    @classmethod
    def _webhook(cls, v: str | None) -> str | None:
        if not v:
            return None
        if not v.startswith("https://") or any(c.isspace() for c in v):
            raise ValueError("La URL de webhooks debe empezar con https://")
        return v

    @field_validator("propiedades")
    @classmethod
    def _sin_repetir(cls, v: list[UUID]) -> list[UUID]:
        return sorted(set(v))


class SitioSalida(Salida):
    id: UUID
    nombre: str
    clave_publica: str
    clave_secreta_pista: str
    origenes: list[str]
    webhook_url: str | None
    propiedades: list[UUID]
    revocado_en: datetime | None
    creado: datetime


class SitioConSecretos(SitioSalida):
    """Al crear o rotar: lo único que se muestra UNA vez."""

    clave_secreta: str | None = None
    secreto_webhooks: str | None = None


class EntregaSalida(Salida):
    id: UUID
    evento_id: UUID
    tipo: str
    estado: Literal["pendiente", "entregada", "fallida"]
    intentos: int
    proximo_intento: datetime
    ultimo_http: int | None
    ultimo_error: str | None
    entregada_en: datetime | None
    creada: datetime
