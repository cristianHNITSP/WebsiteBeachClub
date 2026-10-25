"""Auditoría forense (PLAN-BACKEND §17.4): cadena de hashes, contexto completo,
solo inserciones, detección de manipulación, eventos de seguridad y exportación
con huella."""

import hashlib

import pytest
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import create_async_engine

from app.config import obtener_config
from app.modelos import Auditoria
from tests.conftest import csrf, entrar_como
from tests.fabricas import CLAVE, crear_usuario, propiedad

URL = "/api/admin/auditoria"


async def ultimas(sesion, n=1, **filtro):
    consulta = select(Auditoria).filter_by(**filtro).order_by(Auditoria.secuencia.desc()).limit(n)
    return list((await sesion.execute(consulta)).scalars())


async def test_cada_evento_trae_quien_desde_donde_y_su_solicitud(cliente, sesion):
    u = await entrar_como(cliente, sesion)
    chelem = await propiedad(sesion, "chelem")
    r = await cliente.post(
        "/api/admin/habitaciones",
        json={
            "propiedad_id": str(chelem.id),
            "nombre": "Suite",
            "tipo": "Suite",
            "capacidad": 2,
            "tarifa_centavos": 100,
        },
        headers=csrf(cliente) | {"User-Agent": "navegador-de-prueba"},
    )
    (fila,) = await ultimas(sesion, accion="habitacion.crear")
    assert str(fila.solicitud_id) == r.headers["x-solicitud-id"]  # se cruza con el registro de acceso
    assert fila.usuario_id == u.id and fila.sesion_id is not None
    assert fila.agente == "navegador-de-prueba" and fila.ip
    inicio = (await ultimas(sesion, accion="sesion.iniciar"))[0]
    assert fila.sesion_id == inicio.sesion_id  # la misma sesión del panel


async def test_la_cadena_es_continua_y_verificable(cliente, sesion):
    await entrar_como(cliente, sesion)
    await cliente.get(URL)  # mirar la auditoría también deja eslabones
    await cliente.get(URL)
    filas = await ultimas(sesion, n=3)
    assert [f.secuencia for f in filas] == [filas[0].secuencia - i for i in range(3)]
    assert filas[0].hash_anterior == filas[1].hash and len(filas[0].hash) == 64
    r = await cliente.get(f"{URL}/verificar")
    assert r.status_code == 200 and r.json()["integra"] is True and r.json()["primera_rota"] is None


async def test_nadie_modifica_ni_borra_la_auditoria(cliente, sesion):
    await entrar_como(cliente, sesion)
    for sentencia in ("UPDATE auditoria SET accion = 'x'", "DELETE FROM auditoria", "TRUNCATE auditoria"):
        with pytest.raises(Exception, match=r"permission denied|solo admite inserciones"):
            async with sesion.begin_nested():
                await sesion.execute(text(sentencia))


async def test_la_verificacion_detecta_una_fila_alterada():
    """Aunque el DUEÑO de la tabla quite el trigger y altere una fila, la cadena lo
    delata. (Conexión aparte como dueño, todo dentro de una transacción revertida.)"""
    motor = create_async_engine(obtener_config().url_migraciones())
    try:
        async with motor.connect() as c, c.begin() as t:
            for accion in ("prueba.a", "prueba.b", "prueba.c"):
                await c.execute(
                    text("INSERT INTO auditoria (accion, entidad) VALUES (:a, 'prueba')"), {"a": accion}
                )
            victima = await c.scalar(text("SELECT secuencia FROM auditoria WHERE accion = 'prueba.b'"))
            await c.execute(text("ALTER TABLE auditoria DISABLE TRIGGER auditoria_sin_cambios"))
            await c.execute(text("UPDATE auditoria SET despues = '{\"monto\": 1}' WHERE accion = 'prueba.b'"))
            fila = (await c.execute(text("SELECT * FROM auditoria_verificar(:d)"), {"d": victima - 1})).one()
            assert fila.primera_rota == victima
            await t.rollback()
    finally:
        await motor.dispose()


async def test_login_fallido_y_bloqueo_quedan_aunque_la_respuesta_sea_error(cliente, sesion):
    u = await crear_usuario(sesion)
    nadie = await cliente.post("/api/auth/entrar", json={"identificador": "fantasma", "clave": "x"})
    assert nadie.status_code == 401
    assert (await ultimas(sesion, accion="sesion.fallo"))[0].despues["motivo"] == "no_existe"
    for _ in range(4):  # con el de arriba, 5 desde esta IP
        r = await cliente.post("/api/auth/entrar", json={"identificador": u.usuario, "clave": "no-es-esta"})
        assert r.status_code == 401
    fallo = (await ultimas(sesion, accion="sesion.fallo"))[0]
    assert fallo.usuario_id == u.id and fallo.despues == {"identificador": u.usuario, "motivo": "clave"}
    r = await cliente.post("/api/auth/entrar", json={"identificador": u.usuario, "clave": CLAVE})
    assert r.status_code == 429
    assert (await ultimas(sesion, accion="sesion.bloqueada"))[0].despues["identificador"] == u.usuario


async def test_permiso_denegado_queda_en_la_auditoria(cliente, sesion):
    u = await entrar_como(cliente, sesion, rol="recepcion", propiedades=["chelem"])
    assert (await cliente.get(URL)).status_code == 403  # recepción no ve la auditoría
    fila = (await ultimas(sesion, accion="permiso.denegado"))[0]
    assert fila.usuario_id == u.id and fila.entidad_id == "GET /api/admin/auditoria"
    assert fila.despues["faltan"] == ["auditoria.ver"]


async def test_consultar_filtra_pagina_y_queda_auditado(cliente, sesion):
    u = await entrar_como(cliente, sesion)
    r = await cliente.get(URL, params={"usuario_id": str(u.id), "accion": "sesion.", "limite": 1})
    assert r.status_code == 200
    assert [x["accion"] for x in r.json()["items"]] == ["sesion.iniciar"]
    assert (await ultimas(sesion))[0].accion == "auditoria.consultar"  # mirar también se registra


async def test_exportar_con_huella_y_cadena_de_custodia(cliente, sesion):
    u = await entrar_como(cliente, sesion)
    r = await cliente.get(f"{URL}/exportar", params={"usuario_id": str(u.id)})
    assert r.status_code == 200 and r.headers["content-type"].startswith("application/x-ndjson")
    huella = hashlib.sha256(r.content).hexdigest()
    assert r.headers["x-contenido-sha256"] == huella
    custodia = (await ultimas(sesion, accion="auditoria.exportar"))[0]
    assert custodia.despues["sha256"] == huella and custodia.usuario_id == u.id
