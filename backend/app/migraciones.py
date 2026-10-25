"""Piezas que repiten las migraciones. Solo nombres de tabla fijos del código
(nunca datos de fuera): por eso se arman como texto."""

import re

# Acceso por propiedad en la base (PLAN-BACKEND §11.1): CASE y no OR, porque SQL
# no garantiza el orden de un OR y '*' no es un uuid (BACKEND-ARQUITECTURA §6).
_POLITICA = """
CREATE POLICY por_propiedad ON {tabla} USING (
    CASE current_setting('app.propiedades', true)
        WHEN '*' THEN true
        ELSE propiedad_id = ANY (
            string_to_array(NULLIF(current_setting('app.propiedades', true), ''), ',')::uuid[]
        )
    END
)"""


def activar_rls(op, tabla: str, *, nulos_para_todos: bool = False) -> None:
    """`nulos_para_todos`: las filas sin propiedad (p. ej. un aviso general) las
    ve cualquiera con sesión; las demás, solo quien tiene esa propiedad."""
    op.execute(f"ALTER TABLE {tabla} ENABLE ROW LEVEL SECURITY")
    politica = _POLITICA.format(tabla=tabla)
    if nulos_para_todos:
        politica = politica.replace("USING (\n", "USING (propiedad_id IS NULL OR\n", 1)
    op.execute(politica)


def quitar_rls(op, tabla: str) -> None:
    op.execute(f"DROP POLICY IF EXISTS por_propiedad ON {tabla}")


# ── Particionado mensual (PLAN-BACKEND §9) ──
# Tablas que solo crecen, por mes de `momento`. `claves_idempotencia` NO: Postgres
# solo garantiza unicidad dentro de cada partición, y un reintento que cruzara
# el fin de mes ejecutaría dos veces (además ya se vacía a los 7 días).
PARTICIONADAS = ("reservas_eventos", "outbox")
MESES_ADELANTE = 24


def nombre_particion(tabla: str, anio: int, mes: int) -> str:
    return f"{tabla}_{anio:04d}_{mes:02d}"


_PARTICION = re.compile(rf"^({'|'.join(PARTICIONADAS)})_(\d{{4}}_\d{{2}}|por_defecto)$")


def es_particion(nombre: str) -> bool:
    """Para que `alembic check` no las tome por tablas que sobran."""
    return bool(_PARTICION.match(nombre))


def _meses(desde, hasta):
    anio, mes = desde.year, desde.month
    while (anio, mes) <= (hasta.year, hasta.month):
        yield anio, mes
        anio, mes = (anio + 1, 1) if mes == 12 else (anio, mes + 1)


def crear_particiones(conexion, tabla: str, desde, hasta, rol_api: str) -> int:
    """Una partición por mes de [desde, hasta], más la de por omisión (red de
    seguridad: ninguna inserción falla si un mes no se creó a tiempo).
    Idempotente. `conexion`: la de psycopg del DUEÑO de las tablas (la API no
    puede crear tablas). La API no toca las particiones directo: REVOKE ALL, así
    solo entra por la tabla padre, con sus permisos y su RLS."""
    from psycopg import sql

    if tabla not in PARTICIONADAS:
        raise ValueError(tabla)
    creadas = 0
    with conexion.cursor() as c:
        for anio, mes in _meses(desde, hasta):
            nombre = nombre_particion(tabla, anio, mes)
            c.execute("SELECT to_regclass(%s)", (nombre,))
            if c.fetchone()[0] is not None:
                continue
            fin = (anio + 1, 1) if mes == 12 else (anio, mes + 1)
            c.execute(
                sql.SQL("CREATE TABLE {} PARTITION OF {} FOR VALUES FROM ({}) TO ({})").format(
                    sql.Identifier(nombre),
                    sql.Identifier(tabla),
                    sql.Literal(f"{anio:04d}-{mes:02d}-01"),
                    sql.Literal(f"{fin[0]:04d}-{fin[1]:02d}-01"),
                )
            )
            c.execute(
                sql.SQL("REVOKE ALL ON {} FROM {}").format(sql.Identifier(nombre), sql.Identifier(rol_api))
            )
            creadas += 1
        defecto = f"{tabla}_por_defecto"
        c.execute("SELECT to_regclass(%s)", (defecto,))
        if c.fetchone()[0] is None:
            c.execute(
                sql.SQL("CREATE TABLE {} PARTITION OF {} DEFAULT").format(
                    sql.Identifier(defecto), sql.Identifier(tabla)
                )
            )
            c.execute(
                sql.SQL("REVOKE ALL ON {} FROM {}").format(sql.Identifier(defecto), sql.Identifier(rol_api))
            )
    return creadas
