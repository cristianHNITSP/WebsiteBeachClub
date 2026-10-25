"""Contrato de las fotos con el panel."""

from datetime import datetime
from uuid import UUID

from pydantic import Field

from app.esquemas.base import Entrada, Salida


class FotoSalida(Salida):
    id: UUID
    orden: int  # 0 = la portada
    ancho: int
    alto: int
    urls: dict[str, str]  # "480" | "1080" | "1920" → /media/fotos/…
    creada: datetime


class Orden(Entrada):
    """Todas las fotos vigentes de la habitación, en el orden nuevo (la primera es la portada)."""

    ids: list[UUID] = Field(min_length=1, max_length=50)
