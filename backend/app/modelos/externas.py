"""Reservas de otras plataformas y lo que el bot encuentra en la web
(PLAN-BACKEND §13). Solo CONSULTA: nada de esto toca `reservas` ni la
disponibilidad propia."""

from datetime import date, datetime
from decimal import Decimal
from uuid import UUID

from sqlalchemy import (
    CheckConstraint,
    ForeignKey,
    ForeignKeyConstraint,
    Index,
    Numeric,
    SmallInteger,
    String,
    UniqueConstraint,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import ARRAY, DATERANGE, Range
from sqlalchemy.orm import Mapped, mapped_column

from app.modelos.base import Base

CANALES = ("booking", "airbnb", "expedia", "vrbo", "otro")
# Sus términos prohíben leerlas con un programa (y no traen reservas: eso va por iCal).
BLOQUEADOS_DE_INICIO = [
    "booking.com",
    "airbnb.com",
    "airbnb.mx",
    "expedia.com",
    "expedia.mx",
    "hotels.com",
    "hoteles.com",
    "vrbo.com",
    "kayak.com",
    "kayak.com.mx",
    "facebook.com",
    "instagram.com",
    "tripadvisor.com",
    "tripadvisor.com.mx",
]
CONSULTAS_DE_INICIO = ["Casa Frida Chuburná", "Cabañas Frida Chelem", "Hoteles Frida"]


class CalendarioExterno(Base):
    """El iCal que exporta otra plataforma para UNA habitación. La URL lleva el
    token de esa plataforma: no se muestra completa ni entra a la auditoría."""

    __tablename__ = "calendarios_externos"
    id: Mapped[UUID] = mapped_column(primary_key=True, server_default=text("uuidv7()"))
    propiedad_id: Mapped[UUID]
    habitacion_id: Mapped[UUID]
    canal: Mapped[str] = mapped_column(String(10))
    url: Mapped[str] = mapped_column(String(1000))
    activo: Mapped[bool] = mapped_column(server_default=text("true"))
    ultima_lectura: Mapped[datetime | None]
    ultimo_error: Mapped[str | None] = mapped_column(String(300))
    eventos: Mapped[int] = mapped_column(server_default=text("0"))
    # Lectura eficiente: petición condicional (ETag / Last-Modified: si nada cambió,
    # 304 sin archivo), huella del contenido (igual = no se procesa) y espera
    # creciente tras errores seguidos (no se insiste contra un enlace roto).
    etag: Mapped[str | None] = mapped_column(String(200))
    ultima_modificacion: Mapped[str | None] = mapped_column(String(100))
    huella: Mapped[str | None] = mapped_column(String(64))
    errores_seguidos: Mapped[int] = mapped_column(SmallInteger, server_default=text("0"))
    creado: Mapped[datetime] = mapped_column(server_default=func.now())
    creado_por: Mapped[UUID | None] = mapped_column(ForeignKey("usuarios.id", ondelete="RESTRICT"))

    __table_args__ = (
        ForeignKeyConstraint(
            ["habitacion_id", "propiedad_id"],
            ["habitaciones.id", "habitaciones.propiedad_id"],
            ondelete="RESTRICT",
            name="fk_calendarios_externos_habitacion_propiedad",
        ),
        ForeignKeyConstraint(["propiedad_id"], ["propiedades.id"], ondelete="RESTRICT"),
        UniqueConstraint("habitacion_id", "canal"),
        CheckConstraint(f"canal IN {CANALES}", name="canal"),
        CheckConstraint("url LIKE 'https://%'", name="https"),
    )


class ReservaExterna(Base):
    __tablename__ = "reservas_externas"
    id: Mapped[UUID] = mapped_column(primary_key=True, server_default=text("uuidv7()"))
    propiedad_id: Mapped[UUID] = mapped_column(ForeignKey("propiedades.id", ondelete="RESTRICT"))
    habitacion_id: Mapped[UUID | None] = mapped_column(ForeignKey("habitaciones.id", ondelete="RESTRICT"))
    canal: Mapped[str] = mapped_column(String(10))
    uid_externo: Mapped[str] = mapped_column(String(255))
    estancia: Mapped[Range[date]] = mapped_column(DATERANGE)
    titulo: Mapped[str | None] = mapped_column(String(200))  # el SUMMARY del iCal o el huésped del CSV
    estado: Mapped[str] = mapped_column(String(10), server_default="vigente")
    origen: Mapped[str] = mapped_column(String(5))  # ical | csv
    calendario_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("calendarios_externos.id", ondelete="SET NULL"), index=True
    )
    leida_en: Mapped[datetime] = mapped_column(server_default=func.now())
    creada: Mapped[datetime] = mapped_column(server_default=func.now())

    @property
    def llegada(self) -> date:
        return self.estancia.lower

    @property
    def salida(self) -> date:
        return self.estancia.upper

    __table_args__ = (
        UniqueConstraint("canal", "uid_externo"),  # volver a leer actualiza, no duplica
        CheckConstraint(f"canal IN {CANALES}", name="canal"),
        CheckConstraint("estado IN ('vigente', 'cancelada')", name="estado"),
        CheckConstraint("origen IN ('ical', 'csv')", name="origen"),
        CheckConstraint(
            "NOT isempty(estancia) AND NOT lower_inf(estancia) AND NOT upper_inf(estancia)", name="estancia"
        ),
        Index("ix_reservas_externas_propiedad_estancia", "propiedad_id", "estancia", postgresql_using="gist"),
        Index(
            "ix_reservas_externas_habitacion_estancia", "habitacion_id", "estancia", postgresql_using="gist"
        ),
    )


class MencionExterna(Base):
    """Dónde aparece el hotel en la web (el bot, §13.1). Dato NO confiable: se
    sanea y se muestra como texto, nunca como HTML."""

    __tablename__ = "menciones_externas"
    id: Mapped[UUID] = mapped_column(primary_key=True, server_default=text("uuidv7()"))
    url: Mapped[str] = mapped_column(String(2000), unique=True)
    dominio: Mapped[str] = mapped_column(String(255), index=True)
    consulta: Mapped[str] = mapped_column(String(120))  # con qué búsqueda apareció
    titulo: Mapped[str | None] = mapped_column(String(300))
    descripcion: Mapped[str | None] = mapped_column(String(600))
    # leida | bloqueada_dominio | bloqueada_robots | error | sin_leer
    estado: Mapped[str] = mapped_column(String(20), server_default="sin_leer")
    detalle: Mapped[str | None] = mapped_column(String(300))
    precio: Mapped[str | None] = mapped_column(String(60))  # tal como lo publica (moneda incluida)
    calificacion: Mapped[Decimal | None] = mapped_column(Numeric(4, 2))  # sobre 5
    resenas: Mapped[int | None]
    encontrada_en: Mapped[datetime] = mapped_column(server_default=func.now())
    leida_en: Mapped[datetime | None]


class AjustesBot(Base):
    """Una sola fila. Se edita en el panel (permiso `ajustes.editar`)."""

    __tablename__ = "ajustes_bot"
    id: Mapped[int] = mapped_column(SmallInteger, primary_key=True, server_default=text("1"))
    tope_mensual: Mapped[int] = mapped_column(
        server_default=text("100")
    )  # consultas al buscador (cobra por consulta)
    mes: Mapped[date | None]
    consultas_mes: Mapped[int] = mapped_column(server_default=text("0"))
    # Quiénes somos para los sitios que leemos (User-Agent). Sin contacto, el bot no lee.
    contacto: Mapped[str | None] = mapped_column(String(120))
    consultas: Mapped[list[str]] = mapped_column(ARRAY(String(120)))
    dominios_bloqueados: Mapped[list[str]] = mapped_column(ARRAY(String(255)))
    ultima_ejecucion: Mapped[datetime | None]
    ultimo_resultado: Mapped[str | None] = mapped_column(String(300))

    __table_args__ = (CheckConstraint("id = 1", name="una_fila"),)
