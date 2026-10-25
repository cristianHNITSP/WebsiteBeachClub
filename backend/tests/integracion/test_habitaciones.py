"""Habitaciones del panel: permisos, acceso por propiedad (servicio + RLS),
bloqueo optimista y papelera (PLAN-BACKEND §11.1, §6.3, §19)."""

from sqlalchemy import func, select, text

from app.modelos import Auditoria
from tests.conftest import csrf, entrar_como
from tests.fabricas import propiedad

URL = "/api/admin/habitaciones"


def datos(propiedad_id, **cambios):
    base = {
        "propiedad_id": str(propiedad_id),
        "nombre": "Suite Coral",
        "tipo": "Suite",
        "capacidad": 2,
        "tarifa_centavos": 320_000,
        "amenidades": ["Wi-Fi", "A/C", "Wi-Fi"],
    }
    return base | cambios


async def crear(cliente, propiedad_id, **cambios):
    r = await cliente.post(URL, json=datos(propiedad_id, **cambios), headers=csrf(cliente))
    assert r.status_code == 201, r.text
    return r.json()


async def test_gerente_crea_lista_y_obtiene(cliente, sesion):
    await entrar_como(cliente, sesion)
    chelem = await propiedad(sesion, "chelem")
    h = await crear(cliente, chelem.id)
    assert h["version"] == 1 and h["estado"] == "activa" and h["amenidades"] == ["Wi-Fi", "A/C"]
    lista = (await cliente.get(URL)).json()
    assert [x["id"] for x in lista["items"]] == [h["id"]]
    assert lista["meta"] == {"total": 1, "pagina": 1, "por_pagina": 20, "paginas": 1}
    assert (await cliente.get(f"{URL}/{h['id']}")).json()["nombre"] == "Suite Coral"
    accion = await sesion.scalar(select(Auditoria.accion).where(Auditoria.entidad_id == h["id"]))
    assert accion == "habitacion.crear"


async def test_recepcion_ve_pero_no_edita(cliente, sesion):
    await entrar_como(cliente, sesion, rol="recepcion", propiedades=["chelem"])
    chelem = await propiedad(sesion, "chelem")
    assert (await cliente.get(URL)).status_code == 200
    r = await cliente.post(URL, json=datos(chelem.id), headers=csrf(cliente))
    assert r.status_code == 403 and r.json()["codigo"] == "sin_permiso"


async def test_sin_sesion_401_y_sin_csrf_403(cliente, sesion):
    assert (await cliente.get(URL)).status_code == 401
    await entrar_como(cliente, sesion)
    chelem = await propiedad(sesion, "chelem")
    assert (await cliente.post(URL, json=datos(chelem.id))).status_code == 403


async def test_empleado_de_una_propiedad_no_ve_ni_toca_la_otra(cliente, sesion):
    await entrar_como(cliente, sesion)  # el gerente crea una en cada propiedad
    chelem, chuburna = await propiedad(sesion, "chelem"), await propiedad(sesion, "chuburna")
    de_chelem = await crear(cliente, chelem.id, nombre="Cabaña Manglar")
    ajena = await crear(cliente, chuburna.id, nombre="Villa Sunset")
    cliente.cookies.clear()

    # Un gerente "de una sola propiedad" (permisos de editar) sin propiedades.todas:
    # se simula con recepcion para leer y con el servicio para escribir (abajo).
    await entrar_como(cliente, sesion, rol="recepcion", propiedades=["chelem"])
    assert [x["id"] for x in (await cliente.get(URL)).json()["items"]] == [de_chelem["id"]]
    assert (await cliente.get(f"{URL}/{ajena['id']}")).status_code == 404  # 404, no 403
    r = await cliente.get(URL, params={"propiedad": str(chuburna.id)})
    assert r.status_code == 404
    assert (await cliente.get(URL, params={"propiedad": str(chelem.id)})).status_code == 200


async def test_gerente_filtra_por_propiedad(cliente, sesion):
    await entrar_como(cliente, sesion)
    chelem, chuburna = await propiedad(sesion, "chelem"), await propiedad(sesion, "chuburna")
    await crear(cliente, chelem.id, nombre="Alfa")
    await crear(cliente, chuburna.id, nombre="Beta")
    r = await cliente.get(URL, params={"propiedad": str(chuburna.id)})
    assert [x["nombre"] for x in r.json()["items"]] == ["Beta"]
    assert len((await cliente.get(URL)).json()["items"]) == 2


async def test_la_base_no_entrega_filas_de_otra_propiedad_aunque_falte_el_filtro(cliente, sesion):
    """Segunda barrera (RLS): una consulta SIN filtro de propiedad, como la de un
    descuido en el código, solo ve lo permitido en `app.propiedades`."""
    await entrar_como(cliente, sesion)
    chelem, chuburna = await propiedad(sesion, "chelem"), await propiedad(sesion, "chuburna")
    await crear(cliente, chelem.id, nombre="Alfa")
    await crear(cliente, chuburna.id, nombre="Beta")
    contar = text("SELECT count(*) FROM habitaciones")
    await sesion.execute(select(func.set_config("app.propiedades", str(chelem.id), True)))
    assert await sesion.scalar(contar) == 1
    await sesion.execute(select(func.set_config("app.propiedades", "", True)))
    assert await sesion.scalar(contar) == 0  # sin alcance no se ve nada
    await sesion.execute(select(func.set_config("app.propiedades", "*", True)))
    assert await sesion.scalar(contar) == 2


async def test_rls_impide_escribir_en_otra_propiedad(sesion):
    chelem, chuburna = await propiedad(sesion, "chelem"), await propiedad(sesion, "chuburna")
    await sesion.execute(select(func.set_config("app.propiedades", str(chelem.id), True)))
    insertar = text(
        "INSERT INTO habitaciones (propiedad_id, nombre, tipo, capacidad, tarifa_centavos) "
        "VALUES (:p, 'X', 'Suite', 2, 100)"
    )
    try:
        async with sesion.begin_nested():
            await sesion.execute(insertar, {"p": chuburna.id})
        raise AssertionError("debió rechazarse")
    except Exception as e:
        assert "row-level security" in str(e)


async def test_busqueda_estado_y_paginas(cliente, sesion):
    await entrar_como(cliente, sesion)
    chelem = await propiedad(sesion, "chelem")
    for n in ("Suite Coral", "Suite 100%", "Cabaña", "Estudio"):
        await crear(cliente, chelem.id, nombre=n, estado="mantenimiento" if n == "Cabaña" else "activa")
    assert [x["nombre"] for x in (await cliente.get(URL, params={"q": "100%"})).json()["items"]] == [
        "Suite 100%"
    ]
    assert len((await cliente.get(URL, params={"q": "suite"})).json()["items"]) == 2
    r = await cliente.get(URL, params={"estado": "mantenimiento"})
    assert [x["nombre"] for x in r.json()["items"]] == ["Cabaña"]
    r = (await cliente.get(URL, params={"por_pagina": 3, "pagina": 2})).json()
    assert len(r["items"]) == 1 and r["meta"]["paginas"] == 2 and r["meta"]["total"] == 4


async def test_editar_con_version_vieja_da_409(cliente, sesion):
    await entrar_como(cliente, sesion)
    chelem = await propiedad(sesion, "chelem")
    h = await crear(cliente, chelem.id)
    cambio = datos(chelem.id, nombre="Suite Coral Grande", version=1)
    del cambio["propiedad_id"]
    r = await cliente.put(f"{URL}/{h['id']}", json=cambio, headers=csrf(cliente))
    assert r.status_code == 200 and r.json()["version"] == 2
    r = await cliente.put(f"{URL}/{h['id']}", json=cambio, headers=csrf(cliente))  # aún con version=1
    assert r.status_code == 409 and r.json()["codigo"] == "version"


async def test_nombre_repetido_en_la_misma_propiedad(cliente, sesion):
    await entrar_como(cliente, sesion)
    chelem, chuburna = await propiedad(sesion, "chelem"), await propiedad(sesion, "chuburna")
    await crear(cliente, chelem.id, nombre="Suite Coral")
    r = await cliente.post(URL, json=datos(chelem.id, nombre="SUITE CORAL"), headers=csrf(cliente))
    assert r.status_code == 409 and r.json()["codigo"] == "nombre_repetido"
    await crear(cliente, chuburna.id, nombre="Suite Coral")  # en otra propiedad, sí


async def test_entrada_estricta(cliente, sesion):
    await entrar_como(cliente, sesion)
    chelem = await propiedad(sesion, "chelem")
    for malo in (
        datos(chelem.id, extra="x"),  # campo fuera del contrato
        datos(chelem.id, nombre="Suite\x00Coral"),  # carácter de control
        datos(chelem.id, tarifa_centavos=0),
        datos(chelem.id, amenidades=["Helipuerto"]),
    ):
        r = await cliente.post(URL, json=malo, headers=csrf(cliente))
        assert r.status_code == 422, malo


async def test_papelera_restaurar_y_borrado_definitivo(cliente, sesion):
    await entrar_como(cliente, sesion)
    chelem = await propiedad(sesion, "chelem")
    h = await crear(cliente, chelem.id)
    url = f"{URL}/{h['id']}"

    r = await cliente.delete(url, params={"definitivo": "true"}, headers=csrf(cliente))
    assert r.status_code == 422 and r.json()["codigo"] == "no_en_papelera"  # dos pasos siempre

    assert (
        await cliente.delete(url, params={"motivo": "duplicada"}, headers=csrf(cliente))
    ).status_code == 204
    assert (await cliente.delete(url, headers=csrf(cliente))).status_code == 204  # idempotente
    assert (await cliente.get(URL)).json()["items"] == []  # fuera de las listas
    # …pero quien la enlace (reservas, historial) sabe qué es y dónde está.
    assert (await cliente.get(url)).json()["situacion"] == "en_papelera"
    cambio = datos(chelem.id, version=2)
    del cambio["propiedad_id"]
    assert (await cliente.put(url, json=cambio, headers=csrf(cliente))).status_code == 404  # no se edita
    papelera = (await cliente.get(f"{URL}/papelera")).json()
    assert [(x["id"], x["motivo"]) for x in papelera["items"]] == [(h["id"], "duplicada")]

    # Su nombre queda libre; restaurarla con el nombre ocupado da 409.
    otra = await crear(cliente, chelem.id)
    r = await cliente.post(f"{url}/restaurar", headers=csrf(cliente))
    assert r.status_code == 409 and r.json()["codigo"] == "nombre_repetido"
    await cliente.delete(f"{URL}/{otra['id']}", headers=csrf(cliente))
    r = await cliente.post(f"{url}/restaurar", headers=csrf(cliente))
    assert r.status_code == 200 and r.json()["situacion"] == "vigente"

    # Borrado definitivo = lápida: sale de la papelera, pero la fila (id y nombre)
    # se queda para que el historial siga diciendo qué era.
    await cliente.delete(url, headers=csrf(cliente))
    r = await cliente.delete(url, params={"definitivo": "true"}, headers=csrf(cliente))
    assert r.status_code == 204
    assert (
        await cliente.delete(url, params={"definitivo": "true"}, headers=csrf(cliente))
    ).status_code == 204
    ids = [x["id"] for x in (await cliente.get(f"{URL}/papelera")).json()["items"]]
    assert ids == [otra["id"]]
    lapida = (await cliente.get(url)).json()
    assert lapida["situacion"] == "eliminado_definitivo" and lapida["nombre"] == "Suite Coral"
    assert lapida["amenidades"] == [] and lapida["descripcion"] == ""  # sin su contenido
    r = await cliente.post(f"{url}/restaurar", headers=csrf(cliente))
    assert r.status_code == 409 and r.json()["codigo"] == "eliminado_definitivo"
    acciones = (await sesion.scalars(select(Auditoria.accion).where(Auditoria.entidad_id == h["id"]))).all()
    assert {"habitacion.eliminar", "habitacion.restaurar", "habitacion.borrar_definitivo"} <= set(acciones)


async def test_papelera_por_cursor(cliente, sesion):
    await entrar_como(cliente, sesion)
    chelem = await propiedad(sesion, "chelem")
    for n in ("Alfa", "Beta", "Gama"):
        h = await crear(cliente, chelem.id, nombre=n)
        await cliente.delete(f"{URL}/{h['id']}", headers=csrf(cliente))
    p1 = (await cliente.get(f"{URL}/papelera", params={"limite": 2})).json()
    assert [x["nombre"] for x in p1["items"]] == ["Gama", "Beta"] and p1["meta"]["siguiente"]
    p2 = (
        await cliente.get(f"{URL}/papelera", params={"limite": 2, "cursor": p1["meta"]["siguiente"]})
    ).json()
    assert [x["nombre"] for x in p2["items"]] == ["Alfa"] and p2["meta"]["siguiente"] is None
    assert (await cliente.get(f"{URL}/papelera", params={"cursor": "basura"})).status_code == 422


async def test_recepcion_no_ve_la_papelera(cliente, sesion):
    await entrar_como(cliente, sesion, rol="recepcion", propiedades=["chelem"])
    assert (await cliente.get(f"{URL}/papelera")).status_code == 403


async def test_la_base_exige_papelera_antes_del_definitivo(cliente, sesion):
    """Los dos pasos los garantiza también Postgres (CHECK `lapida`)."""
    await entrar_como(cliente, sesion)
    chelem = await propiedad(sesion, "chelem")
    h = await crear(cliente, chelem.id)
    try:
        async with sesion.begin_nested():
            await sesion.execute(
                text("UPDATE habitaciones SET purgado_en = now() WHERE id = :i"), {"i": h["id"]}
            )
        raise AssertionError("debió rechazarse")
    except Exception as e:
        assert "ck_habitaciones_lapida" in str(e)
