"""los calendarios de otras plataformas cuelgan de lo que la plataforma publica

Por qué: habitaciones y reservas son del motor; las plataformas son un añadido y NO son espejo
(publican a su manera y solo lo que se vende en línea). El iCal ya no cuelga de una habitación
del motor: cuelga de una PUBLICACIÓN de una ficha («Hoteles.com: Cabaña estándar, 20 m²…»).
Se quitan `habitacion_id` de calendarios y reservas externas, y con ello el aviso de «posible
doble venta» (comparaba contra habitaciones del motor). Los calendarios ya conectados se
descartan (se vuelven a vincular a su publicación); las reservas externas ya leídas se conservan.

Revisión: 0023
Anterior: 0022
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0023"
down_revision: str | None = "0022"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute("DELETE FROM calendarios_externos")  # sus reservas quedan (calendario_id SET NULL)
    op.drop_constraint(
        "fk_calendarios_externos_habitacion_propiedad", "calendarios_externos", type_="foreignkey"
    )
    op.drop_constraint("uq_calendarios_externos_habitacion_id_canal", "calendarios_externos", type_="unique")
    op.drop_column("calendarios_externos", "habitacion_id")
    op.add_column("calendarios_externos", sa.Column("ficha_id", sa.Uuid(), nullable=False))
    op.add_column("calendarios_externos", sa.Column("publicacion", sa.String(length=200), nullable=False))
    op.create_foreign_key(
        "fk_calendarios_externos_ficha_id_fichas_externas", "calendarios_externos", "fichas_externas",
        ["ficha_id"], ["id"], ondelete="CASCADE",
    )  # fmt: skip
    op.create_unique_constraint(
        "uq_calendarios_externos_ficha_id_publicacion", "calendarios_externos", ["ficha_id", "publicacion"]
    )
    op.create_index("ix_calendarios_externos_ficha_id", "calendarios_externos", ["ficha_id"])

    op.drop_index(
        "ix_reservas_externas_habitacion_estancia", table_name="reservas_externas", postgresql_using="gist"
    )
    op.drop_constraint(
        "fk_reservas_externas_habitacion_id_habitaciones", "reservas_externas", type_="foreignkey"
    )
    op.drop_column("reservas_externas", "habitacion_id")


def downgrade() -> None:
    op.add_column("reservas_externas", sa.Column("habitacion_id", sa.Uuid(), nullable=True))
    op.create_foreign_key(
        "fk_reservas_externas_habitacion_id_habitaciones", "reservas_externas", "habitaciones",
        ["habitacion_id"], ["id"], ondelete="RESTRICT",
    )  # fmt: skip
    op.create_index(
        "ix_reservas_externas_habitacion_estancia", "reservas_externas", ["habitacion_id", "estancia"],
        postgresql_using="gist",
    )  # fmt: skip
    op.execute("DELETE FROM calendarios_externos")
    op.drop_index("ix_calendarios_externos_ficha_id", table_name="calendarios_externos")
    op.drop_constraint("uq_calendarios_externos_ficha_id_publicacion", "calendarios_externos", type_="unique")
    op.drop_constraint(
        "fk_calendarios_externos_ficha_id_fichas_externas", "calendarios_externos", type_="foreignkey"
    )
    op.drop_column("calendarios_externos", "publicacion")
    op.drop_column("calendarios_externos", "ficha_id")
    op.add_column("calendarios_externos", sa.Column("habitacion_id", sa.Uuid(), nullable=False))
    op.create_foreign_key(
        "fk_calendarios_externos_habitacion_propiedad", "calendarios_externos", "habitaciones",
        ["habitacion_id", "propiedad_id"], ["id", "propiedad_id"], ondelete="RESTRICT",
    )  # fmt: skip
    op.create_unique_constraint(
        "uq_calendarios_externos_habitacion_id_canal", "calendarios_externos", ["habitacion_id", "canal"]
    )
