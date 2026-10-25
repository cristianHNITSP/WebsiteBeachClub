"""Sesiones del panel (BACKEND-USUARIOS-Y-PERMISOS §4, PLAN-BACKEND §11)."""

from datetime import datetime
from uuid import UUID

from sqlalchemy import ForeignKey, String, func, text
from sqlalchemy.orm import Mapped, mapped_column

from app.modelos.base import Base


class SesionUsuario(Base):
    __tablename__ = "sesiones"
    id: Mapped[UUID] = mapped_column(primary_key=True, server_default=text("uuidv7()"))
    usuario_id: Mapped[UUID] = mapped_column(ForeignKey("usuarios.id", ondelete="CASCADE"), index=True)
    # SHA-256 del token de renovación vigente (nunca el token).
    hash_renovacion: Mapped[str] = mapped_column(String(64), unique=True)
    # El anterior, durante 30 s: si dos pestañas renuevan a la vez, la segunda
    # llega con el viejo. Eso NO es un robo: se responde "ya renovada" y no se
    # revoca nada.
    hash_anterior: Mapped[str | None] = mapped_column(String(64))
    rotada_en: Mapped[datetime | None]
    recordar: Mapped[bool]  # «Mantener la sesión iniciada»: sobrevive a cerrar el navegador
    ip: Mapped[str | None] = mapped_column(String(45))
    agente: Mapped[str | None] = mapped_column(String(300))
    creada: Mapped[datetime] = mapped_column(server_default=func.now())
    usada: Mapped[datetime] = mapped_column(server_default=func.now())  # última renovación
    vence: Mapped[datetime]  # creada + 12 h; renovar NO lo mueve
    revocada: Mapped[bool] = mapped_column(server_default=text("false"))
