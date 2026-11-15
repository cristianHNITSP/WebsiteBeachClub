"""rol dueño: ve las dos propiedades y la auditoría; el gerente, solo sus propiedades

Por qué: hay gente que solo trabaja en Casa Frida o en Cabañas Frida. El gerente ahora ve
únicamente las propiedades que se le asignan (una o las dos) y ya no ve la auditoría. El dueño
(rol nuevo) ve todo y es el único que da de alta o cambia a gerentes y dueños (permiso nuevo
`personal.gerentes`). Para que nadie pierda acceso, los gerentes que ya existían pasan a dueño.

Idempotente con una base nueva: la 0002 ya siembra todo esto desde app/semillas.py.

Revisión: 0025
Anterior: 0024
"""

from collections.abc import Sequence

from alembic import op

revision: str = "0025"
down_revision: str | None = "0024"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute(
        "INSERT INTO roles (id, clave, nombre, es_personal) VALUES (5, 'dueno', 'Dueño', true)"
        " ON CONFLICT DO NOTHING"
    )
    op.execute(
        "INSERT INTO permisos (id, clave, modulo, descripcion) VALUES"
        " (19, 'personal.gerentes', 'usuarios', 'Dar de alta y cambiar a gerentes y dueños') ON CONFLICT DO NOTHING"
    )
    op.execute(
        "INSERT INTO roles_permisos (rol_id, permiso_id) SELECT r.id, p.id FROM roles r, permisos p"
        " WHERE r.clave = 'dueno' ON CONFLICT DO NOTHING"
    )
    # Los gerentes de hoy tenían todo: pasan a dueño (nadie pierde acceso).
    op.execute(
        "UPDATE usuarios SET rol_id = (SELECT id FROM roles WHERE clave = 'dueno')"
        " WHERE rol_id = (SELECT id FROM roles WHERE clave = 'gerente')"
    )
    op.execute(
        "DELETE FROM roles_permisos WHERE rol_id = (SELECT id FROM roles WHERE clave = 'gerente')"
        " AND permiso_id IN (SELECT id FROM permisos"
        " WHERE clave IN ('propiedades.todas', 'auditoria.ver', 'personal.gerentes'))"
    )


def downgrade() -> None:
    op.execute(
        "INSERT INTO roles_permisos (rol_id, permiso_id) SELECT r.id, p.id FROM roles r, permisos p"
        " WHERE r.clave = 'gerente' AND p.clave IN ('propiedades.todas', 'auditoria.ver') ON CONFLICT DO NOTHING"
    )
    op.execute(
        "UPDATE usuarios SET rol_id = (SELECT id FROM roles WHERE clave = 'gerente')"
        " WHERE rol_id = (SELECT id FROM roles WHERE clave = 'dueno')"
    )
    op.execute("DELETE FROM roles_permisos WHERE permiso_id = 19")
    op.execute("DELETE FROM permisos WHERE id = 19")
    op.execute("DELETE FROM roles WHERE clave = 'dueno'")
