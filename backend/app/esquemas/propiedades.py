"""Alta y edición de propiedades (sucursales). Solo el dueño (`propiedades.gestionar`)."""

from pydantic import Field

from app.esquemas.base import Entrada
from app.esquemas.texto import Texto


class PropiedadEntrada(Entrada):
    nombre: Texto = Field(min_length=2, max_length=120)
    lugar: Texto = Field(min_length=2, max_length=120)  # «Chelem, Yucatán»
