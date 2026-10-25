"""Pruebas: siempre contra la base de PRUEBAS (beachclub_pruebas), nunca la de
desarrollo (BACKEND-COMO-TRABAJAMOS §4.2). Se fija ANTES de importar la app."""

import os
import tempfile

import pytest

if not os.environ.get("POSTGRES_DB_PRUEBAS"):
    raise RuntimeError("Falta POSTGRES_DB_PRUEBAS: las pruebas nunca corren contra la base de desarrollo")
os.environ["ENTORNO"] = "pruebas"
os.environ["POSTGRES_DB"] = os.environ["POSTGRES_DB_PRUEBAS"]
# Redis: su propia base (la 15), vaciada antes de cada prueba: los contadores de
# intentos y las sesiones revocadas no se cuelan de una prueba a otra.
# Fotos: una carpeta temporal propia de esta corrida (nunca la de desarrollo).
os.environ["FOTOS_DIR"] = tempfile.mkdtemp(prefix="fotos-pruebas-")
if os.environ.get("REDIS_URL"):
    os.environ["REDIS_URL"] = os.environ["REDIS_URL"].rsplit("/", 1)[0] + "/15"

from alembic import command
from alembic.config import Config as ConfigAlembic
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.conexion_redis import redis
from app.db import get_sesion, motor
from app.main import app


def alembic_cfg() -> ConfigAlembic:
    return ConfigAlembic(os.path.join(os.path.dirname(__file__), "..", "alembic.ini"))


@pytest.fixture(scope="session", autouse=True)
def base_migrada():
    """La base de pruebas, al día con todas las migraciones."""
    command.upgrade(alembic_cfg(), "head")
    yield


@pytest.fixture(autouse=True)
async def redis_limpio():
    await redis.flushdb()
    yield


@pytest.fixture
async def sesion():
    """Cada prueba dentro de una transacción que se REVIERTE al terminar: nada
    queda y las pruebas no se pisan los datos (lección de SIMDES)."""
    async with motor.connect() as conexion:
        trans = await conexion.begin()
        s = AsyncSession(bind=conexion, expire_on_commit=False, join_transaction_mode="create_savepoint")
        try:
            yield s
        finally:
            await s.close()
            await trans.rollback()


@pytest.fixture
async def cliente(sesion):
    async def _sesion_de_prueba():
        # Igual que get_sesion en producción: si la petición falla, lo que hizo se
        # DESHACE (salvo errores con confirmar=True). Sin esto, una prueba vería
        # cambios que en producción se pierden con el rollback (pasó: la
        # revocación por token reusado "funcionaba" solo en las pruebas).
        punto = await sesion.begin_nested()
        try:
            yield sesion
        except BaseException as e:
            await (punto.commit() if getattr(e, "confirmar", False) else punto.rollback())
            raise
        else:
            await punto.commit()

    app.dependency_overrides[get_sesion] = _sesion_de_prueba
    async with AsyncClient(transport=ASGITransport(app=app), base_url="https://prueba") as c:
        yield c
    app.dependency_overrides.clear()


def csrf(cliente, renovacion: bool = False) -> dict:
    """La cabecera de CSRF de doble envío, tomada de la cookie legible (como hace el panel)."""
    nombre = "frida_csrf_renovacion" if renovacion else "frida_csrf"
    return {"X-CSRF-TOKEN": cliente.cookies.get(nombre, "")}


def reemplazar_cookie(cliente, nombre: str, valor: str, ruta: str) -> None:
    """Pone (o cambia) una cookie en el cliente con el dominio que usa su jar (httpx
    guarda los hosts sin punto como `<host>.local`): simula conservar un token viejo."""
    dominio = next((c.domain for c in cliente.cookies.jar), "prueba.local")
    for c in [c for c in cliente.cookies.jar if c.name == nombre]:
        cliente.cookies.delete(nombre, domain=c.domain, path=c.path)
    cliente.cookies.set(nombre, valor, domain=dominio, path=ruta)


async def entrar_como(cliente, sesion, rol="gerente", propiedades=()):
    """Crea a alguien del personal y deja al cliente con su sesión (cookies). Devuelve el usuario."""
    from tests.fabricas import CLAVE, crear_usuario

    u = await crear_usuario(sesion, rol=rol, propiedades=propiedades)
    r = await cliente.post("/api/auth/entrar", json={"identificador": u.usuario, "clave": CLAVE})
    assert r.status_code == 200, r.text
    return u
