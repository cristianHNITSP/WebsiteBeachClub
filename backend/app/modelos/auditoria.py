"""Auditoría forense (BACKEND-USUARIOS-Y-PERMISOS §6, PLAN-BACKEND §17.4).

- Toda acción que cambia algo, y todo evento de seguridad, deja una fila en la
  MISMA transacción del cambio.
- Cadena de hashes: cada fila guarda el SHA-256 de la anterior (`hash_anterior`)
  y el suyo (`hash`), calculados por Postgres (trigger de la migración 0005),
  igual que `secuencia` y `momento`: la aplicación no puede elegirlos. Alterar,
  borrar o insertar una fila a destiempo rompe la cadena y `auditoria_verificar()`
  dice en qué eslabón.
- Solo se añade: ni la API ni el dueño de la tabla pueden modificarla ni
  borrarla (trigger + REVOKE).
- Nunca guarda contraseñas, tokens ni datos de tarjetas.
"""

from datetime import datetime
from uuid import UUID

from sqlalchemy import BigInteger, FetchedValue, ForeignKey, Identity, Index, String, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.modelos.base import Base


class Auditoria(Base):
    __tablename__ = "auditoria"
    id: Mapped[int] = mapped_column(BigInteger, Identity(), primary_key=True)
    # Orden de la cadena (lo asigna el trigger, sin huecos).
    secuencia: Mapped[int] = mapped_column(BigInteger, unique=True, server_default=FetchedValue())
    # Lo pone el trigger con clock_timestamp(): la hora real de la inserción.
    momento: Mapped[datetime] = mapped_column(server_default=func.now())
    # RESTRICT: el personal nunca se borra (lápida), y la auditoría nunca se modifica.
    usuario_id: Mapped[UUID | None] = mapped_column(ForeignKey("usuarios.id", ondelete="RESTRICT"))
    accion: Mapped[str] = mapped_column(
        String(60)
    )  # «sesion.iniciar», «habitacion.editar», «permiso.denegado»
    entidad: Mapped[str] = mapped_column(String(40))
    entidad_id: Mapped[str | None] = mapped_column(String(64))
    antes: Mapped[dict | None] = mapped_column(JSONB)
    despues: Mapped[dict | None] = mapped_column(JSONB)
    ip: Mapped[str | None] = mapped_column(String(45))
    agente: Mapped[str | None] = mapped_column(String(300))  # User-Agent, o «cli» / «tarea»
    sesion_id: Mapped[UUID | None]  # la sesión del panel (no FK: la evidencia no depende de otra tabla)
    solicitud_id: Mapped[UUID | None]  # = X-Solicitud-Id de la respuesta y del registro de acceso
    hash_anterior: Mapped[str] = mapped_column(String(64), server_default=FetchedValue())
    hash: Mapped[str] = mapped_column(String(64), server_default=FetchedValue())

    # BRIN: diminuto y rápido para rangos de fechas en una tabla que solo crece (PLAN-BACKEND §9).
    __table_args__ = (
        Index("ix_auditoria_momento_brin", "momento", postgresql_using="brin"),
        Index("ix_auditoria_entidad", "entidad", "entidad_id"),
        Index("ix_auditoria_usuario_id", "usuario_id"),
    )
