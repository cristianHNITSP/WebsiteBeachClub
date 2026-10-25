"""Reservas, sus pagos, su historial, el outbox y el cobro de cada propiedad
(PLAN-BACKEND §5, §6). Reservas y pagos NUNCA se borran: se cancelan."""

from datetime import date, datetime
from uuid import UUID

from sqlalchemy import (
    BigInteger,
    CheckConstraint,
    ForeignKey,
    ForeignKeyConstraint,
    Identity,
    Index,
    SmallInteger,
    String,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import DATERANGE, JSONB, ExcludeConstraint, Range
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.modelos.base import Base
from app.modelos.habitaciones import Habitacion

ESTADOS = ("retenida", "confirmada", "en_curso", "completada", "expirada", "cancelada")
ACTIVOS = ("retenida", "confirmada", "en_curso")  # ocupan la habitación
TIPOS = ("reserva", "bloqueo")  # bloqueo = mantenimiento: ocupa, sin huésped ni dinero
MODALIDADES = ("completo", "anticipo")
CONCEPTOS = ("anticipo", "total", "saldo", "abono", "devolucion")  # devolucion: dinero que SALE
METODOS = ("efectivo", "tarjeta", "transferencia")
ESTADOS_PAGO = ("pendiente", "autorizado", "cobrado", "fallido", "anulado", "reembolsado")


class AjusteCobro(Base):
    """Anticipo o pago completo, por propiedad (PLAN-BACKEND §5.4). Lo cambia un
    gerente; cada reserva guarda SU copia, así cambiarlo no toca las ya hechas."""

    __tablename__ = "ajustes_cobro"
    propiedad_id: Mapped[UUID] = mapped_column(
        ForeignKey("propiedades.id", ondelete="RESTRICT"), primary_key=True
    )
    modalidad: Mapped[str] = mapped_column(String(10))
    porcentaje_anticipo: Mapped[int | None] = mapped_column(SmallInteger)
    actualizado: Mapped[datetime] = mapped_column(server_default=func.now(), onupdate=func.now())
    actualizado_por: Mapped[UUID | None] = mapped_column(ForeignKey("usuarios.id", ondelete="RESTRICT"))

    __table_args__ = (
        CheckConstraint(
            "(modalidad = 'completo' AND porcentaje_anticipo IS NULL)"
            " OR (modalidad = 'anticipo' AND porcentaje_anticipo BETWEEN 1 AND 99)",
            name="modalidad",
        ),
    )


class Reserva(Base):
    __tablename__ = "reservas"
    id: Mapped[UUID] = mapped_column(primary_key=True, server_default=text("uuidv7()"))
    # Para el huésped y la recepción (FRD-7K2M9Q). No es el uuid: un uuidv7 revela la hora.
    codigo: Mapped[str] = mapped_column(String(12), unique=True)
    propiedad_id: Mapped[UUID] = mapped_column(index=True)
    habitacion_id: Mapped[UUID]
    tipo: Mapped[str] = mapped_column(String(10), server_default="reserva")
    estado: Mapped[str] = mapped_column(String(12))
    # Noches [llegada, salida): la de salida no se cobra ni se ocupa. Fechas de Mérida.
    estancia: Mapped[Range[date]] = mapped_column(DATERANGE)
    adultos: Mapped[int] = mapped_column(SmallInteger, server_default=text("0"))
    ninos: Mapped[int] = mapped_column(SmallInteger, server_default=text("0"))
    huesped_nombre: Mapped[str | None] = mapped_column(String(120))
    huesped_correo: Mapped[str | None] = mapped_column(String(254))
    huesped_telefono: Mapped[str | None] = mapped_column(String(20))
    notas: Mapped[str] = mapped_column(String(1000), server_default="")
    # Copia de lo que se aplicó al crearla (PLAN-BACKEND §5.4): cambiar la tarifa
    # o el ajuste de cobro después no toca esta reserva.
    modalidad: Mapped[str | None] = mapped_column(String(10))
    porcentaje_anticipo: Mapped[int | None] = mapped_column(SmallInteger)
    tarifa_noche_centavos: Mapped[int] = mapped_column(BigInteger, server_default=text("0"))
    total_centavos: Mapped[int] = mapped_column(BigInteger, server_default=text("0"))
    anticipo_centavos: Mapped[int] = mapped_column(BigInteger, server_default=text("0"))
    pagado_centavos: Mapped[int] = mapped_column(BigInteger, server_default=text("0"))
    motivo_cancelacion: Mapped[str | None] = mapped_column(String(300))
    version: Mapped[int] = mapped_column(server_default=text("1"))
    creada: Mapped[datetime] = mapped_column(server_default=func.now())
    actualizada: Mapped[datetime] = mapped_column(server_default=func.now(), onupdate=func.now())
    creada_por: Mapped[UUID | None] = mapped_column(ForeignKey("usuarios.id", ondelete="RESTRICT"))
    # Las de la API pública (fase 6): de qué sitio vino, cuándo vence la retención
    # y el hash del token que el huésped usa para consultarla o cancelarla.
    sitio_id: Mapped[UUID | None] = mapped_column(ForeignKey("sitios.id", ondelete="RESTRICT"))
    vence_en: Mapped[datetime | None]
    token_hash: Mapped[str | None] = mapped_column(String(64))

    # Solo lectura: la llave real es la compuesta (habitación, propiedad) de abajo.
    habitacion: Mapped[Habitacion] = relationship(
        lazy="raise",
        primaryjoin="Reserva.habitacion_id == Habitacion.id",
        foreign_keys="Reserva.habitacion_id",
        viewonly=True,
    )

    @property
    def llegada(self) -> date:
        return self.estancia.lower

    @property
    def salida(self) -> date:
        return self.estancia.upper

    @property
    def noches(self) -> int:
        return (self.estancia.upper - self.estancia.lower).days

    @property
    def saldo_centavos(self) -> int:
        """Lo que la modalidad deja para cobrar en el hotel (total − anticipo)."""
        return self.total_centavos - self.anticipo_centavos

    @property
    def por_cobrar_centavos(self) -> int:
        """Lo que falta cobrar. Una cancelada o vencida ya no debe nada (lo que se
        haya cobrado se resuelve con una devolución)."""
        if self.estado in ("cancelada", "expirada"):
            return 0
        return self.total_centavos - self.pagado_centavos

    __mapper_args__ = {"version_id_col": version}  # noqa: RUF012  # bloqueo optimista (§6.3)
    __table_args__ = (
        # La habitación es de ESTA propiedad: lo garantiza la base, no solo el servicio.
        ForeignKeyConstraint(
            ["habitacion_id", "propiedad_id"],
            ["habitaciones.id", "habitaciones.propiedad_id"],
            ondelete="RESTRICT",
            name="fk_reservas_habitacion_propiedad",
        ),
        ForeignKeyConstraint(["propiedad_id"], ["propiedades.id"], ondelete="RESTRICT"),
        # Cero sobreventa (PLAN-BACKEND §6.2): dos reservas activas de la misma
        # habitación no se cruzan NUNCA, la pida quien la pida y a la vez que sea.
        ExcludeConstraint(
            ("habitacion_id", "="),
            ("estancia", "&&"),
            where=text(f"estado IN {ACTIVOS}"),
            using="gist",
            name="sin_choque",
        ),
        Index("ix_reservas_propiedad_estancia", "propiedad_id", "estancia", postgresql_using="gist"),
        # Por habitación y fechas, en CUALQUIER estado (la exclusión `sin_choque` es
        # parcial: solo activas). Sin este índice, las métricas de una habitación
        # recorrían la tabla entera (153 ms con 1 millón; lo vio la prueba de carga).
        Index("ix_reservas_habitacion_estancia", "habitacion_id", "estancia", postgresql_using="gist"),
        # Llegadas y salidas por día (métricas, tablero) sin recorrer la tabla.
        Index("ix_reservas_propiedad_llegada", "propiedad_id", func.lower(text("estancia"))),
        Index("ix_reservas_propiedad_salida", "propiedad_id", func.upper(text("estancia"))),
        CheckConstraint(
            "NOT isempty(estancia) AND NOT lower_inf(estancia) AND NOT upper_inf(estancia)", name="estancia"
        ),
        CheckConstraint(f"estado IN {ESTADOS}", name="estado"),
        CheckConstraint("estado <> 'retenida' OR vence_en IS NOT NULL", name="retenida_vence"),
        # Las retenciones por vencer, para la tarea que las vence cada minuto.
        Index("ix_reservas_retenidas_vence", "vence_en", postgresql_where=text("estado = 'retenida'")),
        CheckConstraint(f"tipo IN {TIPOS}", name="tipo"),
        CheckConstraint(
            "tipo = 'bloqueo' OR (huesped_nombre IS NOT NULL AND adultos >= 1 AND modalidad IS NOT NULL)",
            name="huesped",
        ),
        CheckConstraint(
            "tipo = 'reserva' OR (total_centavos = 0 AND pagado_centavos = 0)", name="bloqueo_sin_dinero"
        ),
        CheckConstraint(f"modalidad IS NULL OR modalidad IN {MODALIDADES}", name="modalidad"),
        CheckConstraint("adultos BETWEEN 0 AND 20 AND ninos BETWEEN 0 AND 20", name="personas"),
        CheckConstraint(
            "total_centavos >= 0 AND anticipo_centavos BETWEEN 0 AND total_centavos"
            " AND pagado_centavos BETWEEN 0 AND total_centavos",
            name="montos",
        ),
    )


class Pago(Base):
    """Cada cobro, una fila (PLAN-BACKEND §5.4). Nunca se borra: se anula o reembolsa."""

    __tablename__ = "pagos"
    id: Mapped[UUID] = mapped_column(primary_key=True, server_default=text("uuidv7()"))
    reserva_id: Mapped[UUID] = mapped_column(ForeignKey("reservas.id", ondelete="RESTRICT"), index=True)
    propiedad_id: Mapped[UUID] = mapped_column(ForeignKey("propiedades.id", ondelete="RESTRICT"))
    concepto: Mapped[str] = mapped_column(String(10))
    metodo: Mapped[str] = mapped_column(String(15))
    estado: Mapped[str] = mapped_column(String(12))
    monto_centavos: Mapped[int] = mapped_column(BigInteger)
    referencia: Mapped[str | None] = mapped_column(String(100))  # folio de la terminal, de la transferencia…
    motivo: Mapped[str | None] = mapped_column(String(300))  # obligatorio en una devolución
    registrado_por: Mapped[UUID | None] = mapped_column(ForeignKey("usuarios.id", ondelete="RESTRICT"))
    creado: Mapped[datetime] = mapped_column(server_default=func.now())

    __table_args__ = (
        CheckConstraint("monto_centavos > 0", name="monto"),
        CheckConstraint(f"concepto IN {CONCEPTOS}", name="concepto"),
        CheckConstraint(f"metodo IN {METODOS}", name="metodo"),
        CheckConstraint(f"estado IN {ESTADOS_PAGO}", name="estado"),
        CheckConstraint("concepto <> 'devolucion' OR motivo IS NOT NULL", name="devolucion_con_motivo"),
    )


class ReservaEvento(Base):
    """Historial de una reserva para el panel (quién, cuándo, de qué estado a
    cuál). Solo se añade. La evidencia forense completa está en `auditoria`."""

    __tablename__ = "reservas_eventos"
    id: Mapped[int] = mapped_column(BigInteger, Identity(), primary_key=True)
    reserva_id: Mapped[UUID] = mapped_column(ForeignKey("reservas.id", ondelete="RESTRICT"), index=True)
    propiedad_id: Mapped[UUID] = mapped_column(ForeignKey("propiedades.id", ondelete="RESTRICT"))
    # En la llave porque la tabla se parte por mes de `momento` (Postgres lo exige).
    momento: Mapped[datetime] = mapped_column(server_default=func.now(), primary_key=True)
    usuario_id: Mapped[UUID | None] = mapped_column(ForeignKey("usuarios.id", ondelete="RESTRICT"))
    tipo: Mapped[str] = mapped_column(String(20))  # crear | mover | llegada | salida | cancelar | pago
    de_estado: Mapped[str | None] = mapped_column(String(12))
    a_estado: Mapped[str | None] = mapped_column(String(12))
    detalle: Mapped[dict | None] = mapped_column(JSONB)

    # Partida por mes (migración 0019, PLAN-BACKEND §9): un mes viejo se archiva
    # quitando su partición. Las particiones las crea `python -m app.cli particiones`.
    __table_args__ = (
        Index("ix_reservas_eventos_momento_brin", "momento", postgresql_using="brin"),
        {"postgresql_partition_by": "RANGE (momento)"},
    )


class Outbox(Base):
    """Efectos hacia fuera, escritos en la MISMA transacción del cambio
    (PLAN-BACKEND §6.4). Celery los despacha (SSE en la fase 4, webhooks en la 6)."""

    __tablename__ = "outbox"
    id: Mapped[UUID] = mapped_column(primary_key=True, server_default=text("uuidv7()"))  # id del evento
    momento: Mapped[datetime] = mapped_column(server_default=func.now(), primary_key=True)  # partida por mes
    tipo: Mapped[str] = mapped_column(String(60))  # «reserva.creada», «pago.registrado»
    agregado: Mapped[str] = mapped_column(String(30))
    agregado_id: Mapped[UUID]
    propiedad_id: Mapped[UUID | None]
    datos: Mapped[dict] = mapped_column(JSONB)
    despachado_en: Mapped[datetime | None]
    intentos: Mapped[int] = mapped_column(server_default=text("0"))

    __table_args__ = (
        Index("ix_outbox_pendientes", "momento", postgresql_where=text("despachado_en IS NULL")),
        {"postgresql_partition_by": "RANGE (momento)"},
    )
