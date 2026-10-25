"""fotos heic

Por qué: aceptar las fotos HEIC de iPhone (pendiente de la fase 3d, aprobado
2026-10-11). Se vuelven a codificar a WebP igual que las demás; aquí solo se
amplía el CHECK del formato original guardado.

Revisión: 0011
Anterior: 0010
"""

from collections.abc import Sequence

from alembic import op

revision: str = "0011"
down_revision: str | None = "0010"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.drop_constraint(op.f("ck_fotos_formato"), "fotos", type_="check")
    op.create_check_constraint(
        op.f("ck_fotos_formato"), "fotos", "formato_original IN ('JPEG', 'PNG', 'WEBP', 'HEIF')"
    )


def downgrade() -> None:
    op.drop_constraint(op.f("ck_fotos_formato"), "fotos", type_="check")
    op.create_check_constraint(
        op.f("ck_fotos_formato"), "fotos", "formato_original IN ('JPEG', 'PNG', 'WEBP')"
    )
