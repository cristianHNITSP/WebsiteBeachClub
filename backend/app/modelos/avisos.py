"""Avisos del panel (fase 4, PLAN-BACKEND §10). Salen del outbox: cada evento
relevante deja UN aviso (idempotente por `evento_id`). Leído y borrado son de
cada persona (`avisos_usuarios`), no del aviso."""

from datetime import datetime
from uuid import UUID

from sqlalchemy import ForeignKey, Index, String, func, text
from sqlalchemy.orm import Mapped, mapped_column

from app.modelos.base import Base


class Aviso(Base):
    __tablename__ = "avisos"
    id: Mapped[UUID] = mapped_column(primary_key=True, server_default=text("uuidv7()"))
    evento_id: Mapped[UUID] = mapped_column(
        unique=True
    )  # el del outbox: un aviso por evento, aunque se reintente
    propiedad_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("propiedades.id", ondelete="RESTRICT"), index=True
    )
    permiso: Mapped[str] = mapped_column(String(60))  # quién lo ve (además de la propiedad)
    tipo: Mapped[str] = mapped_column(String(20))  # reserva | pago | operacion | sistema
    titulo: Mapped[str] = mapped_column(String(120))
    texto: Mapped[str] = mapped_column(String(300))
    destino: Mapped[str] = mapped_column(String(120))  # ruta del panel: «/admin/calendario?…»
    causado_por: Mapped[UUID | None] = mapped_column(ForeignKey("usuarios.id", ondelete="RESTRICT"))
    creado: Mapped[datetime] = mapped_column(server_default=func.now())

    __table_args__ = (Index("ix_avisos_creado_brin", "creado", postgresql_using="brin"),)


class AvisoUsuario(Base):
    """Lo que cada persona hizo con un aviso (sin fila = no leído y visible)."""

    __tablename__ = "avisos_usuarios"
    aviso_id: Mapped[UUID] = mapped_column(ForeignKey("avisos.id", ondelete="CASCADE"), primary_key=True)
    usuario_id: Mapped[UUID] = mapped_column(ForeignKey("usuarios.id", ondelete="CASCADE"), primary_key=True)
    leido_en: Mapped[datetime | None]
    borrado_en: Mapped[datetime | None]
