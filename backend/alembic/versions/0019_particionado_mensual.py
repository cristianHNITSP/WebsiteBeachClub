"""particionado mensual del historial y del outbox

Por qué: PLAN-BACKEND §9. `reservas_eventos` y `outbox` solo crecen; partidas por
mes de `momento`, consultar o archivar un mes no toca los demás (un mes viejo se
archiva con DETACH PARTITION). Postgres exige que la llave incluya `momento`:
pasa a (id, momento); los ids siguen siendo únicos porque los genera la base.
Las particiones las crea el dueño de las tablas (aquí y con `python -m app.cli
particiones` en cada despliegue), hasta 24 meses adelante, más una por omisión
para que ninguna inserción falle. La API no las toca directo (REVOKE ALL): entra
por la tabla padre, con sus permisos y su RLS; el historial sigue siendo de solo
inserción. `claves_idempotencia` NO se parte: la unicidad sería por partición y
un reintento que cruzara el fin de mes se ejecutaría dos veces.

Revisión: 0019
Anterior: 0018
"""

from collections.abc import Sequence
from datetime import date

from alembic import op
from psycopg import sql

from app.config import obtener_config
from app.migraciones import MESES_ADELANTE, activar_rls, crear_particiones, quitar_rls

revision: str = "0019"
down_revision: str | None = "0018"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

FKS_EVENTOS = """
    ALTER TABLE reservas_eventos
      ADD CONSTRAINT fk_reservas_eventos_reserva_id_reservas
        FOREIGN KEY (reserva_id) REFERENCES reservas(id) ON DELETE RESTRICT,
      ADD CONSTRAINT fk_reservas_eventos_propiedad_id_propiedades
        FOREIGN KEY (propiedad_id) REFERENCES propiedades(id) ON DELETE RESTRICT,
      ADD CONSTRAINT fk_reservas_eventos_usuario_id_usuarios
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE RESTRICT
"""


def _api(plantilla: str) -> None:
    conexion = op.get_bind().connection.dbapi_connection
    rol = sql.Identifier(obtener_config().api_db_usuario)
    op.execute(sql.SQL(plantilla).format(rol=rol).as_string(conexion))


def _apartar_vieja(tabla: str, indices: list[str]) -> None:
    """La tabla vieja cede su nombre y los de sus índices (son globales)."""
    op.execute(f"ALTER TABLE {tabla} RENAME TO {tabla}_vieja")
    op.execute(f"ALTER TABLE {tabla}_vieja RENAME CONSTRAINT pk_{tabla} TO pk_{tabla}_vieja")
    for i in indices:
        op.execute(f"ALTER INDEX {i} RENAME TO {i}_vieja")


def _particiones(tabla: str) -> None:
    conexion = op.get_bind().connection.dbapi_connection
    with conexion.cursor() as c:
        c.execute(sql.SQL("SELECT min(momento)::date FROM {}").format(sql.Identifier(f"{tabla}_vieja")))
        primero = c.fetchone()[0] or date.today()
    hoy = date.today()
    hasta = date(
        hoy.year + (hoy.month - 1 + MESES_ADELANTE) // 12, (hoy.month - 1 + MESES_ADELANTE) % 12 + 1, 1
    )
    crear_particiones(conexion, tabla, primero, hasta, obtener_config().api_db_usuario)


def upgrade() -> None:
    # ── reservas_eventos ──
    _apartar_vieja("reservas_eventos", ["ix_reservas_eventos_momento_brin", "ix_reservas_eventos_reserva_id"])
    op.execute(
        "CREATE TABLE reservas_eventos (LIKE reservas_eventos_vieja INCLUDING DEFAULTS INCLUDING IDENTITY)"
        " PARTITION BY RANGE (momento)"
    )
    op.execute("ALTER TABLE reservas_eventos ADD CONSTRAINT pk_reservas_eventos PRIMARY KEY (id, momento)")
    op.execute(FKS_EVENTOS)
    op.execute("CREATE INDEX ix_reservas_eventos_momento_brin ON reservas_eventos USING brin (momento)")
    op.execute("CREATE INDEX ix_reservas_eventos_reserva_id ON reservas_eventos (reserva_id)")
    _particiones("reservas_eventos")
    op.execute("INSERT INTO reservas_eventos OVERRIDING SYSTEM VALUE SELECT * FROM reservas_eventos_vieja")
    op.execute(
        "SELECT setval(pg_get_serial_sequence('reservas_eventos', 'id'), coalesce(max(id), 0) + 1, false)"
        " FROM reservas_eventos"
    )
    op.execute("DROP TABLE reservas_eventos_vieja")
    activar_rls(op, "reservas_eventos")
    _api("REVOKE UPDATE, DELETE, TRUNCATE ON reservas_eventos FROM {rol}")  # historial: solo se añade

    # ── outbox ──
    _apartar_vieja("outbox", ["ix_outbox_pendientes"])
    op.execute("CREATE TABLE outbox (LIKE outbox_vieja INCLUDING DEFAULTS) PARTITION BY RANGE (momento)")
    op.execute("ALTER TABLE outbox ADD CONSTRAINT pk_outbox PRIMARY KEY (id, momento)")
    op.execute("CREATE INDEX ix_outbox_pendientes ON outbox (momento) WHERE despachado_en IS NULL")
    _particiones("outbox")
    op.execute("INSERT INTO outbox SELECT * FROM outbox_vieja")
    op.execute("DROP TABLE outbox_vieja")


def downgrade() -> None:
    for tabla, indices in (
        ("reservas_eventos", ["ix_reservas_eventos_momento_brin", "ix_reservas_eventos_reserva_id"]),
        ("outbox", ["ix_outbox_pendientes"]),
    ):
        op.execute(f"ALTER TABLE {tabla} RENAME TO {tabla}_partida")
        op.execute(f"ALTER TABLE {tabla}_partida RENAME CONSTRAINT pk_{tabla} TO pk_{tabla}_partida")
        for i in indices:
            op.execute(f"ALTER INDEX {i} RENAME TO {i}_partida")
    quitar_rls(op, "reservas_eventos_partida")
    op.execute(
        "CREATE TABLE reservas_eventos (LIKE reservas_eventos_partida INCLUDING DEFAULTS INCLUDING IDENTITY)"
    )
    op.execute("ALTER TABLE reservas_eventos ADD CONSTRAINT pk_reservas_eventos PRIMARY KEY (id)")
    op.execute(FKS_EVENTOS)
    op.execute("CREATE INDEX ix_reservas_eventos_momento_brin ON reservas_eventos USING brin (momento)")
    op.execute("CREATE INDEX ix_reservas_eventos_reserva_id ON reservas_eventos (reserva_id)")
    op.execute("INSERT INTO reservas_eventos OVERRIDING SYSTEM VALUE SELECT * FROM reservas_eventos_partida")
    op.execute(
        "SELECT setval(pg_get_serial_sequence('reservas_eventos', 'id'), coalesce(max(id), 0) + 1, false)"
        " FROM reservas_eventos"
    )
    op.execute("DROP TABLE reservas_eventos_partida")
    activar_rls(op, "reservas_eventos")
    _api("REVOKE UPDATE, DELETE, TRUNCATE ON reservas_eventos FROM {rol}")

    op.execute("CREATE TABLE outbox (LIKE outbox_partida INCLUDING DEFAULTS)")
    op.execute("ALTER TABLE outbox ADD CONSTRAINT pk_outbox PRIMARY KEY (id)")
    op.execute("CREATE INDEX ix_outbox_pendientes ON outbox (momento) WHERE despachado_en IS NULL")
    op.execute("INSERT INTO outbox SELECT * FROM outbox_partida")
    op.execute("DROP TABLE outbox_partida")
