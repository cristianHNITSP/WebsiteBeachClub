"""Base: extensiones y permisos del usuario de la API.

Por qué:
- uuidv7(): todas las llaves primarias (PLAN-BACKEND §7). Viene con
  PostgreSQL 18; si la base es más vieja, esta migración falla AQUÍ, con un
  mensaje claro, y no a mitad de la siguiente.
- btree_gist: la restricción de exclusión `sin_choque` (PLAN-BACKEND §6.2),
  que impide dos reservas activas cruzadas en la misma habitación.
- citext: usuario y correo únicos sin distinguir mayúsculas
  (BACKEND-USUARIOS-Y-PERMISOS §2).
- Privilegio mínimo (PLAN-BACKEND §17.2): el usuario de la API solo puede
  leer y escribir FILAS de las tablas que creen las migraciones; no puede
  crear, alterar ni borrar tablas. Las migraciones corren con otro usuario.

Revisión: 0001
Anterior: (ninguna)
"""

from collections.abc import Sequence

from alembic import op
from psycopg import sql

from app.config import obtener_config

revision: str = "0001"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def _usuario_api() -> str:
    """Nombre del usuario de la API (API_DB_USUARIO; config.py ya lo valida como
    identificador simple). Además se cita con sql.Identifier al usarlo."""
    return obtener_config().api_db_usuario


def _al_usuario_api(plantilla: str) -> None:
    """Ejecuta una sentencia con el nombre del rol citado por psycopg
    (`sql.Identifier`): los nombres de rol no pueden ir como parámetro, así que
    nunca se pegan a mano en el SQL (PLAN-BACKEND §17.2)."""
    conexion = op.get_bind().connection.dbapi_connection
    op.execute(sql.SQL(plantilla).format(rol=sql.Identifier(_usuario_api())).as_string(conexion))


def upgrade() -> None:
    op.execute("SELECT uuidv7()")
    op.execute("CREATE EXTENSION IF NOT EXISTS btree_gist")
    op.execute("CREATE EXTENSION IF NOT EXISTS citext")
    _al_usuario_api("GRANT USAGE ON SCHEMA public TO {rol}")
    _al_usuario_api(
        "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO {rol}"
    )
    _al_usuario_api("ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO {rol}")


def downgrade() -> None:
    _al_usuario_api("ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE USAGE, SELECT ON SEQUENCES FROM {rol}")
    _al_usuario_api(
        "ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE SELECT, INSERT, UPDATE, DELETE ON TABLES FROM {rol}"
    )
    _al_usuario_api("REVOKE USAGE ON SCHEMA public FROM {rol}")
    op.execute("DROP EXTENSION IF EXISTS citext")
    op.execute("DROP EXTENSION IF EXISTS btree_gist")
