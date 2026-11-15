"""las reservas de otras plataformas entran al calendario del motor, con su fuente

Por qué: la recepción necesita VER en la Línea de tiempo lo que Booking, Airbnb y compañía ya
vendieron (y marcar su llegada y salida), sin poder editarlo: la plataforma es la dueña del dato.
`reservas.fuente` dice de dónde vino ('motor' = hecha en el panel) y `externa_id` la enlaza a su
fila de `reservas_externas` (una sola, para no duplicar al releer el iCal). Además cada habitación
dice si se vende en línea: a esas se asignan las reservas de fuera; las demás son solo de recepción.

Revisión: 0024
Anterior: 0023
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0024"
down_revision: str | None = "0023"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

FUENTES = ("motor", "booking", "airbnb", "expedia", "vrbo", "otro")


def upgrade() -> None:
    op.add_column(
        "habitaciones", sa.Column("venta_en_linea", sa.Boolean(), server_default=sa.false(), nullable=False)
    )
    op.add_column(
        "reservas", sa.Column("fuente", sa.String(length=10), server_default="motor", nullable=False)
    )
    op.add_column("reservas", sa.Column("externa_id", sa.Uuid(), nullable=True))
    op.create_check_constraint("ck_reservas_fuente", "reservas", f"fuente IN {FUENTES}")
    op.create_foreign_key(
        "fk_reservas_externa_id_reservas_externas", "reservas", "reservas_externas",
        ["externa_id"], ["id"], ondelete="SET NULL",
    )  # fmt: skip
    op.create_unique_constraint("uq_reservas_externa_id", "reservas", ["externa_id"])


def downgrade() -> None:
    op.drop_constraint("uq_reservas_externa_id", "reservas", type_="unique")
    op.drop_constraint("fk_reservas_externa_id_reservas_externas", "reservas", type_="foreignkey")
    op.drop_constraint("ck_reservas_fuente", "reservas", type_="check")
    op.drop_column("reservas", "externa_id")
    op.drop_column("reservas", "fuente")
    op.drop_column("habitaciones", "venta_en_linea")
