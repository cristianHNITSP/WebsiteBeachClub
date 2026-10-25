"""Habitaciones y cabañas (PLAN-BACKEND §11.1, §19). Cada una pertenece a UNA
propiedad; Postgres solo deja verlas a quien tiene acceso a esa propiedad (RLS,
migración 0003)."""

from datetime import datetime
from uuid import UUID

from sqlalchemy import (
    BigInteger,
    CheckConstraint,
    ForeignKey,
    Index,
    SmallInteger,
    String,
    UniqueConstraint,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.orm import Mapped, mapped_column

from app.modelos.base import Base, ConBorradoLogico

ESTADOS = ("activa", "mantenimiento", "inactiva")
CAMAS = ("king", "queen", "matrimonial", "individuales")


class Habitacion(ConBorradoLogico, Base):
    __tablename__ = "habitaciones"
    id: Mapped[UUID] = mapped_column(primary_key=True, server_default=text("uuidv7()"))
    propiedad_id: Mapped[UUID] = mapped_column(ForeignKey("propiedades.id", ondelete="RESTRICT"), index=True)
    nombre: Mapped[str] = mapped_column(String(120))
    tipo: Mapped[str] = mapped_column(String(40))  # «Suite», «Cabaña»… texto: el hotel puede inventar tipos
    capacidad: Mapped[int] = mapped_column(SmallInteger)
    cama: Mapped[str | None] = mapped_column(String(20))
    tamano_m2: Mapped[int | None] = mapped_column(SmallInteger)
    amenidades: Mapped[list[str]] = mapped_column(ARRAY(String(40)), server_default=text("'{}'"))
    descripcion: Mapped[str] = mapped_column(String(2000), server_default="")
    tarifa_centavos: Mapped[int] = mapped_column(BigInteger)  # tarifa base por noche, IVA incluido
    estado: Mapped[str] = mapped_column(String(20), server_default="activa")
    # Bloqueo optimista (PLAN-BACKEND §6.3): dos gerentes editando a la vez no se pisan.
    version: Mapped[int] = mapped_column(server_default=text("1"))
    creada: Mapped[datetime] = mapped_column(server_default=func.now())
    actualizada: Mapped[datetime] = mapped_column(server_default=func.now(), onupdate=func.now())

    def vaciar_contenido(self) -> None:
        # Queda: id, propiedad, nombre, tipo (lo que el historial necesita mostrar).
        self.descripcion, self.amenidades, self.cama, self.tamano_m2 = "", [], None, None

    __mapper_args__ = {"version_id_col": version}  # noqa: RUF012  # forma que pide SQLAlchemy
    __table_args__ = (
        CheckConstraint("capacidad BETWEEN 1 AND 20", name="capacidad"),
        CheckConstraint("tamano_m2 IS NULL OR tamano_m2 BETWEEN 5 AND 2000", name="tamano"),
        CheckConstraint("tarifa_centavos > 0", name="tarifa"),
        CheckConstraint(f"estado IN {ESTADOS}", name="estado"),
        CheckConstraint(f"cama IS NULL OR cama IN {CAMAS}", name="cama"),
        # Para la llave compuesta de reservas: una reserva apunta a una habitación
        # DE SU MISMA propiedad (lo garantiza la base).
        UniqueConstraint("id", "propiedad_id", name="uq_habitaciones_id_propiedad"),
        # Solo lo que está en la papelera puede eliminarse definitivamente.
        CheckConstraint("purgado_en IS NULL OR eliminado_en IS NOT NULL", name="lapida"),
        # Único entre las NO borradas: una en la papelera no bloquea su nombre.
        Index(
            "uq_habitaciones_propiedad_nombre",
            "propiedad_id",
            func.lower(text("nombre")),
            unique=True,
            postgresql_where=text("eliminado_en IS NULL"),
        ),
    )
