"""Permisos y política de contraseñas, sin base de datos."""

from uuid import uuid7

import pytest
from fastapi import Depends, FastAPI
from httpx import ASGITransport, AsyncClient

from app import errores
from app.auth.claves import problema_de_clave
from app.auth.dependencias import Actor, actor_actual, requiere_permiso


def _actor(*permisos):
    return Actor(
        id=uuid7(),
        sid=uuid7(),
        rol="recepcion",
        permisos=frozenset(permisos),
        propiedades=frozenset(),
        todas_las_propiedades=False,
    )


@pytest.mark.parametrize(("permisos", "esperado"), [({"reservas.ver"}, 200), (set(), 403)])
async def test_requiere_permiso(permisos, esperado):
    app = FastAPI()
    errores.registrar(app)

    @app.get("/x")
    async def _x(actor: Actor = Depends(requiere_permiso("reservas.ver"))):  # noqa: B008
        return {"ok": True}

    app.dependency_overrides[actor_actual] = lambda: _actor(*permisos)
    async with AsyncClient(transport=ASGITransport(app=app), base_url="https://p") as c:
        assert (await c.get("/x")).status_code == esperado


@pytest.mark.parametrize(
    ("clave", "malo"),
    [("corta", True), ("persona1", True), ("aaaaaaaaaaaaaaa", True), ("una-frase-larga-de-verdad", False)],
)
def test_politica_de_clave(clave, malo):
    assert (problema_de_clave(clave, usuario="persona1", correo="p@x.mx") is not None) is malo
