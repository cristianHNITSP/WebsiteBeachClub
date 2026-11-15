"""Analítica: cómo pagan los huéspedes (estancias terminadas)."""

import secrets
from datetime import datetime, time, timedelta
from zoneinfo import ZoneInfo

from sqlalchemy import select
from sqlalchemy.dialects.postgresql import Range

from app.modelos import Pago, Reserva
from app.servicios.reservas import hoy
from tests.conftest import entrar_como
from tests.fabricas import crear_habitacion

MERIDA = ZoneInfo("America/Merida")


async def _estancia(sesion, h, llegada, noches, pagos_por_dia: list[tuple[int, int]]):
    """Una estancia ya terminada con sus pagos: (día relativo a la llegada, monto)."""
    total = 100_000 * noches
    r = Reserva(
        codigo="FRD-" + secrets.token_hex(3).upper(), propiedad_id=h.propiedad_id, habitacion_id=h.id,
        estado="completada", estancia=Range(llegada, llegada + timedelta(days=noches)), adultos=1,
        huesped_nombre="Forma", modalidad="completo", tarifa_noche_centavos=100_000, total_centavos=total,
        anticipo_centavos=total, pagado_centavos=sum(m for _, m in pagos_por_dia),
    )  # fmt: skip
    sesion.add(r)
    await sesion.flush()
    for dia, monto in pagos_por_dia:
        momento = datetime.combine(llegada + timedelta(days=dia), time(12), tzinfo=MERIDA)
        sesion.add(
            Pago(reserva_id=r.id, propiedad_id=r.propiedad_id, concepto="abono", metodo="efectivo",
                 estado="cobrado", monto_centavos=monto, creado=momento)
        )  # fmt: skip
    await sesion.flush()


async def test_formas_de_pago(cliente, sesion):
    await entrar_como(cliente, sesion)
    h = await crear_habitacion(sesion, "chelem", nombre="Formas de pago")
    llegada = hoy() - timedelta(days=20)
    antes = (await cliente.get("/api/admin/metricas/pagos?dias=60")).json()

    await _estancia(sesion, h, llegada, 3, [(-5, 300_000)])  # de una vez, antes de llegar
    await _estancia(
        sesion, h, llegada - timedelta(days=4), 3, [(-3, 100_000), (0, 200_000)]
    )  # todo al llegar
    await _estancia(
        sesion, h, llegada - timedelta(days=8), 4, [(-2, 100_000), (3, 300_000)]
    )  # liquidó al salir
    await _estancia(
        sesion, h, llegada - timedelta(days=14), 5, [(0, 100_000), (1, 100_000), (2, 300_000)]
    )  # abonos

    d = (await cliente.get("/api/admin/metricas/pagos?dias=60")).json()
    cuantas = {f["forma"]: f["estancias"] for f in d["formas"]}
    previas = {f["forma"]: f["estancias"] for f in antes["formas"]}
    for forma in ("de_una_vez", "al_llegar", "al_salir", "en_abonos"):
        assert cuantas[forma] - previas[forma] == 1, (forma, cuantas, previas)
    assert d["estancias"] - antes["estancias"] == 4
    assert abs(sum(f["porcentaje"] for f in d["formas"]) - 100) < 0.5


async def test_metodos_de_pago_cuenta_pagos_y_dinero_sin_las_devoluciones(cliente, sesion):
    await entrar_como(cliente, sesion)
    h = await crear_habitacion(sesion, "chelem", nombre="Métodos")
    llegada = hoy() - timedelta(days=5)
    antes = {
        m["metodo"]: m for m in (await cliente.get("/api/admin/metricas/pagos?dias=30")).json()["metodos"]
    }
    await _estancia(sesion, h, llegada, 2, [(0, 100_000), (1, 100_000)])  # dos pagos en efectivo
    r = (await sesion.scalars(select(Reserva).where(Reserva.habitacion_id == h.id))).one()
    base = {"reserva_id": r.id, "propiedad_id": r.propiedad_id, "metodo": "tarjeta"}
    sesion.add_all([
        Pago(**base, concepto="abono", estado="cobrado", monto_centavos=50_000),
        Pago(**base, concepto="devolucion", estado="reembolsado", monto_centavos=10_000, motivo="Cortesía"),
    ])  # fmt: skip
    await sesion.flush()
    d = (await cliente.get("/api/admin/metricas/pagos?dias=30")).json()
    m = {x["metodo"]: x for x in d["metodos"]}
    assert [x["metodo"] for x in d["metodos"]] == ["efectivo", "tarjeta", "transferencia"]
    assert m["efectivo"]["pagos"] - antes["efectivo"]["pagos"] == 2
    assert m["efectivo"]["monto_centavos"] - antes["efectivo"]["monto_centavos"] == 200_000
    assert m["tarjeta"]["pagos"] - antes["tarjeta"]["pagos"] == 1  # la devolución no cuenta
    assert abs(sum(x["porcentaje"] for x in d["metodos"]) - 100) < 0.5


async def test_el_pago_al_reservar_y_los_abonos_cuentan_en_con_que_pagan(cliente, sesion):
    """Lo que se captura en Nueva reserva (pago inicial con su forma) y los abonos que se registran
    después en el detalle llegan a la analítica del Tablero, cada uno con su método."""
    from tests.conftest import csrf

    await entrar_como(cliente, sesion)
    h = await crear_habitacion(sesion, "chelem", nombre="Con pago inicial", capacidad=4)
    antes = {
        m["metodo"]: m for m in (await cliente.get("/api/admin/metricas/pagos?dias=30")).json()["metodos"]
    }
    llegada = hoy() + timedelta(days=3)
    r = await cliente.post(
        "/api/admin/reservas",
        json={
            "habitacion_id": str(h.id), "llegada": str(llegada), "salida": str(llegada + timedelta(days=2)),
            "adultos": 2, "huesped_nombre": "Paga al reservar",
            "pago_inicial": {"metodo": "transferencia", "referencia": "SPEI 123", "monto_centavos": 50_000},
        },
        headers=csrf(cliente),
    )  # fmt: skip
    assert r.status_code == 201, r.text
    abono = await cliente.post(
        f"/api/admin/reservas/{r.json()['id']}/pagos",
        json={"concepto": "abono", "metodo": "tarjeta", "monto_centavos": 30_000},
        headers=csrf(cliente),
    )
    assert abono.status_code in (200, 201), abono.text
    m = {x["metodo"]: x for x in (await cliente.get("/api/admin/metricas/pagos?dias=30")).json()["metodos"]}
    assert m["transferencia"]["monto_centavos"] - antes["transferencia"]["monto_centavos"] == 50_000
    assert m["tarjeta"]["pagos"] - antes["tarjeta"]["pagos"] == 1
