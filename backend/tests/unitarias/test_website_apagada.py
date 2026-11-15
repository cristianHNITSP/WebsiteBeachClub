"""La website está apagada por omisión: sin API_PUBLICA_ACTIVA no existe ni /api/v1 ni la
gestión de sitios web, y el programador no atiende sus tareas. El código sigue ahí."""

import httpx
import pytest

from app.config import obtener_config


@pytest.fixture
def sin_website(monkeypatch):
    monkeypatch.setenv("API_PUBLICA_ACTIVA", "false")
    obtener_config.cache_clear()
    yield
    monkeypatch.undo()
    obtener_config.cache_clear()


async def test_apagada_no_monta_la_api_publica_ni_los_sitios(sin_website):
    from app.main import crear_app

    app = crear_app()
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://prueba") as c:
        assert (await c.get("/api/v1/habitaciones")).status_code == 404
        assert (await c.get("/api/admin/sitios")).status_code == 404
        assert (await c.get("/api/health")).status_code == 200  # lo demás sigue en pie
