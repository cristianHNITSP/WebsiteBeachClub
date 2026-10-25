"""Usuarios, roles, permisos y acceso por propiedad (BACKEND-USUARIOS-Y-PERMISOS §1–§2,
PLAN-BACKEND §11.1)."""

from datetime import datetime
from uuid import UUID

from sqlalchemy import Column, ForeignKey, SmallInteger, String, Table, func, text
from sqlalchemy.dialects.postgresql import CITEXT
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.modelos.base import Base

roles_permisos = Table(
    "roles_permisos",
    Base.metadata,
    Column("rol_id", ForeignKey("roles.id", ondelete="CASCADE"), primary_key=True),
    Column("permiso_id", ForeignKey("permisos.id", ondelete="CASCADE"), primary_key=True),
)

# A qué propiedades tiene acceso cada empleado (si su rol no tiene `propiedades.todas`).
usuarios_propiedades = Table(
    "usuarios_propiedades",
    Base.metadata,
    Column("usuario_id", ForeignKey("usuarios.id", ondelete="CASCADE"), primary_key=True),
    Column("propiedad_id", ForeignKey("propiedades.id", ondelete="RESTRICT"), primary_key=True),
)


class Propiedad(Base):
    """Cabañas Frida (Chelem) y Casa Frida (Chuburná)."""

    __tablename__ = "propiedades"
    id: Mapped[UUID] = mapped_column(primary_key=True, server_default=text("uuidv7()"))
    clave: Mapped[str] = mapped_column(String(40), unique=True)  # chelem | chuburna
    nombre: Mapped[str] = mapped_column(String(120))
    lugar: Mapped[str] = mapped_column(String(120))


class Permiso(Base):
    __tablename__ = "permisos"
    id: Mapped[int] = mapped_column(SmallInteger, primary_key=True)
    clave: Mapped[str] = mapped_column(String(60), unique=True)  # «reservas.crear»
    modulo: Mapped[str] = mapped_column(String(40))
    descripcion: Mapped[str] = mapped_column(String(200))


class Rol(Base):
    __tablename__ = "roles"
    id: Mapped[int] = mapped_column(SmallInteger, primary_key=True)
    clave: Mapped[str] = mapped_column(String(40), unique=True)  # gerente | recepcion | restaurante | huesped
    nombre: Mapped[str] = mapped_column(String(80))
    es_personal: Mapped[bool]  # llega al panel (los roles no son niveles: se protege por permisos)
    permisos: Mapped[list[Permiso]] = relationship(secondary=roles_permisos, lazy="raise")


class Usuario(Base):
    __tablename__ = "usuarios"
    id: Mapped[UUID] = mapped_column(primary_key=True, server_default=text("uuidv7()"))
    usuario: Mapped[str] = mapped_column(CITEXT, unique=True)  # sin distinguir mayúsculas
    correo: Mapped[str] = mapped_column(CITEXT, unique=True)
    nombre: Mapped[str] = mapped_column(String(120))
    hash_clave: Mapped[str | None] = mapped_column(String(255))  # None si solo entra con Google
    rol_id: Mapped[int] = mapped_column(ForeignKey("roles.id", ondelete="RESTRICT"), index=True)
    activo: Mapped[bool] = mapped_column(server_default=text("true"))  # dar de baja = desactivar, no borrar
    correo_verificado: Mapped[bool] = mapped_column(server_default=text("false"))
    # Contraseña puesta por un gerente (alta o restablecer): al entrar, el panel
    # le pide cambiarla. La persona es la única que debe conocer la suya.
    debe_cambiar_clave: Mapped[bool] = mapped_column(server_default=text("false"))
    creado: Mapped[datetime] = mapped_column(server_default=func.now())
    ultimo_acceso: Mapped[datetime | None]

    # lazy="raise": cargar una relación sin pedirla explícitamente es un error,
    # no una consulta escondida (PLAN-BACKEND §17.2, cero N+1).
    rol: Mapped[Rol] = relationship(lazy="raise")
    propiedades: Mapped[list[Propiedad]] = relationship(secondary=usuarios_propiedades, lazy="raise")
