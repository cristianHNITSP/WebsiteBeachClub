"""Fase 4: outbox → avisos + SSE (PLAN-BACKEND §6.4, §10)."""

import asyncio
import json
import uuid
from contextlib import asynccontextmanager, suppress
from datetime import timedelta

from sqlalchemy import select

from app import tiempo_real
from app.auth.dependencias import Actor
from app.conexion_redis import redis
from app.modelos import Aviso, Outbox
from app.servicios.reservas import hoy
from app.tareas.outbox import despachar
from tests.conftest import csrf, entrar_como
from tests.fabricas import crear_habitacion

D = lambda n: str(hoy() + timedelta(days=n))  # noqa: E731


async def reservar(cliente, hab, nombre="Ana Pech", dia=5):
    r = await cliente.post(
        "/api/admin/reservas",
        json={
            "habitacion_id": str(hab.id),
            "llegada": D(dia),
            "salida": D(dia + 2),
            "adultos": 1,
            "huesped_nombre": nombre,
        },
        headers=csrf(cliente),
    )
    assert r.status_code == 201, r.text
    return r.json()


async def test_despachar_crea_avisos_una_sola_vez(cliente, sesion):
    yo = await entrar_como(cliente, sesion)
    hab = await crear_habitacion(sesion, "chelem")
    r = await reservar(cliente, hab)
    publicar = await sesion.run_sync(despachar)
    assert [m["tipo"] for _, m in publicar if m["agregado_id"] == r["id"]] == ["reserva.creada"]
    assert await sesion.run_sync(despachar) == []  # ya despachado: no se repite
    aviso = await sesion.scalar(select(Aviso).where(Aviso.destino.contains(r["id"])))
    assert aviso.titulo == "Nueva reserva" and "Ana Pech" in aviso.texto and aviso.causado_por == yo.id
    lista = (await cliente.get("/api/admin/avisos")).json()
    propio = next(a for a in lista if a["id"] == str(aviso.id))
    assert propio["propio"] is True and propio["leido"] is False


async def test_cada_quien_ve_lo_suyo_y_marca_lo_suyo(cliente, sesion):
    await entrar_como(cliente, sesion)
    de_chuburna = await crear_habitacion(sesion, "chuburna")
    de_chelem = await crear_habitacion(sesion, "chelem")
    await reservar(cliente, de_chuburna, nombre="Lejana")
    await reservar(cliente, de_chelem, nombre="Cercana")
    await sesion.run_sync(despachar)
    cliente.cookies.clear()
    await entrar_como(cliente, sesion, rol="recepcion", propiedades=["chelem"])
    textos = [a["texto"] for a in (await cliente.get("/api/admin/avisos")).json()]
    assert any("Cercana" in t for t in textos) and not any("Lejana" in t for t in textos)
    antes = (await cliente.get("/api/admin/avisos/resumen")).json()["sin_leer"]
    aviso = next(a for a in (await cliente.get("/api/admin/avisos")).json() if "Cercana" in a["texto"])
    assert (
        await cliente.post(
            f"/api/admin/avisos/{aviso['id']}/leido", json={"leido": True}, headers=csrf(cliente)
        )
    ).status_code == 204
    assert (await cliente.get("/api/admin/avisos/resumen")).json()["sin_leer"] == antes - 1
    await cliente.delete(f"/api/admin/avisos/{aviso['id']}", headers=csrf(cliente))
    assert aviso["id"] not in [a["id"] for a in (await cliente.get("/api/admin/avisos")).json()]
    await cliente.post(f"/api/admin/avisos/{aviso['id']}/restaurar", headers=csrf(cliente))
    await cliente.post("/api/admin/avisos/leer-todos", headers=csrf(cliente))
    assert (await cliente.get("/api/admin/avisos/resumen")).json()["sin_leer"] == 0


def actor(permisos=("reservas.ver",), propiedades=(), todas=True):
    return Actor(
        id=uuid.uuid7(), sid=uuid.uuid7(), rol="x", permisos=frozenset(permisos),
        propiedades=frozenset(propiedades), todas_las_propiedades=todas,
    )  # fmt: skip


async def _primeros(generador, n, segundos=5):
    salida = []

    async def leer():
        async for trozo in generador:
            if trozo.startswith("id:"):
                salida.append(json.loads(trozo.split("data: ", 1)[1]))
                if len(salida) == n:
                    return

    with suppress(TimeoutError):  # se acabó el tiempo: devuelve lo que llegó
        await asyncio.wait_for(leer(), segundos)
    return salida


async def test_sse_reenvia_lo_perdido_con_last_event_id(cliente, sesion):
    await entrar_como(cliente, sesion)
    hab = await crear_habitacion(sesion, "chelem")
    r = await reservar(cliente, hab)
    await sesion.run_sync(despachar)
    ultimo_previo = uuid.UUID(int=0)

    @asynccontextmanager
    async def la_misma():
        yield sesion

    async def nunca():
        return False

    eventos = await _primeros(
        tiempo_real.flujo(actor(), ultimo_previo, nunca, la_misma, duracion_max_s=2), 50, 3
    )
    assert r["id"] in [e["agregado_id"] for e in eventos]
    sin_permiso = await _primeros(
        tiempo_real.flujo(actor(permisos=()), ultimo_previo, nunca, la_misma, duracion_max_s=1), 1, 2
    )
    assert sin_permiso == []  # sin reservas.ver no recibe eventos de reservas


async def test_sse_en_vivo_por_propiedad():
    chelem, chuburna = uuid.uuid7(), uuid.uuid7()

    async def nunca():
        return False

    flujo = tiempo_real.flujo(actor(propiedades=[chelem], todas=False), None, nunca, None, duracion_max_s=4)
    assert await anext(flujo) == "retry: 3000\n\n"
    tarea = asyncio.create_task(_primeros(flujo, 1, 4))
    await asyncio.sleep(0.5)  # ya suscrito
    for prop, nombre in ((chuburna, "ajena"), (chelem, "propia")):
        m = {"id": str(uuid.uuid7()), "tipo": "reserva.creada", "agregado": "reserva", "agregado_id": nombre,
             "propiedad_id": str(prop), "por": None}  # fmt: skip
        await redis.publish(tiempo_real.canal(prop), json.dumps(m))
    eventos = await tarea
    assert [e["agregado_id"] for e in eventos] == ["propia"]  # la de otra propiedad no llega


async def test_sse_exige_sesion(cliente):
    assert (await cliente.get("/api/eventos")).status_code == 401


def test_outbox_sin_aviso_para_bloqueos():
    from app.servicios.avisos import desde_evento

    e = Outbox(
        id=uuid.uuid7(),
        tipo="reserva.creada",
        agregado="reserva",
        agregado_id=uuid.uuid7(),
        datos={"tipo": "bloqueo"},
    )
    assert desde_evento(e) is None
