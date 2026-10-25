"""Tarifas de temporada (precio por noche) y devoluciones manuales."""

from datetime import timedelta

from app.servicios.reservas import hoy
from app.servicios.tarifas import precios_por_noche
from tests.conftest import csrf, entrar_como
from tests.fabricas import crear_habitacion

D = lambda n: str(hoy() + timedelta(days=n))  # noqa: E731


def url_t(hab):
    return f"/api/admin/habitaciones/{hab.id}/tarifas"


async def temporada(cliente, hab, desde, hasta, centavos, nombre="Temporada alta"):
    r = await cliente.post(
        url_t(hab),
        json={"nombre": nombre, "desde": D(desde), "hasta": D(hasta), "tarifa_centavos": centavos},
        headers=csrf(cliente),
    )
    return r


async def test_cada_noche_con_su_tarifa(cliente, sesion):
    await entrar_como(cliente, sesion)
    hab = await crear_habitacion(sesion, tarifa_centavos=100_000)
    assert (await temporada(cliente, hab, 10, 12, 250_000)).status_code == 201
    # Noches 9, 10, 11, 12: base, alta, alta, base.
    c = (
        await cliente.get(
            "/api/admin/reservas/cotizar",
            params={"habitacion_id": str(hab.id), "llegada": D(9), "salida": D(13)},
        )
    ).json()
    assert c["total_centavos"] == 100_000 + 250_000 + 250_000 + 100_000
    r = await cliente.post(
        "/api/admin/reservas",
        json={
            "habitacion_id": str(hab.id),
            "llegada": D(9),
            "salida": D(13),
            "adultos": 1,
            "huesped_nombre": "Temporada",
        },
        headers=csrf(cliente),
    )
    assert r.json()["total_centavos"] == 700_000
    # Mover sin cambiar el número de noches deja el total EXACTO (lo pactado).
    m = await cliente.put(
        f"/api/admin/reservas/{r.json()['id']}/fechas",
        json={
            "habitacion_id": str(hab.id),
            "llegada": D(20),
            "salida": D(24),
            "version": r.json()["version"],
        },
        headers=csrf(cliente),
    )
    assert m.json()["total_centavos"] == 700_000


async def test_temporadas_no_se_cruzan(cliente, sesion):
    await entrar_como(cliente, sesion)
    hab = await crear_habitacion(sesion)
    assert (await temporada(cliente, hab, 10, 20, 200_000)).status_code == 201
    r = await temporada(cliente, hab, 15, 25, 300_000)
    assert r.status_code == 409 and r.json()["codigo"] == "temporada_cruzada"
    assert (await temporada(cliente, hab, 20, 25, 300_000)).status_code == 201  # contigua: sí
    lista = (await cliente.get(url_t(hab))).json()
    assert [t["tarifa_centavos"] for t in lista] == [200_000, 300_000]
    # A la papelera libera sus fechas.
    await cliente.delete(f"{url_t(hab)}/{lista[0]['id']}", headers=csrf(cliente))
    assert (await temporada(cliente, hab, 12, 14, 400_000)).status_code == 201


def test_precios_por_noche_sin_temporadas():
    assert precios_por_noche(5, [], hoy(), hoy() + timedelta(days=3)) == [5, 5, 5]


async def test_devolucion_tras_cancelar(cliente, sesion):
    await entrar_como(cliente, sesion)
    hab = await crear_habitacion(sesion, tarifa_centavos=100_000)
    r = (
        await cliente.post(
            "/api/admin/reservas",
            json={
                "habitacion_id": str(hab.id),
                "llegada": D(5),
                "salida": D(7),
                "adultos": 1,
                "huesped_nombre": "Devo",
                "pago_inicial": {"metodo": "tarjeta"},
            },
            headers=csrf(cliente),
        )
    ).json()
    assert r["pagado_centavos"] == 200_000
    c = (
        await cliente.post(
            f"/api/admin/reservas/{r['id']}/cancelar", json={"version": r["version"]}, headers=csrf(cliente)
        )
    ).json()
    url = f"/api/admin/reservas/{r['id']}/devoluciones"
    sin_motivo = await cliente.post(
        url, json={"metodo": "tarjeta", "monto_centavos": 1}, headers=csrf(cliente)
    )
    assert sin_motivo.status_code == 422
    de_mas = await cliente.post(
        url,
        json={"metodo": "tarjeta", "monto_centavos": 200_001, "motivo": "Cancelación"},
        headers=csrf(cliente),
    )
    assert de_mas.json()["codigo"] == "excede"
    d = await cliente.post(
        url,
        json={"metodo": "tarjeta", "monto_centavos": 150_000, "motivo": "Cancelación con 48 h"},
        headers=csrf(cliente),
    )
    assert d.status_code == 201 and d.json()["pagado_centavos"] == 50_000 and c["estado"] == "cancelada"
    assert c["por_cobrar_centavos"] == 0 and d.json()["por_cobrar_centavos"] == 0  # cancelada: no debe nada
    pagos = (await cliente.get(f"/api/admin/reservas/{r['id']}")).json()["pagos"]
    assert [(p["concepto"], p["estado"], p["monto_centavos"]) for p in pagos] == [
        ("total", "cobrado", 200_000),
        ("devolucion", "reembolsado", 150_000),
    ]
    tipos = [e["tipo"] for e in (await cliente.get(f"/api/admin/reservas/{r['id']}/historial")).json()]
    assert tipos[-1] == "devolucion"
