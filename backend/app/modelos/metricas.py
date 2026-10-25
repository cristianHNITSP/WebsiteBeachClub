"""Métricas precalculadas (PLAN-BACKEND §9): UNA fila por propiedad y día. El
tablero lee unos cientos de filas, nunca la tabla de reservas. Cada fila se
RECALCULA desde las reservas (no se suma ni resta): recalcular dos veces da lo
mismo, y mover o cancelar nunca deja un total descuadrado."""

from datetime import date, datetime
from uuid import UUID

from sqlalchemy import BigInteger, ForeignKey, Integer, func
from sqlalchemy.orm import Mapped, mapped_column

from app.modelos.base import Base


class MetricaDiaria(Base):
    __tablename__ = "metricas_diarias"
    propiedad_id: Mapped[UUID] = mapped_column(
        ForeignKey("propiedades.id", ondelete="RESTRICT"), primary_key=True
    )
    dia: Mapped[date] = mapped_column(primary_key=True)
    habitaciones: Mapped[int] = mapped_column(Integer)  # reservables ese día (no inactivas)
    noches_vendidas: Mapped[int] = mapped_column(Integer)
    bloqueadas: Mapped[int] = mapped_column(Integer)  # noches de mantenimiento
    ingreso_centavos: Mapped[int] = mapped_column(BigInteger)  # lo reservado, repartido por noche
    llegadas: Mapped[int] = mapped_column(Integer)
    salidas: Mapped[int] = mapped_column(Integer)
    canceladas: Mapped[int] = mapped_column(Integer)  # por día de llegada
    # Lo que falta cobrar de las reservas confirmadas o en curso que llegan ese día.
    # Lo cambian también los pagos: por eso sus eventos recalculan.
    por_cobrar_centavos: Mapped[int] = mapped_column(BigInteger, server_default="0")
    calculado: Mapped[datetime] = mapped_column(server_default=func.now())
