"""Fotos de las habitaciones (PLAN-BACKEND §18). En la base: ids y datos; los
archivos (WebP en 3 anchos) viven en FOTOS_DIR con nombres que arma el servidor.
Nunca se guarda una ruta ni el nombre que mandó el navegador."""

from datetime import datetime
from uuid import UUID

from sqlalchemy import (
    BigInteger,
    CheckConstraint,
    ForeignKey,
    ForeignKeyConstraint,
    Index,
    Integer,
    SmallInteger,
    String,
    func,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.modelos.base import Base, ConBorradoLogico


class Foto(ConBorradoLogico, Base):
    __tablename__ = "fotos"
    id: Mapped[UUID] = mapped_column(primary_key=True, server_default=text("uuidv7()"))
    habitacion_id: Mapped[UUID]
    propiedad_id: Mapped[UUID] = mapped_column(index=True)
    orden: Mapped[int] = mapped_column(SmallInteger, server_default=text("0"))  # 0 = la portada
    ancho: Mapped[int] = mapped_column(Integer)  # del original, ya enderezado (EXIF)
    alto: Mapped[int] = mapped_column(Integer)
    formato_original: Mapped[str] = mapped_column(String(10))  # JPEG | PNG | WEBP | HEIF
    bytes_original: Mapped[int] = mapped_column(BigInteger)
    # SHA-256 del archivo tal como llegó: evidencia de qué se subió, y evita la
    # misma foto dos veces en la misma habitación.
    huella_sha256: Mapped[str] = mapped_column(String(64))
    subida_por: Mapped[UUID | None] = mapped_column(ForeignKey("usuarios.id", ondelete="RESTRICT"))
    creada: Mapped[datetime] = mapped_column(server_default=func.now())
    # Lápida: los archivos se borran DESPUÉS del commit, por una tarea (nunca
    # dentro de la transacción: si fallara, la foto quedaría sin archivos).
    archivos_borrados: Mapped[bool] = mapped_column(server_default=text("false"))

    def vaciar_contenido(self) -> None:
        pass  # sin datos personales en la fila; los archivos los borra `limpiar_fotos`

    __table_args__ = (
        ForeignKeyConstraint(
            ["habitacion_id", "propiedad_id"],
            ["habitaciones.id", "habitaciones.propiedad_id"],
            ondelete="RESTRICT",
            name="fk_fotos_habitacion_propiedad",
        ),
        CheckConstraint("ancho > 0 AND alto > 0 AND bytes_original > 0", name="medidas"),
        CheckConstraint("formato_original IN ('JPEG', 'PNG', 'WEBP', 'HEIF')", name="formato"),
        CheckConstraint("purgado_en IS NULL OR eliminado_en IS NOT NULL", name="lapida"),
        Index("ix_fotos_habitacion_orden", "habitacion_id", "orden"),
        Index(
            "uq_fotos_habitacion_huella",
            "habitacion_id",
            "huella_sha256",
            unique=True,
            postgresql_where=text("eliminado_en IS NULL"),
        ),
    )
