"""Tarifas de temporada de una habitación (PLAN-BACKEND §5.4, §19). La noche que
cae en una temporada se cobra a su tarifa; las demás, a la base de la habitación."""

from datetime import date, datetime
from uuid import UUID

from sqlalchemy import BigInteger, CheckConstraint, ForeignKeyConstraint, String, func, text
from sqlalchemy.dialects.postgresql import DATERANGE, ExcludeConstraint, Range
from sqlalchemy.orm import Mapped, mapped_column

from app.modelos.base import Base, ConBorradoLogico


class Tarifa(ConBorradoLogico, Base):
    __tablename__ = "tarifas"
    id: Mapped[UUID] = mapped_column(primary_key=True, server_default=text("uuidv7()"))
    habitacion_id: Mapped[UUID]
    propiedad_id: Mapped[UUID] = mapped_column(index=True)
    nombre: Mapped[str] = mapped_column(String(80))  # «Semana Santa», «Verano»
    periodo: Mapped[Range[date]] = mapped_column(DATERANGE)  # noches [desde, hasta)
    tarifa_centavos: Mapped[int] = mapped_column(BigInteger)
    creada: Mapped[datetime] = mapped_column(server_default=func.now())

    def vaciar_contenido(self) -> None:
        pass  # sin datos personales: la lápida conserva qué tarifa fue

    __table_args__ = (
        ForeignKeyConstraint(
            ["habitacion_id", "propiedad_id"],
            ["habitaciones.id", "habitaciones.propiedad_id"],
            ondelete="RESTRICT",
            name="fk_tarifas_habitacion_propiedad",
        ),
        # Dos temporadas vigentes de la misma habitación no se cruzan: cada noche
        # tiene UN precio, sin ambigüedad.
        ExcludeConstraint(
            ("habitacion_id", "="),
            ("periodo", "&&"),
            where=text("eliminado_en IS NULL"),
            using="gist",
            name="tarifas_sin_cruce",
        ),
        CheckConstraint(
            "NOT isempty(periodo) AND NOT lower_inf(periodo) AND NOT upper_inf(periodo)", name="periodo"
        ),
        CheckConstraint("tarifa_centavos > 0", name="tarifa"),
        CheckConstraint("purgado_en IS NULL OR eliminado_en IS NOT NULL", name="lapida"),
    )
