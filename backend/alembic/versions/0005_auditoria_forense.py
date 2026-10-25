"""auditoria forense

Por qué: el usuario pidió que absolutamente todo sea auditable y sirva para
informática forense (2026-10-11). La auditoría pasa a ser EVIDENCIA:

- Cadena de hashes: cada fila guarda el SHA-256 de la anterior y el suyo. Lo
  calcula Postgres en un trigger (`auditoria_encadenar`), junto con
  `secuencia` (sin huecos) y `momento` (clock_timestamp(), la hora real de la
  inserción): la aplicación no puede elegirlos. Un candado (advisory lock)
  hace que se encadene una fila a la vez, así la cadena nunca se bifurca.
- La huella se calcula en UN lugar (`auditoria_huella`) sobre un arreglo JSONB
  (escapado sin ambigüedad), y `auditoria_verificar(desde)` recorre la cadena y
  devuelve el primer eslabón roto: alterar, borrar o colar una fila se detecta.
- Solo se añade: un trigger rechaza UPDATE, DELETE y TRUNCATE para todos (la
  API y el dueño de la tabla), y además se le quitan esos permisos a la API.
- Contexto completo: navegador (`agente`), sesión del panel (`sesion_id`) y
  solicitud (`solicitud_id`, el mismo X-Solicitud-Id de la respuesta y del
  registro de acceso).
- `usuario_id` pasa de SET NULL a RESTRICT: un SET NULL modificaría la
  evidencia (y el personal nunca se borra: lápida).
- Las filas que ya existían se encadenan en orden de id, con su momento original.

Revisión: 0005
Anterior: 0004
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from psycopg import sql

from app.config import obtener_config

revision: str = "0005"
down_revision: str | None = "0004"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

HUELLA = """
CREATE FUNCTION auditoria_huella(a auditoria) RETURNS text LANGUAGE sql STABLE AS $$
  SELECT encode(sha256(convert_to(jsonb_build_array(
      a.secuencia, a.hash_anterior,
      to_char(a.momento AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
      a.usuario_id, a.accion, a.entidad, a.entidad_id, a.antes, a.despues,
      a.ip, a.agente, a.sesion_id, a.solicitud_id
  )::text, 'UTF8')), 'hex')
$$"""

ENCADENAR = """
CREATE FUNCTION auditoria_encadenar() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE previa record;
BEGIN
  -- Una inserción a la vez (hasta el COMMIT): la cadena nunca se bifurca.
  PERFORM pg_advisory_xact_lock(hashtext('frida.auditoria'));
  SELECT secuencia, hash INTO previa FROM auditoria ORDER BY secuencia DESC LIMIT 1;
  NEW.secuencia := COALESCE(previa.secuencia, 0) + 1;
  NEW.hash_anterior := COALESCE(previa.hash, repeat('0', 64));
  NEW.momento := clock_timestamp();
  NEW.hash := auditoria_huella(NEW);
  RETURN NEW;
END $$"""

INMUTABLE = """
CREATE FUNCTION auditoria_inmutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'La auditoría solo admite inserciones (%)', TG_OP USING ERRCODE = 'insufficient_privilege';
END $$"""

VERIFICAR = """
CREATE FUNCTION auditoria_verificar(desde bigint DEFAULT 1)
RETURNS TABLE (revisadas bigint, primera_rota bigint, ultimo_hash text) LANGUAGE plpgsql STABLE AS $$
DECLARE r auditoria; previo text; esperada bigint := desde;
BEGIN
  revisadas := 0;
  IF desde > 1 THEN
    SELECT hash INTO previo FROM auditoria WHERE secuencia = desde - 1;
  END IF;
  previo := COALESCE(previo, repeat('0', 64));
  FOR r IN SELECT * FROM auditoria WHERE secuencia >= desde ORDER BY secuencia LOOP
    IF r.secuencia <> esperada OR r.hash_anterior <> previo OR r.hash <> auditoria_huella(r) THEN
      primera_rota := COALESCE(LEAST(r.secuencia, esperada), r.secuencia);
      ultimo_hash := previo;
      RETURN NEXT;
      RETURN;
    END IF;
    previo := r.hash; esperada := esperada + 1; revisadas := revisadas + 1;
  END LOOP;
  primera_rota := NULL; ultimo_hash := previo;
  RETURN NEXT;
END $$"""

RELLENAR = """
DO $$
DECLARE fila record; previo text := repeat('0', 64); n bigint := 0;
BEGIN
  FOR fila IN SELECT id FROM auditoria ORDER BY id LOOP
    n := n + 1;
    UPDATE auditoria SET secuencia = n, hash_anterior = previo WHERE id = fila.id;
    UPDATE auditoria a SET hash = auditoria_huella(a) WHERE a.id = fila.id RETURNING a.hash INTO previo;
  END LOOP;
END $$"""


def _al_usuario_api(plantilla: str) -> None:
    conexion = op.get_bind().connection.dbapi_connection
    rol = sql.Identifier(obtener_config().api_db_usuario)
    op.execute(sql.SQL(plantilla).format(rol=rol).as_string(conexion))


def upgrade() -> None:
    for col in (
        sa.Column("secuencia", sa.BigInteger(), nullable=True),
        sa.Column("agente", sa.String(length=300), nullable=True),
        sa.Column("sesion_id", sa.Uuid(), nullable=True),
        sa.Column("solicitud_id", sa.Uuid(), nullable=True),
        sa.Column("hash_anterior", sa.String(length=64), nullable=True),
        sa.Column("hash", sa.String(length=64), nullable=True),
    ):
        op.add_column("auditoria", col)
    op.execute(HUELLA)
    op.execute(RELLENAR)
    for col in ("secuencia", "hash_anterior", "hash"):
        op.alter_column("auditoria", col, nullable=False)
    op.create_unique_constraint(op.f("uq_auditoria_secuencia"), "auditoria", ["secuencia"])
    op.create_index("ix_auditoria_entidad", "auditoria", ["entidad", "entidad_id"], unique=False)
    op.create_index("ix_auditoria_usuario_id", "auditoria", ["usuario_id"], unique=False)
    op.drop_constraint(op.f("fk_auditoria_usuario_id_usuarios"), "auditoria", type_="foreignkey")
    op.create_foreign_key(
        op.f("fk_auditoria_usuario_id_usuarios"),
        "auditoria",
        "usuarios",
        ["usuario_id"],
        ["id"],
        ondelete="RESTRICT",
    )

    op.execute(ENCADENAR)
    op.execute(INMUTABLE)
    op.execute(VERIFICAR)
    op.execute(
        "CREATE TRIGGER auditoria_encadenar BEFORE INSERT ON auditoria "
        "FOR EACH ROW EXECUTE FUNCTION auditoria_encadenar()"
    )
    op.execute(
        "CREATE TRIGGER auditoria_sin_cambios BEFORE UPDATE OR DELETE ON auditoria "
        "FOR EACH ROW EXECUTE FUNCTION auditoria_inmutable()"
    )
    op.execute(
        "CREATE TRIGGER auditoria_sin_vaciar BEFORE TRUNCATE ON auditoria "
        "FOR EACH STATEMENT EXECUTE FUNCTION auditoria_inmutable()"
    )
    _al_usuario_api("REVOKE UPDATE, DELETE, TRUNCATE ON auditoria FROM {rol}")


def downgrade() -> None:
    _al_usuario_api("GRANT UPDATE, DELETE ON auditoria TO {rol}")
    op.execute("DROP TRIGGER auditoria_sin_vaciar ON auditoria")
    op.execute("DROP TRIGGER auditoria_sin_cambios ON auditoria")
    op.execute("DROP TRIGGER auditoria_encadenar ON auditoria")
    op.execute("DROP FUNCTION auditoria_verificar(bigint)")
    op.execute("DROP FUNCTION auditoria_inmutable()")
    op.execute("DROP FUNCTION auditoria_encadenar()")
    op.drop_constraint(op.f("fk_auditoria_usuario_id_usuarios"), "auditoria", type_="foreignkey")
    op.create_foreign_key(
        op.f("fk_auditoria_usuario_id_usuarios"),
        "auditoria",
        "usuarios",
        ["usuario_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.drop_index("ix_auditoria_usuario_id", table_name="auditoria")
    op.drop_index("ix_auditoria_entidad", table_name="auditoria")
    op.drop_constraint(op.f("uq_auditoria_secuencia"), "auditoria", type_="unique")
    op.execute("DROP FUNCTION auditoria_huella(auditoria)")
    for col in ("hash", "hash_anterior", "solicitud_id", "sesion_id", "agente", "secuencia"):
        op.drop_column("auditoria", col)
