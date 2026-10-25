"""Gestión del personal (fase 3e) y cambiar la propia contraseña."""

import uuid

import pytest
from sqlalchemy import select

from app.auth.dependencias import Actor
from app.errores import ReglaDeNegocio
from app.modelos import Auditoria, SesionUsuario, Usuario
from app.servicios import personal
from tests.conftest import csrf, entrar_como
from tests.fabricas import CLAVE, crear_usuario, propiedad

URL = "/api/admin/personal"
TEMPORAL = "temporal-segura-2026"


async def alta(cliente, sesion, **extra):
    chelem = await propiedad(sesion, "chelem")
    datos = {
        "usuario": "Ana.Pech", "correo": "ANA@hotel.mx", "nombre": "Ana Pech", "rol": "recepcion",
        "propiedades": [str(chelem.id)], "clave_temporal": TEMPORAL,
    } | extra  # fmt: skip
    return await cliente.post(URL, json=datos, headers=csrf(cliente))


async def test_alta_con_temporal_y_primer_ingreso(cliente, sesion):
    await entrar_como(cliente, sesion)
    r = await alta(cliente, sesion)
    assert r.status_code == 201, r.text
    p = r.json()
    assert (p["usuario"], p["correo"], p["rol"], p["debe_cambiar_clave"]) == (
        "ana.pech",
        "ana@hotel.mx",
        "recepcion",
        True,
    )
    alta_auditada = await sesion.scalar(select(Auditoria.despues).where(Auditoria.accion == "usuario.alta"))
    assert "hash" not in str(alta_auditada) and TEMPORAL not in str(alta_auditada)  # nunca la contraseña
    cliente.cookies.clear()
    e = await cliente.post("/api/auth/entrar", json={"identificador": "ana.pech", "clave": TEMPORAL})
    assert e.status_code == 200 and e.json()["debe_cambiar_clave"] is True
    c = await cliente.post(
        "/api/auth/clave", json={"actual": TEMPORAL, "nueva": "mi-clave-nueva-2026"}, headers=csrf(cliente)
    )
    assert c.status_code == 204
    assert (await cliente.get("/api/auth/yo")).json()["debe_cambiar_clave"] is False


async def test_validaciones_del_alta(cliente, sesion):
    await entrar_como(cliente, sesion)
    assert (await alta(cliente, sesion, clave_temporal="corta")).json()["codigo"] == "clave_debil"
    assert (await alta(cliente, sesion, rol="huesped")).json()["codigo"] == "rol"
    assert (await alta(cliente, sesion, usuario="no válido!")).status_code == 422
    assert (await alta(cliente, sesion)).status_code == 201
    r = await alta(cliente, sesion, usuario="otra")  # mismo correo, sin distinguir mayúsculas
    assert r.status_code == 409 and r.json()["codigo"] == "duplicado"


async def test_cambiar_rol_cierra_sus_sesiones_y_baja_lo_saca_ya(cliente, sesion):
    await entrar_como(cliente, sesion)
    victima = await crear_usuario(sesion, rol="recepcion", propiedades=["chelem"])
    sesion.add(
        SesionUsuario(usuario_id=victima.id, hash_renovacion="x" * 64, recordar=False, vence=victima.creado)
    )
    await sesion.flush()
    chuburna = await propiedad(sesion, "chuburna")
    r = await cliente.put(
        f"{URL}/{victima.id}",
        json={
            "nombre": victima.nombre,
            "correo": victima.correo,
            "rol": "recepcion",
            "propiedades": [str(chuburna.id)],
        },
        headers=csrf(cliente),
    )
    assert r.status_code == 200 and r.json()["propiedades"] == [str(chuburna.id)]
    assert await sesion.scalar(select(SesionUsuario.revocada).where(SesionUsuario.usuario_id == victima.id))
    b = await cliente.post(f"{URL}/{victima.id}/desactivar", headers=csrf(cliente))
    assert b.status_code == 200 and b.json()["activo"] is False
    cliente.cookies.clear()
    r = await cliente.post("/api/auth/entrar", json={"identificador": victima.usuario, "clave": CLAVE})
    assert r.status_code == 401  # dado de baja: no entra


async def test_no_se_toca_a_si_mismo(cliente, sesion):
    yo = await entrar_como(cliente, sesion)
    assert (await cliente.post(f"{URL}/{yo.id}/desactivar", headers=csrf(cliente))).json()[
        "codigo"
    ] == "propio"
    r = await cliente.put(
        f"{URL}/{yo.id}",
        json={"nombre": yo.nombre, "correo": yo.correo, "rol": "recepcion", "propiedades": []},
        headers=csrf(cliente),
    )
    assert r.json()["codigo"] == "propio"


async def test_nunca_queda_sin_nadie_que_gestione(sesion):
    """Por la API, quien desactiva también gestiona; la regla protege la carrera
    (dos gerentes bajándose a la vez) y cualquier otro camino. Se prueba directo."""
    unico = await crear_usuario(sesion, rol="gerente")
    otros = (
        await sesion.execute(select(Usuario).where(Usuario.activo.is_(True), Usuario.id != unico.id))
    ).scalars()
    for u in otros:
        u.activo = False  # en esta transacción, solo `unico` gestiona
    await sesion.flush()
    actor = Actor(
        id=uuid.uuid7(),
        sid=uuid.uuid7(),
        rol="gerente",
        permisos=frozenset({"usuarios.gestionar"}),
        propiedades=frozenset(),
        todas_las_propiedades=True,
    )
    with pytest.raises(ReglaDeNegocio, match="única persona activa"):
        await personal.desactivar(sesion, actor, unico.id)


async def test_restablecer_y_cambiar_propia(cliente, sesion):
    yo = await entrar_como(cliente, sesion)
    otra = await crear_usuario(sesion, rol="recepcion", propiedades=["chelem"])
    r = await cliente.post(f"{URL}/{otra.id}/clave", json={"clave_temporal": TEMPORAL}, headers=csrf(cliente))
    assert r.status_code == 200 and r.json()["debe_cambiar_clave"] is True
    propia = await cliente.post(
        f"{URL}/{yo.id}/clave", json={"clave_temporal": TEMPORAL}, headers=csrf(cliente)
    )
    assert propia.json()["codigo"] == "propio"
    mala = await cliente.post(
        "/api/auth/clave", json={"actual": "no-es", "nueva": "otra-clave-larga-1"}, headers=csrf(cliente)
    )
    assert mala.status_code == 422 and mala.json()["codigo"] == "clave_actual"
    assert await sesion.scalar(select(Auditoria.id).where(Auditoria.accion == "usuario.cambiar_clave_fallo"))
    debil = await cliente.post(
        "/api/auth/clave", json={"actual": CLAVE, "nueva": "aaaaaaaaaaaa"}, headers=csrf(cliente)
    )
    assert debil.json()["codigo"] == "clave_debil"


async def test_lista_roles_y_permisos(cliente, sesion):
    await entrar_como(cliente, sesion)
    await crear_usuario(sesion, rol="recepcion", usuario="buscable")
    r = (await cliente.get(URL, params={"q": "buscable"})).json()
    assert [x["usuario"] for x in r["items"]] == ["buscable"]
    assert {x["clave"] for x in (await cliente.get(f"{URL}/roles")).json()} == {
        "gerente",
        "recepcion",
        "restaurante",
    }
    cliente.cookies.clear()
    await entrar_como(cliente, sesion, rol="recepcion", propiedades=["chelem"])
    assert (await cliente.get(URL)).status_code == 403
