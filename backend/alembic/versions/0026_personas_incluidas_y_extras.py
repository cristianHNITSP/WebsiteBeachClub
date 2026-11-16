"""personas que cubre la tarifa y extra por noche de quien va de más

Por qué: los menores pagan distinto (decisión del hotel, 2026-11-15). Cada habitación dice cuántos
adultos y menores cubre su tarifa, y cuánto paga por noche cada adulto y cada menor de más. Un
lugar de adulto que no se usa lo ocupan hasta 2 menores sin costo (servicios/tarifas.py).

Las habitaciones que ya existían quedan con adultos incluidos = su capacidad y extras en cero:
ninguna cambia de precio hasta que el hotel lo configure.

Revisión: 0026
Anterior: 0025
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0026"
down_revision: str | None = "0025"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "habitaciones", sa.Column("adultos_incluidos", sa.SmallInteger(), server_default="2", nullable=False)
    )
    op.add_column(
        "habitaciones", sa.Column("menores_incluidos", sa.SmallInteger(), server_default="0", nullable=False)
    )
    op.add_column(
        "habitaciones",
        sa.Column("extra_adulto_centavos", sa.BigInteger(), server_default="0", nullable=False),
    )
    op.add_column(
        "habitaciones", sa.Column("extra_menor_centavos", sa.BigInteger(), server_default="0", nullable=False)
    )
    op.execute("UPDATE habitaciones SET adultos_incluidos = capacidad")  # nadie cambia de precio
    op.create_check_constraint(
        "ck_habitaciones_incluidos", "habitaciones",
        "adultos_incluidos BETWEEN 1 AND 20 AND menores_incluidos BETWEEN 0 AND 20",
    )  # fmt: skip
    op.create_check_constraint(
        "ck_habitaciones_extras", "habitaciones", "extra_adulto_centavos >= 0 AND extra_menor_centavos >= 0"
    )


def downgrade() -> None:
    op.drop_constraint("ck_habitaciones_extras", "habitaciones", type_="check")
    op.drop_constraint("ck_habitaciones_incluidos", "habitaciones", type_="check")
    for c in ("extra_menor_centavos", "extra_adulto_centavos", "menores_incluidos", "adultos_incluidos"):
        op.drop_column("habitaciones", c)
