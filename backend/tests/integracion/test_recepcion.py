"""Llegadas y salidas por columnas: cursor de doble sentido sin perder ni repetir
a nadie, reglas de cada columna en el servidor y alcance por propiedad."""

from datetime import timedelta

from app.servicios.reservas import hoy
from tests.conftest import csrf, entrar_como
from tests.fabricas import crear_habitacion

RESERVAS = "/api/admin/reservas"
URL = f"{RESERVAS}/recepcion"
D = lambda n: str(hoy() + timedelta(days=n))  # noqa: E731


async def reservar(cliente, hab, llegada=0, noches=2, nombre="Ana Pech"):
    r = await cliente.post(
        RESERVAS,
        json={
            "habitacion_id": str(hab.id),
            "llegada": D(llegada),
            "salida": D(llegada + noches),
            "adultos": 2,
            "huesped_nombre": nombre,
            "huesped_correo": "ana@correo.mx",
        },
        headers=csrf(cliente),
    )
    assert r.status_code == 201, r.text
    return r.json()


async def pagina(cliente, columna="llegan", cursor=None, limite=2):
    params = {"columna": columna, "limite": limite} | ({"cursor": cursor} if cursor else {})
    r = await cliente.get(URL, params=params)
    assert r.status_code == 200, r.text
    return r.json()


async def test_cursor_adelante_y_atras_sin_perder_ni_repetir(cliente, sesion):
    await entrar_como(cliente, sesion)
    ids = []
    for i in range(5):
        hab = await crear_habitacion(sesion, nombre=f"Cabaña {i}")
        ids.append((await reservar(cliente, hab, nombre=f"Huésped {i}"))["id"])

    p1 = await pagina(cliente)
    assert p1["meta"]["total"] == 5 and p1["meta"]["anterior"] is None and p1["meta"]["siguiente"]
    p2 = await pagina(cliente, cursor=p1["meta"]["siguiente"])
    assert p2["meta"]["anterior"] and p2["meta"]["siguiente"]
    p3 = await pagina(cliente, cursor=p2["meta"]["siguiente"])
    assert len(p3["items"]) == 1 and p3["meta"]["siguiente"] is None and p3["meta"]["anterior"]

    vistos = [r["id"] for p in (p1, p2, p3) for r in p["items"]]
    assert sorted(vistos) == sorted(ids) and len(set(vistos)) == 5

    atras = await pagina(cliente, cursor=p3["meta"]["anterior"])
    assert [r["id"] for r in atras["items"]] == [r["id"] for r in p2["items"]]
    inicio = await pagina(cliente, cursor=atras["meta"]["anterior"])
    assert [r["id"] for r in inicio["items"]] == [r["id"] for r in p1["items"]]
    assert inicio["meta"]["anterior"] is None and inicio["meta"]["siguiente"]


async def test_cada_columna_aplica_su_regla(cliente, sesion):
    await entrar_como(cliente, sesion)
    hoy_llega = await reservar(cliente, await crear_habitacion(sesion, nombre="A"))
    await reservar(cliente, await crear_habitacion(sesion, nombre="B"), llegada=3)  # futura: en ninguna

    llegan = await pagina(cliente, "llegan", limite=10)
    assert [r["id"] for r in llegan["items"]] == [hoy_llega["id"]]
    assert (await pagina(cliente, "en_casa", limite=10))["meta"]["total"] == 0

    r = await cliente.post(
        f"{RESERVAS}/{hoy_llega['id']}/llegada", json={"version": hoy_llega["version"]}, headers=csrf(cliente)
    )
    assert r.status_code == 200, r.text
    assert (await pagina(cliente, "llegan", limite=10))["meta"]["total"] == 0
    assert [x["id"] for x in (await pagina(cliente, "en_casa", limite=10))["items"]] == [hoy_llega["id"]]


async def test_cursor_invalido_se_rechaza(cliente, sesion):
    await entrar_como(cliente, sesion)
    r = await cliente.get(URL, params={"columna": "llegan", "cursor": "no-es-un-cursor"})
    assert r.status_code in (400, 422) and "cursor" in r.text.lower()


async def test_columna_desconocida_se_rechaza(cliente, sesion):
    await entrar_como(cliente, sesion)
    assert (await cliente.get(URL, params={"columna": "otra"})).status_code == 422


async def test_solo_se_ve_la_propiedad_propia(cliente, sesion):
    await entrar_como(cliente, sesion)
    await reservar(cliente, await crear_habitacion(sesion, "chuburna", nombre="Lejos"))
    chelem = await reservar(cliente, await crear_habitacion(sesion, "chelem", nombre="Cerca"))
    await cliente.post("/api/auth/salir", headers=csrf(cliente))

    await entrar_como(cliente, sesion, rol="recepcion", propiedades=["chelem"])
    p = await pagina(cliente, limite=10)
    assert [r["id"] for r in p["items"]] == [chelem["id"]] and p["meta"]["total"] == 1
