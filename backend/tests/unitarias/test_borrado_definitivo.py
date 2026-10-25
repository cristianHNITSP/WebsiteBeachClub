"""El borrado definitivo exige `papelera.vaciar` aunque se tenga el permiso de
eliminar del recurso, y lo comprueba ANTES de tocar nada (PLAN-BACKEND §17.3)."""

import uuid

import pytest

from app.auth.dependencias import Actor
from app.errores import SinPermiso
from app.servicios import papelera


async def test_sin_papelera_vaciar_no_hay_borrado_definitivo():
    actor = Actor(
        id=uuid.uuid7(),
        sid=uuid.uuid7(),
        rol="x",
        permisos=frozenset({"habitaciones.eliminar"}),
        propiedades=frozenset(),
        todas_las_propiedades=True,
    )
    with pytest.raises(SinPermiso):
        await papelera.borrar_definitivo(None, actor, None, None, ip="x")
