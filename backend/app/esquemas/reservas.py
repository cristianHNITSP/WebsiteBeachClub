"""Contrato de reservas, pagos y cobro con el panel (PLAN-BACKEND §5).
Los montos NUNCA vienen del cliente: los calcula el servidor (§17.1)."""

from datetime import date, datetime
from typing import Literal, Self
from uuid import UUID

from pydantic import EmailStr, Field, model_validator

from app.esquemas.base import Entrada, Salida
from app.esquemas.texto import Texto

MAX_NOCHES = 60
Estado = Literal["retenida", "confirmada", "en_curso", "completada", "expirada", "cancelada"]
Tipo = Literal["reserva", "bloqueo"]
Modalidad = Literal["completo", "anticipo"]
Metodo = Literal["efectivo", "tarjeta", "transferencia"]
Concepto = Literal["anticipo", "total", "saldo", "abono"]
ConceptoSalida = Literal["anticipo", "total", "saldo", "abono", "devolucion"]
Telefono = Field(default=None, pattern=r"^\+?[0-9 ()-]{7,20}$")


class _Fechas(Entrada):
    llegada: date
    salida: date

    @model_validator(mode="after")
    def _noches(self) -> Self:
        if self.salida <= self.llegada:
            raise ValueError("La salida debe ser después de la llegada")
        if (self.salida - self.llegada).days > MAX_NOCHES:
            raise ValueError(f"Máximo {MAX_NOCHES} noches por reserva")
        return self


class PagoInicial(Entrada):
    """Lo que se cobra al capturar la reserva. Sin monto: lo que pide la modalidad
    (anticipo o total). Con monto: un abono libre (una noche, varias o lo que el
    huésped quiera dejar), hasta el total; el resto se cobra después."""

    metodo: Metodo
    referencia: Texto | None = Field(default=None, max_length=100)
    monto_centavos: int | None = Field(default=None, gt=0)


class ReservaNueva(_Fechas):
    tipo: Tipo = "reserva"
    habitacion_id: UUID
    adultos: int = Field(default=1, ge=0, le=20)
    ninos: int = Field(default=0, ge=0, le=20)
    huesped_nombre: Texto | None = Field(default=None, min_length=2, max_length=120)
    huesped_correo: EmailStr | None = None
    huesped_telefono: str | None = Telefono
    notas: Texto = Field(default="", max_length=1000)  # en un bloqueo: el motivo
    pago_inicial: PagoInicial | None = None

    @model_validator(mode="after")
    def _segun_tipo(self) -> Self:
        if self.tipo == "reserva":
            if not self.huesped_nombre:
                raise ValueError("Falta el nombre del huésped")
            if self.adultos < 1:
                raise ValueError("Al menos un adulto")
        elif self.pago_inicial or self.huesped_nombre:
            raise ValueError("Un bloqueo no lleva huésped ni pagos")
        return self


class Mover(_Fechas):
    """Mover, estirar o cambiar de habitación. `version` = la que vio el panel."""

    habitacion_id: UUID
    version: int = Field(ge=1)


class Accion(Entrada):
    version: int = Field(ge=1)
    motivo: Texto | None = Field(default=None, max_length=300)


class PagoNuevo(Entrada):
    concepto: Concepto
    metodo: Metodo
    monto_centavos: int = Field(gt=0, le=1_000_000_000)
    referencia: Texto | None = Field(default=None, max_length=100)


class Devolucion(Entrada):
    """Dinero que se le regresa al huésped (efectivo, a su tarjeta, por transferencia)."""

    metodo: Metodo
    monto_centavos: int = Field(gt=0, le=1_000_000_000)
    motivo: Texto = Field(min_length=3, max_length=300)
    referencia: Texto | None = Field(default=None, max_length=100)


class Cotizacion(Salida):
    habitacion_id: UUID
    noches: int
    tarifa_noche_centavos: int
    total_centavos: int
    modalidad: Modalidad
    porcentaje_anticipo: int | None
    anticipo_centavos: int  # lo que se cobra al reservar
    saldo_centavos: int  # lo que queda para el hotel
    disponible: bool
    choque: str | None  # «la reserva de Ana Pech (12 abr → 15 abr)»
    precios_noche_centavos: list[int]  # la parte de cada noche (suman el total): para cobrar "N noches"


class ReservaSalida(Salida):
    id: UUID
    codigo: str
    propiedad_id: UUID
    habitacion_id: UUID
    habitacion_nombre: str
    habitacion_situacion: str  # vigente | en_papelera | eliminado_definitivo (PLAN-BACKEND §19)
    tipo: Tipo
    estado: Estado
    llegada: date
    salida: date
    noches: int
    adultos: int
    ninos: int
    huesped_nombre: str | None
    huesped_correo: str | None
    huesped_telefono: str | None
    notas: str
    modalidad: Modalidad | None
    porcentaje_anticipo: int | None
    tarifa_noche_centavos: int
    total_centavos: int
    anticipo_centavos: int
    saldo_centavos: int
    pagado_centavos: int
    por_cobrar_centavos: int
    motivo_cancelacion: str | None
    sitio_id: UUID | None  # vino de un sitio web (API pública)
    vence_en: datetime | None  # una retenida vence a esta hora si no se paga
    version: int
    creada: datetime


class PagoSalida(Salida):
    id: UUID
    concepto: ConceptoSalida
    metodo: Metodo
    estado: str
    monto_centavos: int
    referencia: str | None
    motivo: str | None = None
    registrado_por: UUID | None
    creado: datetime


class EventoSalida(Salida):
    momento: datetime
    usuario_id: UUID | None
    tipo: str
    de_estado: str | None
    a_estado: str | None
    detalle: dict | None


class NocheSalida(Salida):
    """Una noche de la estancia y cuánto de ella ya está pagado."""

    fecha: date
    monto_centavos: int  # su parte del total pactado (según el precio de esa noche)
    pagado_centavos: int
    estado: Literal["pagada", "parcial", "pendiente"]


class ReservaDetalle(ReservaSalida):
    pagos: list[PagoSalida]
    desglose: list[NocheSalida]  # vacío en un bloqueo


class AjusteCobroSalida(Salida):
    propiedad_id: UUID
    modalidad: Modalidad
    porcentaje_anticipo: int | None
    actualizado: datetime


class AjusteCobroCambio(Entrada):
    modalidad: Modalidad
    porcentaje_anticipo: int | None = Field(default=None, ge=1, le=99)

    @model_validator(mode="after")
    def _porcentaje(self) -> Self:
        if (self.modalidad == "anticipo") != (self.porcentaje_anticipo is not None):
            raise ValueError("El porcentaje va solo (y siempre) con la modalidad anticipo")
        return self
