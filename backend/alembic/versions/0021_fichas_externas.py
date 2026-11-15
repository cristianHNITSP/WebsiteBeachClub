"""fichas de otras plataformas

Por qué: el hotel no quiere que su personal sincronice nada a mano. Las fichas del
hotel en otras plataformas (Booking, Hoteles.com, Expedia, Kayak, Facebook, Google
Maps) las lee el bot con cortesía (robots.txt, un pedido a la vez, un contacto) y
deja aquí las habitaciones que publican. Solo consulta; importar una habitación
es una acción del gerente. RLS por propiedad.

Revisión: 0021
Anterior: 0020
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

from app.migraciones import activar_rls, quitar_rls

revision: str = "0021"
down_revision: str | None = "0020"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "fichas_externas",
        sa.Column("id", sa.Uuid(), server_default=sa.text("uuidv7()"), nullable=False),
        sa.Column("propiedad_id", sa.Uuid(), nullable=False),
        sa.Column("canal", sa.String(length=10), nullable=False),
        sa.Column("url", sa.String(length=1000), nullable=False),
        sa.Column("estado", sa.String(length=20), server_default="pendiente", nullable=False),
        sa.Column("detalle", sa.String(length=300), nullable=True),
        sa.Column("titulo", sa.String(length=300), nullable=True),
        sa.Column("resumen", postgresql.JSONB(), server_default=sa.text("'{}'::jsonb"), nullable=False),
        sa.Column("cuartos", postgresql.JSONB(), server_default=sa.text("'[]'::jsonb"), nullable=False),
        sa.Column("leida_en", sa.DateTime(timezone=True), nullable=True),
        sa.Column("creado", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("creado_por", sa.Uuid(), nullable=True),
        sa.CheckConstraint(
            "canal IN ('booking', 'airbnb', 'expedia', 'vrbo', 'otro')", name=op.f("ck_fichas_externas_canal")
        ),
        sa.CheckConstraint(
            "estado IN ('pendiente', 'leida', 'sin_datos', 'bloqueada_robots', 'verificacion', 'error')",
            name=op.f("ck_fichas_externas_estado"),
        ),
        sa.CheckConstraint("url LIKE 'https://%'", name=op.f("ck_fichas_externas_https")),
        sa.ForeignKeyConstraint(
            ["creado_por"],
            ["usuarios.id"],
            name=op.f("fk_fichas_externas_creado_por_usuarios"),
            ondelete="RESTRICT",
        ),
        sa.ForeignKeyConstraint(
            ["propiedad_id"],
            ["propiedades.id"],
            name=op.f("fk_fichas_externas_propiedad_id_propiedades"),
            ondelete="RESTRICT",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_fichas_externas")),
        sa.UniqueConstraint("url", name="uq_fichas_externas_url"),
    )
    op.create_index(
        op.f("ix_fichas_externas_propiedad_id"), "fichas_externas", ["propiedad_id"], unique=False
    )
    activar_rls(op, "fichas_externas")


def downgrade() -> None:
    quitar_rls(op, "fichas_externas")
    op.drop_index(op.f("ix_fichas_externas_propiedad_id"), table_name="fichas_externas")
    op.drop_table("fichas_externas")
