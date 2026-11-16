"""permiso propiedades.gestionar: solo el dueño da de alta y edita propiedades

Por qué: el dueño necesita sumar sucursales desde el panel (antes solo había las dos de la
semilla). Idempotente con una base nueva: la 0002 ya lo siembra desde app/semillas.py.

Revisión: 0027
Anterior: 0026
"""

from collections.abc import Sequence

from alembic import op

revision: str = "0027"
down_revision: str | None = "0026"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute(
        "INSERT INTO permisos (id, clave, modulo, descripcion) VALUES"
        " (20, 'propiedades.gestionar', 'propiedades', 'Dar de alta y editar propiedades') ON CONFLICT DO NOTHING"
    )
    op.execute(
        "INSERT INTO roles_permisos (rol_id, permiso_id) SELECT r.id, 20 FROM roles r"
        " WHERE r.clave = 'dueno' ON CONFLICT DO NOTHING"
    )


def downgrade() -> None:
    op.execute("DELETE FROM roles_permisos WHERE permiso_id = 20")
    op.execute("DELETE FROM permisos WHERE id = 20")
