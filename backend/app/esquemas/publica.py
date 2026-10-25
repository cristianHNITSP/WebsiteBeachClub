"""Contrato de la API pública v1 (PLAN-BACKEND §4.3). Cambiar algo que rompa a
un sitio = `/api/v2`, nunca editar esto en sitio."""

from datetime import date, datetime
from typing import Literal
from uuid import UUID

from pydantic import EmailStr, Field

from app.esquemas.base import Salida
from app.esquemas.reservas import Telefono, _Fechas
from app.esquemas.texto import Texto


class ReservaWeb(_Fechas):
    """Lo que manda el sitio para retener. Los montos NO: los calcula el servidor."""

    habitacion_id: UUID
    adultos: int = Field(default=1, ge=1, le=20)
    ninos: int = Field(default=0, ge=0, le=20)
    huesped_nombre: Texto = Field(min_length=2, max_length=120)
    huesped_correo: EmailStr
    huesped_telefono: str | None = Telefono
    notas: Texto = Field(default="", max_length=500)


class PropiedadPublica(Salida):
    id: UUID
    nombre: str
    lugar: str


class FotoPublica(Salida):
    ancho: int
    alto: int
    urls: dict[str, str]  # ancho → URL absoluta (480, 1080, 1920)


class HabitacionPublica(Salida):
    id: UUID
    propiedad: PropiedadPublica
    nombre: str
    tipo: str
    capacidad: int
    cama: str | None
    tamano_m2: int | None
    amenidades: list[str]
    descripcion: str
    tarifa_base_centavos: int
    fotos: list[FotoPublica]


class HabitacionDisponible(HabitacionPublica):
    noches: int
    total_centavos: int
    modalidad: Literal["completo", "anticipo"]
    porcentaje_anticipo: int | None
    pagar_hoy_centavos: int
    pagar_en_hotel_centavos: int


class HabitacionDeReserva(Salida):
    id: UUID
    nombre: str


class ReservaPublica(Salida):
    codigo: str
    estado: Literal["retenida", "confirmada", "en_curso", "completada", "expirada", "cancelada"]
    vence_en: datetime | None
    habitacion: HabitacionDeReserva
    llegada: date
    salida: date
    noches: int
    adultos: int
    ninos: int
    huesped_nombre: str | None
    total_centavos: int
    modalidad: str | None
    pagar_hoy_centavos: int
    pagar_en_hotel_centavos: int
    pagado_centavos: int
    enlace_pago: str | None
    token: str | None = None
