"""estado "leyendo" de las fichas

Por qué: el panel muestra el escaneo en vivo; mientras el bot lee una ficha, esta queda
en "leyendo" y su `detalle` dice la fase real (permiso, descarga, lectura).

Revisión: 0022
Anterior: 0021
"""

from collections.abc import Sequence

from alembic import op

revision: str = "0022"
down_revision: str | None = "0021"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

NUEVO = (
    "estado IN ('pendiente', 'leyendo', 'leida', 'sin_datos', 'bloqueada_robots', 'verificacion', 'error')"
)
VIEJO = "estado IN ('pendiente', 'leida', 'sin_datos', 'bloqueada_robots', 'verificacion', 'error')"


def upgrade() -> None:
    op.drop_constraint(op.f("ck_fichas_externas_estado"), "fichas_externas", type_="check")
    op.create_check_constraint(op.f("ck_fichas_externas_estado"), "fichas_externas", NUEVO)


def downgrade() -> None:
    op.execute("UPDATE fichas_externas SET estado = 'pendiente' WHERE estado = 'leyendo'")
    op.drop_constraint(op.f("ck_fichas_externas_estado"), "fichas_externas", type_="check")
    op.create_check_constraint(op.f("ck_fichas_externas_estado"), "fichas_externas", VIEJO)
