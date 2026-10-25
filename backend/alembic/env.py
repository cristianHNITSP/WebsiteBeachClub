"""Alembic corre con el usuario de MIGRACIONES (dueño de las tablas), nunca con
el de la API, que solo lee y escribe filas (PLAN-BACKEND §17.2)."""

from logging.config import fileConfig

from alembic import context
from sqlalchemy import create_engine, pool

from app.config import obtener_config
from app.migraciones import es_particion
from app.modelos import Base

if context.config.config_file_name is not None:
    fileConfig(context.config.config_file_name)

target_metadata = Base.metadata


def _incluir(objeto, nombre, tipo, reflejado, _comparado) -> bool:
    """Las particiones mensuales (§9) no están en los modelos: no son tablas que sobren."""
    return not (tipo == "table" and reflejado and es_particion(nombre))


def run_migrations_offline() -> None:
    context.configure(
        url=obtener_config().url_migraciones().render_as_string(hide_password=False),
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    motor = create_engine(obtener_config().url_migraciones(), poolclass=pool.NullPool)
    with motor.connect() as conexion:
        context.configure(
            connection=conexion, target_metadata=target_metadata, compare_type=True, include_object=_incluir
        )
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
