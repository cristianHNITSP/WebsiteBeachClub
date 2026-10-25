"""Reservas del panel (PLAN-BACKEND §5, §6, §17.3): montos que calcula el
servidor, copia del cobro, cero sobreventa, máquina de estados cerrada,
bloqueo optimista, propiedad, permisos e historial."""

from datetime import timedelta

from sqlalchemy import select

from app.modelos import Auditoria, Outbox, ReservaEvento
from app.servicios.reservas import hoy
from tests.conftest import csrf, entrar_como
from tests.fabricas import crear_habitacion, propiedad

URL = "/api/admin/reservas"
D = lambda n: str(hoy() + timedelta(days=n))  # noqa: E731


def nueva(hab, llegada=5, noches=3, **extra):
    return {
        "habitacion_id": str(hab.id),
        "llegada": D(llegada),
        "salida": D(llegada + noches),
        "adultos": 2,
        "huesped_nombre": "Ana Pech",
        "huesped_correo": "ana@correo.mx",
    } | extra


async def reservar(cliente, hab, esperado=201, **kw):
    r = await cliente.post(URL, json=nueva(hab, **kw), headers=csrf(cliente))
    assert r.status_code == esperado, r.text
    return r.json()


async def test_crear_calcula_montos_y_deja_rastro(cliente, sesion):
    await entrar_como(cliente, sesion)
    hab = await crear_habitacion(sesion, tarifa_centavos=150_000)
    r = await reservar(cliente, hab)
    assert r["estado"] == "confirmada" and r["codigo"].startswith("FRD-") and len(r["codigo"]) == 10
    assert (r["noches"], r["total_centavos"], r["modalidad"]) == (3, 450_000, "completo")
    assert (
        r["anticipo_centavos"] == 450_000 and r["saldo_centavos"] == 0 and r["por_cobrar_centavos"] == 450_000
    )
    assert r["habitacion_nombre"] == hab.nombre and r["habitacion_situacion"] == "vigente"
    assert (
        await sesion.scalar(select(ReservaEvento.tipo).where(ReservaEvento.reserva_id == r["id"])) == "crear"
    )
    assert (
        await sesion.scalar(select(Auditoria.accion).where(Auditoria.entidad_id == r["id"]))
        == "reserva.crear"
    )
    assert await sesion.scalar(select(Outbox.tipo).where(Outbox.agregado_id == r["id"])) == "reserva.creada"


async def test_el_cliente_no_manda_montos(cliente, sesion):
    await entrar_como(cliente, sesion)
    hab = await crear_habitacion(sesion)
    r = await cliente.post(URL, json=nueva(hab, total_centavos=1), headers=csrf(cliente))
    assert r.status_code == 422  # campo fuera del contrato


async def test_anticipo_por_propiedad_y_cada_reserva_guarda_su_copia(cliente, sesion):
    await entrar_como(cliente, sesion)
    chuburna = await propiedad(sesion, "chuburna")
    hab = await crear_habitacion(sesion, "chuburna", tarifa_centavos=100_000)
    antes = await reservar(cliente, hab, llegada=2)
    r = await cliente.put(
        f"/api/admin/ajustes/cobro/{chuburna.id}",
        json={"modalidad": "anticipo", "porcentaje_anticipo": 30},
        headers=csrf(cliente),
    )
    assert r.status_code == 200 and r.json()["porcentaje_anticipo"] == 30
    despues = await reservar(
        cliente, hab, llegada=10, noches=1, pago_inicial={"metodo": "tarjeta", "referencia": "T-1"}
    )
    assert (despues["modalidad"], despues["anticipo_centavos"], despues["saldo_centavos"]) == (
        "anticipo",
        30_000,
        70_000,
    )
    assert despues["pagado_centavos"] == 30_000  # el anticipo se cobró al capturarla
    viejo = (await cliente.get(f"{URL}/{antes['id']}")).json()
    assert viejo["modalidad"] == "completo"  # cambiar el ajuste no toca lo ya reservado
    assert [p["concepto"] for p in (await cliente.get(f"{URL}/{despues['id']}")).json()["pagos"]] == [
        "anticipo"
    ]
    cambio = await sesion.scalar(select(Auditoria.antes).where(Auditoria.accion == "cobro.cambiar"))
    assert cambio == {"modalidad": "completo", "porcentaje_anticipo": None}


async def test_cotizar(cliente, sesion):
    await entrar_como(cliente, sesion)
    hab = await crear_habitacion(sesion, tarifa_centavos=99_999)
    q = {"habitacion_id": str(hab.id), "llegada": D(3), "salida": D(5)}
    c = (await cliente.get(f"{URL}/cotizar", params=q)).json()
    assert (c["total_centavos"], c["disponible"]) == (199_998, True)
    await reservar(cliente, hab, llegada=4, noches=2)
    c = (await cliente.get(f"{URL}/cotizar", params=q)).json()
    assert c["disponible"] is False and "Ana Pech" in c["choque"]


async def test_cero_sobreventa_y_noches_contiguas(cliente, sesion):
    await entrar_como(cliente, sesion)
    hab = await crear_habitacion(sesion)
    await reservar(cliente, hab, llegada=5, noches=3)
    r = await cliente.post(URL, json=nueva(hab, llegada=6, noches=1), headers=csrf(cliente))
    assert (
        r.status_code == 409
        and r.json()["codigo"] == "sin_disponibilidad"
        and "Ana Pech" in r.json()["error"]
    )
    await reservar(cliente, hab, llegada=8, noches=2)  # llega el día que el otro se va: sí
    await reservar(cliente, hab, llegada=3, noches=2)  # se va el día que el otro llega: sí


async def test_cancelar_libera_las_noches(cliente, sesion):
    await entrar_como(cliente, sesion)
    hab = await crear_habitacion(sesion)
    r = await reservar(cliente, hab)
    c = await cliente.post(
        f"{URL}/{r['id']}/cancelar",
        json={"version": r["version"], "motivo": "No viene"},
        headers=csrf(cliente),
    )
    assert (
        c.status_code == 200
        and c.json()["estado"] == "cancelada"
        and c.json()["motivo_cancelacion"] == "No viene"
    )
    await reservar(cliente, hab)
    again = await cliente.post(
        f"{URL}/{r['id']}/cancelar", json={"version": c.json()["version"]}, headers=csrf(cliente)
    )
    assert again.status_code == 409 and again.json()["codigo"] == "transicion"


async def test_bloqueo_y_habitacion_en_mantenimiento(cliente, sesion):
    await entrar_como(cliente, sesion)
    hab = await crear_habitacion(sesion, estado="mantenimiento")
    r = await cliente.post(URL, json=nueva(hab), headers=csrf(cliente))
    assert r.status_code == 422 and r.json()["codigo"] == "habitacion_no_disponible"
    b = await cliente.post(
        URL,
        json={
            "tipo": "bloqueo",
            "habitacion_id": str(hab.id),
            "llegada": D(5),
            "salida": D(8),
            "notas": "Pintura",
        },
        headers=csrf(cliente),
    )
    assert b.status_code == 201 and b.json()["total_centavos"] == 0 and b.json()["tipo"] == "bloqueo"
    p = await cliente.post(
        f"{URL}/{b.json()['id']}/pagos",
        json={"concepto": "abono", "metodo": "efectivo", "monto_centavos": 1},
        headers=csrf(cliente),
    )
    assert p.status_code == 422


async def test_validaciones(cliente, sesion):
    await entrar_como(cliente, sesion)
    hab = await crear_habitacion(sesion, capacidad=2)
    casos = [
        (nueva(hab, adultos=2, ninos=1), "capacidad"),
        (nueva(hab, llegada=-1), "fecha_pasada"),
        (nueva(hab, noches=0), "validacion"),
        (nueva(hab, noches=61), "validacion"),
        (nueva(hab, huesped_nombre=None), "validacion"),
        (nueva(hab, huesped_correo="no-es-correo"), "validacion"),
    ]
    for cuerpo, codigo in casos:
        r = await cliente.post(URL, json=cuerpo, headers=csrf(cliente))
        assert r.status_code == 422 and r.json()["codigo"] == codigo, (cuerpo, r.text)


async def test_mover_respeta_lo_pactado_y_la_version(cliente, sesion):
    await entrar_como(cliente, sesion)
    hab = await crear_habitacion(sesion, tarifa_centavos=100_000)
    otra = await crear_habitacion(sesion, tarifa_centavos=999_999)
    r = await reservar(cliente, hab, llegada=5, noches=2)
    m = await cliente.put(
        f"{URL}/{r['id']}/fechas",
        json={"habitacion_id": str(otra.id), "llegada": D(5), "salida": D(8), "version": r["version"]},
        headers=csrf(cliente),
    )
    assert m.status_code == 200, m.text
    m = m.json()
    # 3 noches a la tarifa PACTADA (100 mil), no a la de la otra habitación.
    assert (m["habitacion_id"], m["noches"], m["total_centavos"]) == (str(otra.id), 3, 300_000)
    viejo = await cliente.put(
        f"{URL}/{r['id']}/fechas",
        json={"habitacion_id": str(hab.id), "llegada": D(5), "salida": D(6), "version": r["version"]},
        headers=csrf(cliente),
    )
    assert viejo.status_code == 409 and viejo.json()["codigo"] == "version"
    await reservar(cliente, hab, llegada=10, noches=2)
    choque = await cliente.put(
        f"{URL}/{r['id']}/fechas",
        json={"habitacion_id": str(hab.id), "llegada": D(9), "salida": D(11), "version": m["version"]},
        headers=csrf(cliente),
    )
    assert choque.status_code == 409 and choque.json()["codigo"] == "sin_disponibilidad"
    ajena = await crear_habitacion(sesion, "chuburna")
    lejos = await cliente.put(
        f"{URL}/{r['id']}/fechas",
        json={"habitacion_id": str(ajena.id), "llegada": D(5), "salida": D(8), "version": m["version"]},
        headers=csrf(cliente),
    )
    assert lejos.status_code == 422 and lejos.json()["codigo"] == "otra_propiedad"
    tipos = (await cliente.get(f"{URL}/{r['id']}/historial")).json()
    assert [e["tipo"] for e in tipos] == ["crear", "mover"]


async def test_estancia_completa_llegada_cobro_y_salida(cliente, sesion):
    await entrar_como(cliente, sesion)
    hab = await crear_habitacion(sesion, tarifa_centavos=100_000)
    futura = await reservar(cliente, hab, llegada=5, noches=1)
    temprano = await cliente.post(f"{URL}/{futura['id']}/llegada", json={"version": 1}, headers=csrf(cliente))
    assert temprano.status_code == 422 and temprano.json()["codigo"] == "fuera_de_fecha"

    r = await reservar(cliente, hab, llegada=0, noches=2)  # llega hoy
    r = (
        await cliente.post(f"{URL}/{r['id']}/llegada", json={"version": r["version"]}, headers=csrf(cliente))
    ).json()
    assert r["estado"] == "en_curso"
    corrida = await cliente.put(
        f"{URL}/{r['id']}/fechas",
        json={"habitacion_id": str(hab.id), "llegada": D(1), "salida": D(3), "version": r["version"]},
        headers=csrf(cliente),
    )
    assert corrida.status_code == 422 and corrida.json()["codigo"] == "en_curso"
    sin_pagar = await cliente.post(
        f"{URL}/{r['id']}/salida", json={"version": r["version"]}, headers=csrf(cliente)
    )
    assert sin_pagar.status_code == 422 and sin_pagar.json()["codigo"] == "saldo_pendiente"
    pago = lambda monto: cliente.post(  # noqa: E731
        f"{URL}/{r['id']}/pagos",
        json={"concepto": "saldo", "metodo": "efectivo", "monto_centavos": monto},
        headers=csrf(cliente),
    )
    assert (await pago(200_001)).json()["codigo"] == "excede"
    r = (await pago(200_000)).json()
    assert r["pagado_centavos"] == 200_000 and r["por_cobrar_centavos"] == 0
    r = (
        await cliente.post(f"{URL}/{r['id']}/salida", json={"version": r["version"]}, headers=csrf(cliente))
    ).json()
    assert r["estado"] == "completada"
    tarde = await cliente.post(
        f"{URL}/{r['id']}/cancelar", json={"version": r["version"]}, headers=csrf(cliente)
    )
    assert tarde.status_code == 409 and tarde.json()["codigo"] == "transicion"
    eventos = [
        (e["tipo"], e["de_estado"], e["a_estado"])
        for e in (await cliente.get(f"{URL}/{r['id']}/historial")).json()
    ]
    assert eventos == [
        ("crear", None, "confirmada"),
        ("llegada", "confirmada", "en_curso"),
        ("pago", None, "en_curso"),
        ("salida", "en_curso", "completada"),
    ]


async def test_lista_por_ventana_y_propiedad(cliente, sesion):
    await entrar_como(cliente, sesion)
    de_chelem = await crear_habitacion(sesion, "chelem")
    de_chuburna = await crear_habitacion(sesion, "chuburna")
    a = await reservar(cliente, de_chelem, llegada=5)
    b = await reservar(cliente, de_chuburna, llegada=5)
    ventana = {"desde": D(0), "hasta": D(30)}
    assert {x["id"] for x in (await cliente.get(URL, params=ventana)).json()} == {a["id"], b["id"]}
    assert (await cliente.get(URL, params={"desde": D(20), "hasta": D(30)})).json() == []
    cliente.cookies.clear()
    await entrar_como(cliente, sesion, rol="recepcion", propiedades=["chelem"])
    assert [x["id"] for x in (await cliente.get(URL, params=ventana)).json()] == [a["id"]]
    assert (await cliente.get(f"{URL}/{b['id']}")).status_code == 404
    assert (
        await cliente.post(URL, json=nueva(de_chuburna, llegada=15), headers=csrf(cliente))
    ).status_code == 404
    chelem = await propiedad(sesion, "chelem")
    r = await cliente.put(
        f"/api/admin/ajustes/cobro/{chelem.id}", json={"modalidad": "completo"}, headers=csrf(cliente)
    )
    assert r.status_code == 403  # recepción no cambia el cobro


async def test_una_reserva_de_habitacion_eliminada_dice_donde_esta(cliente, sesion):
    await entrar_como(cliente, sesion)
    hab = await crear_habitacion(sesion)
    r = await reservar(cliente, hab)
    await cliente.post(f"{URL}/{r['id']}/cancelar", json={"version": r["version"]}, headers=csrf(cliente))
    await cliente.delete(f"/api/admin/habitaciones/{hab.id}", headers=csrf(cliente))
    await cliente.delete(
        f"/api/admin/habitaciones/{hab.id}", params={"definitivo": "true"}, headers=csrf(cliente)
    )
    vista = (await cliente.get(f"{URL}/{r['id']}")).json()
    assert (vista["habitacion_nombre"], vista["habitacion_situacion"]) == (hab.nombre, "eliminado_definitivo")
