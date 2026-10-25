"""Contrato de la auditoría con el panel y con quien haga un peritaje."""

from datetime import datetime
from uuid import UUID

from app.esquemas.base import Salida


class AuditoriaSalida(Salida):
    secuencia: int
    momento: datetime
    usuario_id: UUID | None
    accion: str
    entidad: str
    entidad_id: str | None
    antes: dict | None
    despues: dict | None
    ip: str | None
    agente: str | None
    sesion_id: UUID | None
    solicitud_id: UUID | None
    hash_anterior: str
    hash: str


class VerificacionSalida(Salida):
    integra: bool
    desde: int
    revisadas: int
    primera_rota: int | None  # secuencia del primer eslabón que no cuadra
    ultimo_hash: str  # el último hash bueno: compáralo con un sello guardado fuera
