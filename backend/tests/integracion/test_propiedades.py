"""Propiedades (sucursales): solo el dueño las da de alta o las edita."""

from tests.conftest import csrf, entrar_como

URL = "/api/admin/propiedades"
NUEVA = {"nombre": "Villa Frida", "lugar": "Progreso, Yucatán"}


async def test_dueno_da_de_alta_y_edita_una_propiedad(cliente, sesion):
    await entrar_como(cliente, sesion, rol="dueno")
    r = await cliente.post(URL, json=NUEVA, headers=csrf(cliente))
    assert r.status_code == 201, r.text
    nueva = r.json()
    assert nueva["clave"] == "villa-frida" and nueva["lugar"] == "Progreso, Yucatán"
    # El dueño ve todas: la nueva sale en su sesión sin volver a entrar.
    assert any(p["id"] == nueva["id"] for p in (await cliente.get("/api/auth/yo")).json()["propiedades"])

    repetida = await cliente.post(URL, json={**NUEVA, "nombre": "villa frida"}, headers=csrf(cliente))
    assert repetida.status_code == 409 and repetida.json()["codigo"] == "duplicado"

    cambio = {**NUEVA, "nombre": "Villa Frida Progreso"}
    r = await cliente.put(f"{URL}/{nueva['id']}", json=cambio, headers=csrf(cliente))
    assert r.status_code == 200 and r.json()["nombre"] == "Villa Frida Progreso"
    assert r.json()["clave"] == "villa-frida"  # la clave interna no cambia al renombrar


async def test_gerente_no_da_de_alta_propiedades(cliente, sesion):
    await entrar_como(cliente, sesion, rol="gerente", propiedades=["chelem"])
    assert (await cliente.post(URL, json=NUEVA, headers=csrf(cliente))).status_code == 403
    assert (await cliente.get(URL)).status_code == 403
