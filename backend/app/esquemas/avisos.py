"""Contrato de los avisos del panel."""

from datetime import datetime
from uuid import UUID

from app.esquemas.base import Entrada, Salida


class AvisoSalida(Salida):
    id: UUID
    tipo: str
    titulo: str
    texto: str
    destino: str
    creado: datetime
    leido: bool
    propio: bool  # lo causó quien mira (el panel no le hace sonar su propio aviso)


class Leido(Entrada):
    leido: bool = True


class Resumen(Salida):
    sin_leer: int
