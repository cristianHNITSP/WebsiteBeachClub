"""Prueba de carga (PLAN-BACKEND §9): con 1 millón de reservas, el tablero sigue
respondiendo en menos de 100 ms. No corre con `pytest` a secas (marca `carga`):

    $DEV api uv run pytest -m carga -s

Todo dentro de la transacción de la prueba: al terminar se revierte y la base
queda como estaba.
"""

import time
from datetime import timedelta

import pytest
from sqlalchemy import func, select, text

from app.auth.alcance import Alcance
from app.modelos import Reserva
from app.servicios import metricas
from app.servicios.reservas import hoy
from tests.fabricas import abrir_alcance, propiedad

HABITACIONES = 2000
ESTANCIAS = 500  # por habitación, de 2 noches, seguidas: 2000 × 500 = 1 000 000
TOPE_MS = 100

pytestmark = pytest.mark.carga


async def test_un_millon_de_reservas(sesion):
    await abrir_alcance(sesion)
    await sesion.execute(select(func.set_config("statement_timeout", "0", True)))  # cargar tarda
    prop = await propiedad(sesion, "chelem")
    inicio = hoy() - timedelta(days=ESTANCIAS)  # mitad pasadas, mitad futuras

    t0 = time.perf_counter()
    await sesion.execute(
        text("""
        INSERT INTO habitaciones (propiedad_id, nombre, tipo, capacidad, tarifa_centavos)
        SELECT :p, 'Carga ' || n, 'Suite', 2, 100000 FROM generate_series(1, :n) n
        """),
        {"p": prop.id, "n": HABITACIONES},
    )
    await sesion.execute(
        text("""
        INSERT INTO reservas (codigo, propiedad_id, habitacion_id, tipo, estado, estancia, adultos,
                              huesped_nombre, modalidad, tarifa_noche_centavos, total_centavos,
                              anticipo_centavos)
        SELECT 'C' || lpad((row_number() OVER ())::text, 9, '0'), h.propiedad_id, h.id, 'reserva',
               CASE WHEN CAST(:inicio AS date) + i * 2 + 2 <= CURRENT_DATE
                    THEN 'completada' ELSE 'confirmada' END,
               daterange(CAST(:inicio AS date) + i * 2, CAST(:inicio AS date) + i * 2 + 2), 2,
               'Carga', 'completo', 100000, 200000, 200000
        FROM habitaciones h CROSS JOIN generate_series(0, :e - 1) i
        WHERE h.nombre LIKE 'Carga %'
        """),
        {"inicio": inicio, "e": ESTANCIAS},
    )
    cargadas = (await sesion.execute(select(func.count()).select_from(Reserva))).scalar_one()
    carga_s = time.perf_counter() - t0
    assert cargadas >= HABITACIONES * ESTANCIAS

    t0 = time.perf_counter()
    await sesion.run_sync(lambda s: metricas.recalcular_todo(s, dias=ESTANCIAS))
    recalculo_s = time.perf_counter() - t0

    tiempos = []
    for _ in range(5):
        t0 = time.perf_counter()
        datos = await metricas._calcular_tablero(sesion, Alcance(None))  # sin caché, a propósito
        tiempos.append((time.perf_counter() - t0) * 1000)
    tablero_ms = sorted(tiempos)[len(tiempos) // 2]  # la mediana

    h = (await sesion.execute(text("SELECT id FROM habitaciones WHERE nombre = 'Carga 1'"))).scalar_one()
    medidas = []
    for _ in range(5):
        t0 = time.perf_counter()
        await metricas.habitacion_mes(sesion, Alcance(None), h, hoy().replace(day=1))
        medidas.append((time.perf_counter() - t0) * 1000)
    habitacion_ms = sorted(medidas)[len(medidas) // 2]

    print(
        f"\n  reservas: {cargadas:,}  carga: {carga_s:.1f} s  recálculo nocturno: {recalculo_s:.1f} s"
        f"\n  tablero (mediana de 5, sin caché): {tablero_ms:.1f} ms"
        f"  una habitación en un mes: {habitacion_ms:.1f} ms"
        f"\n  ocupación de hoy: {datos['hoy']['ocupacion']} %"
    )
    assert datos["hoy"]["ocupadas"] >= HABITACIONES  # todas ocupadas hoy: los datos son reales
    assert tablero_ms < TOPE_MS, f"el tablero tardó {tablero_ms:.0f} ms"
    assert habitacion_ms < TOPE_MS
