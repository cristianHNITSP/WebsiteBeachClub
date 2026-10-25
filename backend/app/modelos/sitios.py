"""Sitios web que reservan por la API pública v1 (PLAN-BACKEND §4, §7).

Un sitio = una website (WordPress, Shopify…) con sus claves, sus orígenes
permitidos (CORS), las propiedades que vende y la URL de sus webhooks. Nunca
se borra (sus reservas lo nombran): se revoca.
"""

from datetime import datetime
from uuid import UUID

from sqlalchemy import (
    CheckConstraint,
    Column,
    ForeignKey,
    Index,
    SmallInteger,
    String,
    Table,
    UniqueConstraint,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import ARRAY, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.modelos.base import Base
from app.modelos.usuarios import Propiedad

sitios_propiedades = Table(
    "sitios_propiedades",
    Base.metadata,
    Column("sitio_id", ForeignKey("sitios.id", ondelete="CASCADE"), primary_key=True),
    Column("propiedad_id", ForeignKey("propiedades.id", ondelete="RESTRICT"), primary_key=True),
)


class Sitio(Base):
    __tablename__ = "sitios"
    id: Mapped[UUID] = mapped_column(primary_key=True, server_default=text("uuidv7()"))
    nombre: Mapped[str] = mapped_column(String(80))
    # Pública (pk_…): va en el HTML del sitio, no es secreta; se busca tal cual.
    clave_publica: Mapped[str] = mapped_column(String(48), unique=True)
    # Secreta (sk_…): solo su SHA-256 (es aleatoria y larga: no hace falta Argon2).
    clave_secreta_hash: Mapped[str] = mapped_column(String(64), unique=True)
    clave_secreta_pista: Mapped[str] = mapped_column(String(4))  # últimos 4, para reconocerla en el panel
    # Orígenes exactos (https://hotelesfrida.mx) desde los que se acepta la clave pública.
    origenes: Mapped[list[str]] = mapped_column(ARRAY(String(200)), server_default=text("'{}'"))
    webhook_url: Mapped[str | None] = mapped_column(String(500))
    # El secreto de webhooks se deriva de CLAVE_WEBHOOKS + id + versión: rotarlo = subir la versión.
    webhook_version: Mapped[int] = mapped_column(SmallInteger, server_default=text("1"))
    revocado_en: Mapped[datetime | None]
    revocado_por: Mapped[UUID | None] = mapped_column(ForeignKey("usuarios.id", ondelete="RESTRICT"))
    creado: Mapped[datetime] = mapped_column(server_default=func.now())
    creado_por: Mapped[UUID | None] = mapped_column(ForeignKey("usuarios.id", ondelete="RESTRICT"))
    actualizado: Mapped[datetime] = mapped_column(server_default=func.now(), onupdate=func.now())

    propiedades: Mapped[list[Propiedad]] = relationship(secondary=sitios_propiedades, lazy="raise")

    __table_args__ = (
        CheckConstraint("webhook_url IS NULL OR webhook_url LIKE 'https://%'", name="webhook_https"),
    )


class ClaveIdempotencia(Base):
    """`Idempotency-Key` de la API pública (PLAN-BACKEND §7). Se guarda en la MISMA
    transacción que lo que hizo la petición: si la petición falla, no queda la
    clave y reintentar vuelve a ejecutar; si salió bien, se devuelve lo guardado."""

    __tablename__ = "claves_idempotencia"
    sitio_id: Mapped[UUID] = mapped_column(ForeignKey("sitios.id", ondelete="CASCADE"), primary_key=True)
    clave: Mapped[UUID] = mapped_column(primary_key=True)  # única POR SITIO
    hash_peticion: Mapped[str] = mapped_column(String(64))
    codigo_http: Mapped[int] = mapped_column(SmallInteger)
    respuesta: Mapped[dict] = mapped_column(JSONB)
    creada: Mapped[datetime] = mapped_column(server_default=func.now())

    # ponytail: sin particionar todavía (PLAN-BACKEND §9); se borran a los 7 días (beat).
    __table_args__ = (Index("ix_claves_idempotencia_creada_brin", "creada", postgresql_using="brin"),)


ESTADOS_ENTREGA = ("pendiente", "entregada", "fallida")


class EntregaWebhook(Base):
    """Un aviso a la website (PLAN-BACKEND §4.4): uno por evento del outbox y
    sitio, con sus reintentos. `id` = el `id` del evento que recibe el sitio."""

    __tablename__ = "entregas_webhook"
    id: Mapped[UUID] = mapped_column(primary_key=True, server_default=text("uuidv7()"))
    sitio_id: Mapped[UUID] = mapped_column(ForeignKey("sitios.id", ondelete="CASCADE"))
    evento_id: Mapped[UUID]  # el del outbox
    tipo: Mapped[str] = mapped_column(String(60))
    cuerpo: Mapped[dict] = mapped_column(JSONB)
    estado: Mapped[str] = mapped_column(String(10), server_default="pendiente")
    intentos: Mapped[int] = mapped_column(SmallInteger, server_default=text("0"))
    proximo_intento: Mapped[datetime] = mapped_column(server_default=func.now())
    ultimo_http: Mapped[int | None] = mapped_column(SmallInteger)
    ultimo_error: Mapped[str | None] = mapped_column(String(300))
    entregada_en: Mapped[datetime | None]
    creada: Mapped[datetime] = mapped_column(server_default=func.now())

    __table_args__ = (
        UniqueConstraint("sitio_id", "evento_id"),  # despachar dos veces no avisa dos veces
        CheckConstraint(f"estado IN {ESTADOS_ENTREGA}", name="estado"),
        Index(
            "ix_entregas_webhook_pendientes", "proximo_intento", postgresql_where=text("estado = 'pendiente'")
        ),
        Index("ix_entregas_webhook_sitio_creada", "sitio_id", "creada"),
    )
