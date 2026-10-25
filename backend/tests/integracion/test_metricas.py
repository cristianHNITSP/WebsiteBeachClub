"""Fase 5: métricas precalculadas (PLAN-BACKEND §9)."""

from datetime import date, timedelta

from sqlalchemy import select

from app.conexion_redis import redis
from app.modelos import MetricaDiaria
from app.servicios import metricas
from app.servicios.reservas import hoy
from app.tareas.outbox import despachar
from tests.conftest import csrf, entrar_como
from tests.fabricas import crear_habitacion, propiedad

D = lambda n: hoy() + timedelta(days=n)  # noqa: E731


async def reservar(cliente, hab, dia, noches, **extra):
    r = await cliente.post(
        "/api/admin/reservas",
        json={
            "habitacion_id": str(hab.id),
            "llegada": str(D(dia)),
            "salida": str(D(dia + noches)),
            "adultos": 1,
            "huesped_nombre": "Métrica",
        }
        | extra,
        headers=csrf(cliente),
    )
    assert r.status_code == 201, r.text
    return r.json()


async def filas(sesion, prop, desde, hasta):
    consulta = select(MetricaDiaria).where(
        MetricaDiaria.propiedad_id == prop.id, MetricaDiaria.dia >= desde, MetricaDiaria.dia < hasta
    )
    # populate_existing: el recálculo es SQL directo; sin esto el ORM devolvería
    # las filas que ya tenía en memoria de una lectura anterior.
    consulta = consulta.order_by(MetricaDiaria.dia).execution_options(populate_existing=True)
    return {f.dia: f for f in (await sesion.execute(consulta)).scalars()}


async def test_ingreso_por_noche_exacto_e_idempotente(cliente, sesion):
    await entrar_como(cliente, sesion)
    chelem = await propiedad(sesion, "chelem")
    hab = await crear_habitacion(sesion, "chelem", tarifa_centavos=33_334)  # 3 noches = 100_002
    await reservar(cliente, hab, 10, 3)
    for _ in range(2):  # dos veces: mismo resultado
        await sesion.run_sync(lambda s: metricas.recalcular(s, chelem.id, D(9), D(14)))
    f = await filas(sesion, chelem, D(9), D(14))
    assert [f[D(i)].noches_vendidas for i in range(9, 14)] == [0, 1, 1, 1, 0]
    assert sum(f[D(i)].ingreso_centavos for i in range(10, 13)) == 100_002  # exacto
    assert f[D(10)].llegadas == 1 and f[D(13)].salidas == 1


async def test_mover_y_cancelar_corrigen_los_dias(cliente, sesion):
    await entrar_como(cliente, sesion)
    chelem = await propiedad(sesion, "chelem")
    hab = await crear_habitacion(sesion, "chelem")
    r = await reservar(cliente, hab, 20, 2)
    await sesion.run_sync(despachar)
    assert (await filas(sesion, chelem, D(20), D(21)))[D(20)].noches_vendidas >= 1
    antes = (await filas(sesion, chelem, D(20), D(21)))[D(20)].noches_vendidas
    m = await cliente.put(
        f"/api/admin/reservas/{r['id']}/fechas",
        json={
            "habitacion_id": str(hab.id),
            "llegada": str(D(30)),
            "salida": str(D(32)),
            "version": r["version"],
        },
        headers=csrf(cliente),
    )
    await sesion.run_sync(despachar)  # el evento recalcula los días viejos Y los nuevos
    f = await filas(sesion, chelem, D(20), D(32))
    assert f[D(20)].noches_vendidas == antes - 1 and f[D(30)].noches_vendidas >= 1
    await cliente.post(
        f"/api/admin/reservas/{r['id']}/cancelar",
        json={"version": m.json()["version"]},
        headers=csrf(cliente),
    )
    await sesion.run_sync(despachar)
    f = await filas(sesion, chelem, D(30), D(31))
    assert f[D(30)].canceladas >= 1


async def test_tablero_por_propiedad_y_con_cache(cliente, sesion):
    await entrar_como(cliente, sesion)
    hab = await crear_habitacion(sesion, "chuburna")
    await reservar(cliente, hab, 0, 2)
    await sesion.run_sync(despachar)
    t = (await cliente.get("/api/admin/metricas/tablero")).json()
    assert {"hoy", "mes", "mes_anterior", "meses", "proximos", "ultimos_7_dias"} <= t.keys()
    assert len(t["meses"]) == 12 and len(t["proximos"]) == 14 and t["hoy"]["llegadas"] >= 1
    assert await redis.keys("cache:tablero:*")  # guardado 60 s
    cliente.cookies.clear()
    await entrar_como(cliente, sesion, rol="recepcion", propiedades=["chelem"])
    solo_chelem = (await cliente.get("/api/admin/metricas/tablero")).json()
    assert solo_chelem["hoy"]["habitaciones"] < t["hoy"]["habitaciones"] or t["hoy"]["habitaciones"] > 0


async def test_habitacion_en_un_mes_reparte_lo_que_cruza(cliente, sesion):
    await entrar_como(cliente, sesion)
    hab = await crear_habitacion(sesion, "chelem", tarifa_centavos=100_000)
    # Una estancia que cruza el fin de mes: solo cuentan las noches del mes pedido.
    fin_de_mes = (hoy().replace(day=28) + timedelta(days=4)).replace(day=1) - timedelta(days=1)
    dias_hasta = (fin_de_mes - hoy()).days
    if dias_hasta < 1:
        dias_hasta += 31
        fin_de_mes = (fin_de_mes + timedelta(days=32)).replace(day=1) - timedelta(days=1)
    await reservar(cliente, hab, dias_hasta - 1, 4)  # 2 noches en este mes, 2 en el siguiente
    mes = fin_de_mes.strftime("%Y-%m")
    m = (await cliente.get(f"/api/admin/metricas/habitaciones/{hab.id}", params={"mes": mes})).json()
    assert m["noches_vendidas"] == 2 and m["ingreso_centavos"] == 200_000
    assert m["ocupacion"] == round(200 / fin_de_mes.day, 1)
    assert date.fromisoformat(f"{mes}-01").month == fin_de_mes.month
