"""Desglose por noche: cuánto vale cada noche y cuánto de ella está pagado."""

from datetime import timedelta

from app.servicios.reservas import hoy, repartir
from tests.conftest import csrf, entrar_como
from tests.fabricas import crear_habitacion


def test_repartir_es_exacto_y_proporcional():
    assert repartir(400_000, [100_000, 200_000, 100_000]) == [100_000, 200_000, 100_000]
    assert repartir(100_000, [1, 1, 1]) == [33_334, 33_333, 33_333]  # sobra 1 centavo: a la primera
    for total, pesos in ((999_999, [5, 7, 11]), (1, [1, 1]), (250_000, [0, 0])):
        assert sum(repartir(total, pesos)) == total
    assert repartir(0, []) == []


async def test_desglose_sigue_temporadas_y_lo_pagado(cliente, sesion):
    await entrar_como(cliente, sesion)
    h = await crear_habitacion(sesion, "chelem", nombre="Desglose", tarifa_centavos=100_000)
    llegada = hoy() + timedelta(days=20)
    dia = lambda n: str(llegada + timedelta(days=n))  # noqa: E731
    temporada = {"nombre": "Puente", "desde": dia(1), "hasta": dia(2), "tarifa_centavos": 200_000}
    assert (
        await cliente.post(f"/api/admin/habitaciones/{h.id}/tarifas", json=temporada, headers=csrf(cliente))
    ).status_code == 201
    r = (
        await cliente.post(
            "/api/admin/reservas",
            json={"habitacion_id": str(h.id), "llegada": dia(0), "salida": dia(3), "adultos": 2,
                  "huesped_nombre": "Noches"},
            headers=csrf(cliente),
        )
    ).json()  # fmt: skip
    url = f"/api/admin/reservas/{r['id']}"

    d = (await cliente.get(url)).json()
    assert [n["monto_centavos"] for n in d["desglose"]] == [
        100_000,
        200_000,
        100_000,
    ]  # la noche de temporada vale más
    assert d["desglose"][0]["fecha"] == str(llegada)
    assert {n["estado"] for n in d["desglose"]} == {"pendiente"}

    pagar = {"concepto": "abono", "metodo": "efectivo", "monto_centavos": 150_000}
    assert (await cliente.post(f"{url}/pagos", json=pagar, headers=csrf(cliente))).status_code == 201
    d = (await cliente.get(url)).json()
    assert [(n["estado"], n["pagado_centavos"]) for n in d["desglose"]] == [
        ("pagada", 100_000), ("parcial", 50_000), ("pendiente", 0),
    ]  # fmt: skip

    resto = {"concepto": "saldo", "metodo": "tarjeta", "monto_centavos": d["por_cobrar_centavos"]}
    assert (await cliente.post(f"{url}/pagos", json=resto, headers=csrf(cliente))).status_code == 201
    d = (await cliente.get(url)).json()
    assert {n["estado"] for n in d["desglose"]} == {"pagada"} and d["por_cobrar_centavos"] == 0


async def test_abono_libre_al_reservar_y_luego_noche_por_noche(cliente, sesion):
    """Al reservar se deja una noche (o lo que se quiera); después se paga de una,
    dos o las que sean, hasta terminar."""
    await entrar_como(cliente, sesion)
    h = await crear_habitacion(sesion, "chelem", nombre="Abonos", tarifa_centavos=100_000)
    llegada = hoy() + timedelta(days=30)
    dia = lambda n: str(llegada + timedelta(days=n))  # noqa: E731

    cot = (
        await cliente.get(
            f"/api/admin/reservas/cotizar?habitacion_id={h.id}&llegada={dia(0)}&salida={dia(5)}"
        )
    ).json()
    assert (
        cot["precios_noche_centavos"] == [100_000] * 5
        and sum(cot["precios_noche_centavos"]) == cot["total_centavos"]
    )

    pedir = {
        "habitacion_id": str(h.id),
        "llegada": dia(0),
        "salida": dia(5),
        "adultos": 1,
        "huesped_nombre": "Abonos",
    }
    demasiado = {**pedir, "pago_inicial": {"metodo": "efectivo", "monto_centavos": 600_000}}
    r = await cliente.post("/api/admin/reservas", json=demasiado, headers=csrf(cliente))
    assert r.status_code == 422 and r.json()["codigo"] == "excede"  # más que el total: no se crea nada

    con_una = {**pedir, "pago_inicial": {"metodo": "efectivo", "monto_centavos": 100_000}}
    r = await cliente.post("/api/admin/reservas", json=con_una, headers=csrf(cliente))
    assert r.status_code == 201, r.text
    url = f"/api/admin/reservas/{r.json()['id']}"
    d = (await cliente.get(url)).json()
    assert d["pagos"][0]["concepto"] == "abono" and d["por_cobrar_centavos"] == 400_000
    assert [n["estado"] for n in d["desglose"]] == ["pagada"] + ["pendiente"] * 4

    for monto, pagadas in ((200_000, 3), (100_000, 4), (100_000, 5)):  # dos noches, una, la última
        pago = {"concepto": "abono", "metodo": "tarjeta", "monto_centavos": monto}
        assert (await cliente.post(f"{url}/pagos", json=pago, headers=csrf(cliente))).status_code == 201
        d = (await cliente.get(url)).json()
        assert [n["estado"] for n in d["desglose"]].count("pagada") == pagadas
    assert d["por_cobrar_centavos"] == 0
