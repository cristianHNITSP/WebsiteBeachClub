"""Las migraciones bajan y suben limpias, y el usuario de la API tiene el
privilegio mínimo (PLAN-BACKEND §17.2)."""

import pytest
from alembic import command
from sqlalchemy import text
from sqlalchemy.exc import ProgrammingError

from app.db import motor
from tests.conftest import alembic_cfg


def test_bajar_y_subir_todo():
    command.downgrade(alembic_cfg(), "base")
    command.upgrade(alembic_cfg(), "head")


async def test_postgres_trae_uuidv7_y_extensiones():
    async with motor.connect() as c:
        version = (await c.execute(text("SELECT uuid_extract_version(uuidv7())"))).scalar_one()
        extensiones = set((await c.execute(text("SELECT extname FROM pg_extension"))).scalars())
    assert version == 7
    assert {"btree_gist", "citext"} <= extensiones


async def test_la_api_no_puede_crear_ni_alterar_tablas():
    async with motor.connect() as c:
        with pytest.raises(ProgrammingError, match="permission denied"):
            await c.execute(text("CREATE TABLE intrusa (id int)"))
