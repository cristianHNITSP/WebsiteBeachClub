"""API pública v1 y sitios web (fase 6, PLAN-BACKEND §4, §7)."""

import uuid
from datetime import timedelta

from sqlalchemy import func, select, text

from app import red
from app.modelos import Auditoria, Aviso, EntregaWebhook, Reserva
from app.servicios import reservas, webhooks
from app.servicios.reservas import hoy
from app.tareas.outbox import despachar
from tests.conftest import csrf, entrar_como
from tests.fabricas import crear_habitacion, propiedad

ORIGEN = "https://hotelesfrida.mx"


async def _sitio(cliente, sesion, *, propiedades=("chelem",), **campos):
    ids = [str((await propiedad(sesion, p)).id) for p in propiedades]
    datos = {"nombre": "Hoteles Frida", "origenes": [ORIGEN], "propiedades": ids, **campos}
    r = await cliente.post("/api/admin/sitios", json=datos, headers=csrf(cliente))
    assert r.status_code == 201, r.text
    return r.json()


def _pk(sitio, **extra):
    return {"X-Frida-Clave": sitio["clave_publica"], **extra}


def _fechas(desde=30, noches=3):
    llegada = hoy() + timedelta(days=desde)
    return str(llegada), str(llegada + timedelta(days=noches))


async def _retener(cliente, sitio, habitacion_id, *, clave=None, desde=30, **extra):
    llegada, salida = _fechas(desde)
    cuerpo = {
        "habitacion_id": str(habitacion_id), "llegada": llegada, "salida": salida, "adultos": 2,
        "huesped_nombre": "Ana Web", "huesped_correo": "ana@correo.mx", **extra,
    }  # fmt: skip
    return await cliente.post(
        "/api/v1/reservas", json=cuerpo, headers=_pk(sitio, **{"Idempotency-Key": str(clave or uuid.uuid4())})
    )


async def test_alta_de_sitio_muestra_secretos_una_vez_y_no_los_audita(cliente, sesion):
    await entrar_como(cliente, sesion)
    s = await _sitio(cliente, sesion)
    assert s["clave_publica"].startswith("pk_test_") and s["clave_secreta"].startswith("sk_test_")
    assert s["secreto_webhooks"].startswith("whsec_")
    assert s["clave_secreta_pista"] == s["clave_secreta"][-4:]
    lista = (await cliente.get("/api/admin/sitios")).json()
    assert "clave_secreta" not in lista[0] and "secreto_webhooks" not in lista[0]
    fila = await sesion.scalar(select(Auditoria).where(Auditoria.accion == "sitio.crear"))
    assert s["clave_secreta"] not in str(fila.despues) and "whsec_" not in str(fila.despues)


async def test_solo_gerente_gestiona_sitios(cliente, sesion):
    await entrar_como(cliente, sesion, rol="recepcion", propiedades=("chelem",))
    assert (await cliente.get("/api/admin/sitios")).status_code == 403


async def test_validaciones_del_sitio(cliente, sesion):
    await entrar_como(cliente, sesion)
    p = str((await propiedad(sesion, "chelem")).id)
    for malo in (
        {"origenes": ["https://hotelesfrida.mx/"]},  # barra final
        {"origenes": ["http://hotelesfrida.mx"]},  # http fuera de localhost
        {"webhook_url": "http://hotelesfrida.mx/hook"},
        {"propiedades": []},
    ):
        datos = {"nombre": "Malo", "propiedades": [p], **malo}
        r = await cliente.post("/api/admin/sitios", json=datos, headers=csrf(cliente))
        assert r.status_code == 422, malo


async def test_sin_clave_o_clave_mala_es_401(cliente, sesion):
    assert (await cliente.get("/api/v1/habitaciones")).json()["codigo"] == "sin_clave"
    r = await cliente.get("/api/v1/habitaciones", headers={"X-Frida-Clave": "pk_test_noexiste"})
    assert r.status_code == 401 and r.json()["codigo"] == "clave_invalida"


async def test_catalogo_solo_de_sus_propiedades_y_activas(cliente, sesion):
    await entrar_como(cliente, sesion)
    a = await crear_habitacion(sesion, "chelem", nombre="Web Activa")
    await crear_habitacion(sesion, "chelem", nombre="Web Mantenimiento", estado="mantenimiento")
    await crear_habitacion(sesion, "chuburna", nombre="Web Otra Propiedad")
    s = await _sitio(cliente, sesion)
    r = await cliente.get("/api/v1/habitaciones", headers=_pk(s))
    assert r.status_code == 200 and r.headers["x-accel-expires"] == "60"
    nombres = {h["nombre"] for h in r.json()}
    assert "Web Activa" in nombres
    assert "Web Mantenimiento" not in nombres and "Web Otra Propiedad" not in nombres
    h = next(h for h in r.json() if h["id"] == str(a.id))
    assert h["propiedad"]["nombre"] == "Cabañas Frida" and h["fotos"] == []


async def test_origen_y_cors(cliente, sesion):
    await entrar_como(cliente, sesion)
    s = await _sitio(cliente, sesion)
    r = await cliente.get("/api/v1/habitaciones", headers=_pk(s, Origin="https://otro.mx"))
    assert r.status_code == 403 and r.json()["codigo"] == "origen_no_permitido"
    assert "access-control-allow-origin" not in r.headers
    r = await cliente.get("/api/v1/habitaciones", headers=_pk(s, Origin=ORIGEN))
    assert r.headers["access-control-allow-origin"] == ORIGEN and r.headers["vary"] == "Origin"
    # Verificación previa: sin clave, cualquier origen de un sitio vigente.
    previa = {"Origin": ORIGEN, "Access-Control-Request-Method": "POST"}
    r = await cliente.options("/api/v1/reservas", headers=previa)
    assert r.status_code == 204 and r.headers["access-control-allow-origin"] == ORIGEN
    assert "Idempotency-Key" in r.headers["access-control-allow-headers"]
    r = await cliente.options("/api/v1/reservas", headers={**previa, "Origin": "https://otro.mx"})
    assert r.status_code == 403


async def test_clave_secreta_de_servidor_a_servidor(cliente, sesion):
    await entrar_como(cliente, sesion)
    s = await _sitio(cliente, sesion)
    auth = {"Authorization": f"Bearer {s['clave_secreta']}", "Origin": "https://cualquiera.mx"}
    assert (await cliente.get("/api/v1/habitaciones", headers=auth)).status_code == 200
    mala = {"Authorization": "Bearer sk_test_otra"}
    assert (await cliente.get("/api/v1/habitaciones", headers=mala)).status_code == 401


async def test_disponibilidad_con_montos_del_servidor(cliente, sesion):
    await entrar_como(cliente, sesion)
    libre = await crear_habitacion(sesion, "chelem", nombre="Web Libre", tarifa_centavos=150000)
    ocupada = await crear_habitacion(sesion, "chelem", nombre="Web Ocupada")
    chica = await crear_habitacion(sesion, "chelem", nombre="Web Chica", capacidad=1)
    s = await _sitio(cliente, sesion)
    assert (await _retener(cliente, s, ocupada.id)).status_code == 201
    llegada, salida = _fechas()
    r = await cliente.get(
        f"/api/v1/disponibilidad?llegada={llegada}&salida={salida}&huespedes=2", headers=_pk(s)
    )
    assert r.status_code == 200 and r.headers["x-accel-expires"] == "5"
    ids = {h["id"] for h in r.json()}
    assert str(libre.id) in ids and str(ocupada.id) not in ids and str(chica.id) not in ids
    h = next(h for h in r.json() if h["id"] == str(libre.id))
    assert h["noches"] == 3 and h["total_centavos"] == 450000
    assert h["pagar_hoy_centavos"] + h["pagar_en_hotel_centavos"] == h["total_centavos"]
    pasada = await cliente.get(
        f"/api/v1/disponibilidad?llegada={hoy() - timedelta(days=1)}&salida={hoy()}", headers=_pk(s)
    )
    assert pasada.json()["codigo"] == "fecha_pasada"


async def test_retener_es_idempotente(cliente, sesion):
    await entrar_como(cliente, sesion)
    h = await crear_habitacion(sesion, "chelem", nombre="Web Idempotente")
    s = await _sitio(cliente, sesion)
    llegada, salida = _fechas()
    sin_clave = await cliente.post(
        "/api/v1/reservas",
        json={"habitacion_id": str(h.id), "llegada": llegada, "salida": salida, "huesped_nombre": "Ana",
              "huesped_correo": "ana@correo.mx"},
        headers=_pk(s),
    )  # fmt: skip
    assert sin_clave.status_code == 422 and sin_clave.json()["codigo"] == "sin_idempotencia"

    clave = uuid.uuid4()
    r1 = await _retener(cliente, s, h.id, clave=clave)
    assert r1.status_code == 201, r1.text
    c = r1.json()
    assert c["estado"] == "retenida" and c["token"] and c["enlace_pago"] is None and c["vence_en"]
    assert r1.headers["cache-control"] == "no-store"
    r2 = await _retener(cliente, s, h.id, clave=clave)
    assert r2.status_code == 201 and r2.json() == c and r2.headers["idempotent-replayed"] == "true"
    cuantas = await sesion.scalar(
        select(func.count()).select_from(Reserva).where(Reserva.habitacion_id == h.id)
    )
    assert cuantas == 1
    otra = await _retener(cliente, s, h.id, clave=clave, huesped_nombre="Otra Persona")
    assert otra.status_code == 422 and otra.json()["codigo"] == "idempotencia_reutilizada"
    # Con otra clave, las mismas noches ya están apartadas.
    choque = await _retener(cliente, s, h.id)
    assert choque.status_code == 409 and choque.json()["codigo"] == "sin_disponibilidad"


async def test_no_reserva_fuera_de_sus_propiedades(cliente, sesion):
    await entrar_como(cliente, sesion)
    ajena = await crear_habitacion(sesion, "chuburna", nombre="Web Ajena")
    s = await _sitio(cliente, sesion)
    assert (await _retener(cliente, s, ajena.id)).status_code == 404


async def test_consultar_y_cancelar_con_token(cliente, sesion):
    await entrar_como(cliente, sesion)
    h = await crear_habitacion(sesion, "chelem", nombre="Web Cancelable")
    s = await _sitio(cliente, sesion)
    otro = await _sitio(cliente, sesion, nombre="Otro sitio")
    c = (await _retener(cliente, s, h.id)).json()
    url = f"/api/v1/reservas/{c['codigo']}"
    r = await cliente.get(f"{url}?t={c['token']}", headers=_pk(s))
    assert r.status_code == 200 and r.json()["token"] is None and r.json()["estado"] == "retenida"
    assert (await cliente.get(f"{url}?t={'x' * 43}", headers=_pk(s))).status_code == 404
    assert (await cliente.get(f"{url}?t={c['token']}", headers=_pk(otro))).status_code == 404

    cancelar = await cliente.post(
        f"{url}/cancelar?t={c['token']}", headers=_pk(s, **{"Idempotency-Key": str(uuid.uuid4())})
    )
    assert cancelar.status_code == 200 and cancelar.json()["estado"] == "cancelada"
    # Las noches quedan libres otra vez.
    assert (await _retener(cliente, s, h.id)).status_code == 201


async def test_confirmada_se_cancela_con_el_hotel(cliente, sesion):
    await entrar_como(cliente, sesion)
    h = await crear_habitacion(sesion, "chelem", nombre="Web Confirmada")
    s = await _sitio(cliente, sesion)
    c = (await _retener(cliente, s, h.id)).json()
    await sesion.execute(
        text("UPDATE reservas SET estado = 'confirmada' WHERE codigo = :c"), {"c": c["codigo"]}
    )
    r = await cliente.post(
        f"/api/v1/reservas/{c['codigo']}/cancelar?t={c['token']}",
        headers=_pk(s, **{"Idempotency-Key": str(uuid.uuid4())}),
    )
    assert r.status_code == 409 and r.json()["codigo"] == "cancelar_con_el_hotel"


async def test_revocar_y_rotar_claves(cliente, sesion):
    await entrar_como(cliente, sesion)
    s = await _sitio(cliente, sesion)
    rotado = (await cliente.post(f"/api/admin/sitios/{s['id']}/rotar-claves", headers=csrf(cliente))).json()
    assert rotado["clave_publica"] != s["clave_publica"] and rotado["clave_secreta"]
    assert (await cliente.get("/api/v1/habitaciones", headers=_pk(s))).status_code == 401  # la vieja ya no
    assert (await cliente.get("/api/v1/habitaciones", headers=_pk(rotado))).status_code == 200
    await cliente.post(f"/api/admin/sitios/{s['id']}/revocar", headers=csrf(cliente))
    assert (await cliente.get("/api/v1/habitaciones", headers=_pk(rotado))).status_code == 401


async def test_retencion_vence_sola_y_avisa_al_sitio(cliente, sesion, monkeypatch):
    await entrar_como(cliente, sesion)
    h = await crear_habitacion(sesion, "chelem", nombre="Web Vence")
    s = await _sitio(cliente, sesion, webhook_url="https://hotelesfrida.mx/webhooks/frida")
    c = (await _retener(cliente, s, h.id)).json()
    await sesion.execute(
        text("UPDATE reservas SET vence_en = now() - interval '1 minute' WHERE codigo = :c"),
        {"c": c["codigo"]},
    )
    assert await sesion.run_sync(reservas.vencer_retenciones) >= 1
    r = await sesion.scalar(select(Reserva).where(Reserva.codigo == c["codigo"]))
    assert r.estado == "expirada"
    await sesion.run_sync(despachar)
    e = await sesion.scalar(select(EntregaWebhook).where(EntregaWebhook.sitio_id == uuid.UUID(s["id"])))
    assert e.tipo == "reserva.expirada" and e.cuerpo["reserva"]["codigo"] == c["codigo"]
    assert "huesped_correo" not in str(e.cuerpo) and "token" not in str(e.cuerpo)
    # La retención nunca avisa a la campana del panel (la mayoría vencen sin pagar).
    assert await sesion.scalar(select(Aviso).where(Aviso.texto.contains("Ana Web"))) is None

    # Se aparta, se manda (aquí, un sitio que no responde) y se reintenta con espera.
    enviadas = []
    monkeypatch.setattr(
        webhooks, "enviar", lambda url, sec, cuerpo: enviadas.append(cuerpo) or (None, "Sin red")
    )
    lote = await sesion.run_sync(webhooks.apartar)
    assert [x[0] for x in lote] == [e.id] and lote[0][2] == s["secreto_webhooks"]
    for _ in range(len(webhooks.ESPERAS) + 1):
        await sesion.run_sync(lambda ss: webhooks.resultado(ss, e.id, None, "Sin red"))
    await sesion.refresh(e)
    assert e.estado == "fallida" and e.intentos == len(webhooks.ESPERAS) + 1
    aviso = await sesion.scalar(select(Aviso).where(Aviso.evento_id == e.id))
    assert aviso.permiso == "sitios.gestionar"
    r = await cliente.post(f"/api/admin/sitios/{s['id']}/entregas/{e.id}/reintentar", headers=csrf(cliente))
    assert r.status_code == 200 and r.json()["estado"] == "pendiente" and r.json()["intentos"] == 0


def test_firma_y_destino_seguro():
    assert webhooks.firma("whsec_x", b'{"a":1}', 1700000000) == webhooks.firma(
        "whsec_x", b'{"a":1}', 1700000000
    )
    assert webhooks.firma("whsec_x", b'{"a":1}', 1) != webhooks.firma("whsec_y", b'{"a":1}', 1)
    assert webhooks.firma("whsec_x", b"{}", 5).startswith("t=5,v1=")
    for url in ("http://ejemplo.mx/h", "https://127.0.0.1/h", "https://10.0.0.5/h", "https://[::1]/h"):
        assert red.destino_seguro(url) is not None, url
