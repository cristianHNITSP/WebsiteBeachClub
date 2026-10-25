"""Login del panel (PLAN-BACKEND §11, BACKEND-USUARIOS-Y-PERMISOS §4–§5)."""

from datetime import timedelta

from sqlalchemy import select, update

from app.conexion_redis import redis
from app.modelos import Auditoria, SesionUsuario
from app.servicios.auth import ahora
from tests.conftest import csrf, reemplazar_cookie
from tests.fabricas import CLAVE, crear_usuario


async def entrar(cliente, identificador, clave=CLAVE, recordar=False):
    return await cliente.post(
        "/api/auth/entrar", json={"identificador": identificador, "clave": clave, "recordar": recordar}
    )


async def test_entrar_devuelve_sesion_y_pone_cookies_seguras(cliente, sesion):
    u = await crear_usuario(sesion, rol="gerente")
    r = await entrar(cliente, u.usuario)
    assert r.status_code == 200, r.text
    cuerpo = r.json()
    assert cuerpo["rol"] == "gerente" and cuerpo["todas_las_propiedades"] is True
    assert {p["clave"] for p in cuerpo["propiedades"]} == {"chelem", "chuburna"}
    galletas = r.headers.get_list("set-cookie")
    acceso = next(c for c in galletas if c.startswith("frida_acceso="))
    renovacion = next(c for c in galletas if c.startswith("frida_renovacion="))
    for c in (acceso, renovacion):
        assert "HttpOnly" in c and "Secure" in c and "SameSite=strict" in c
    assert "Path=/api" in acceso and "Path=/api/auth/renovar" in renovacion
    assert "Max-Age" not in acceso  # sin "Mantener la sesión": cookie de sesión del navegador


async def test_recordar_hace_cookies_persistentes_de_12_horas(cliente, sesion):
    u = await crear_usuario(sesion)
    r = await entrar(cliente, u.usuario, recordar=True)
    acceso = next(c for c in r.headers.get_list("set-cookie") if c.startswith("frida_acceso="))
    max_age = int(acceso.split("Max-Age=")[1].split(";")[0])
    assert 11 * 3600 < max_age <= 12 * 3600


async def test_entra_por_correo_y_sin_distinguir_mayusculas(cliente, sesion):
    u = await crear_usuario(sesion)
    assert (await entrar(cliente, u.correo.upper())).status_code == 200
    assert (await entrar(cliente, u.usuario.upper())).status_code == 200


async def test_mismo_mensaje_si_la_clave_falla_o_el_usuario_no_existe(cliente, sesion):
    u = await crear_usuario(sesion)
    mala = await entrar(cliente, u.usuario, clave="no-es-esta-clave")
    nadie = await entrar(cliente, "no-existe-nadie", clave="no-es-esta-clave")
    assert mala.status_code == nadie.status_code == 401
    assert mala.json() == nadie.json()  # nunca revela qué cuentas existen


async def test_usuario_desactivado_no_entra(cliente, sesion):
    u = await crear_usuario(sesion, activo=False)
    r = await entrar(cliente, u.usuario)
    assert r.status_code == 401 and r.json()["codigo"] == "credenciales"


async def test_huesped_no_entra_al_panel(cliente, sesion):
    u = await crear_usuario(sesion, rol="huesped")
    r = await entrar(cliente, u.usuario)
    assert r.status_code == 403 and r.json()["codigo"] == "no_es_personal"


async def test_cinco_fallos_bloquean_aunque_luego_la_clave_sea_buena(cliente, sesion):
    u = await crear_usuario(sesion)
    for _ in range(5):
        assert (await entrar(cliente, u.usuario, clave="equivocada-123")).status_code == 401
    r = await entrar(cliente, u.usuario)
    assert r.status_code == 429
    assert int(r.headers["Retry-After"]) > 0 and r.json()["codigo"] == "demasiados_intentos"


async def test_yo_con_sesion_y_sin_ella(cliente, sesion):
    assert (await cliente.get("/api/auth/yo")).status_code == 401
    u = await crear_usuario(sesion, rol="recepcion", propiedades=["chelem"])
    await entrar(cliente, u.usuario)
    r = await cliente.get("/api/auth/yo")
    assert r.status_code == 200
    cuerpo = r.json()
    assert [p["clave"] for p in cuerpo["propiedades"]] == ["chelem"]  # solo a la que tiene acceso
    assert cuerpo["todas_las_propiedades"] is False
    assert "usuarios.gestionar" not in cuerpo["permisos"]


async def test_salir_exige_csrf_y_luego_el_token_no_sirve(cliente, sesion):
    u = await crear_usuario(sesion)
    await entrar(cliente, u.usuario)
    sin = await cliente.post("/api/auth/salir")
    assert sin.status_code == 403 and sin.json()["codigo"] == "csrf"
    acceso_viejo = cliente.cookies.get("frida_acceso")
    assert (await cliente.post("/api/auth/salir", headers=csrf(cliente))).status_code == 204
    # Aunque alguien conserve el token de acceso (aún no vence), ya no sirve: Redis lo sabe.
    reemplazar_cookie(cliente, "frida_acceso", acceso_viejo, "/api")
    assert (await cliente.get("/api/auth/yo")).status_code == 401


async def test_renovar_rota_y_un_token_viejo_cierra_la_sesion(cliente, sesion):
    u = await crear_usuario(sesion)
    await entrar(cliente, u.usuario)
    # Lo que tenía "la otra pestaña" antes de que esta renovara: token Y su CSRF.
    viejo, csrf_viejo = cliente.cookies.get("frida_renovacion"), csrf(cliente, renovacion=True)
    r = await cliente.post("/api/auth/renovar", headers=csrf_viejo)
    assert r.status_code == 200, r.text
    nuevo, csrf_nuevo = cliente.cookies.get("frida_renovacion"), csrf(cliente, renovacion=True)
    assert nuevo != viejo

    # Dentro de los 30 s: otra pestaña con lo viejo. "Ya renovada", sin cerrar nada.
    reemplazar_cookie(cliente, "frida_renovacion", viejo, "/api/auth/renovar")
    r = await cliente.post("/api/auth/renovar", headers=csrf_viejo)
    assert r.status_code == 409 and r.json()["codigo"] == "ya_renovada"

    # Pasada la gracia: un token viejo = copiado. Se cierra la sesión entera...
    await sesion.execute(update(SesionUsuario).values(rotada_en=ahora() - timedelta(minutes=5)))
    r = await cliente.post("/api/auth/renovar", headers=csrf_viejo)
    assert r.status_code == 401 and r.json()["codigo"] == "token_reusado"
    # ...así que ni el token bueno sirve ya. Y queda guardado en la BASE, no solo
    # en Redis (que olvida a los 20 min): se simula vaciando Redis.
    await redis.flushdb()
    reemplazar_cookie(cliente, "frida_renovacion", nuevo, "/api/auth/renovar")
    assert (await cliente.post("/api/auth/renovar", headers=csrf_nuevo)).status_code == 401
    assert await sesion.scalar(select(SesionUsuario.revocada).where(SesionUsuario.usuario_id == u.id))


async def test_la_sesion_dura_12_horas_aunque_se_renueve(cliente, sesion):
    u = await crear_usuario(sesion)
    r = await entrar(cliente, u.usuario)
    assert r.json()["vence"]
    await sesion.execute(update(SesionUsuario).values(vence=ahora() - timedelta(seconds=1)))
    r = await cliente.post("/api/auth/renovar", headers=csrf(cliente, renovacion=True))
    assert r.status_code == 401 and r.json()["codigo"] == "sesion_vencida"


async def test_sesiones_abiertas_y_cerrar_todas(cliente, sesion):
    u = await crear_usuario(sesion)
    await entrar(cliente, u.usuario)
    r = await cliente.get("/api/auth/sesiones")
    assert r.status_code == 200 and len(r.json()) == 1 and r.json()[0]["actual"] is True
    assert (await cliente.post("/api/auth/salir-de-todas", headers=csrf(cliente))).status_code == 204
    revocadas = (await sesion.execute(select(SesionUsuario.revocada))).scalars().all()
    assert revocadas == [True]


async def test_cerrar_una_sesion_ajena_responde_404(cliente, sesion):
    u = await crear_usuario(sesion)
    await entrar(cliente, u.usuario)
    otra = "0199a000-0000-7000-8000-000000000000"
    r = await cliente.delete(f"/api/auth/sesiones/{otra}", headers=csrf(cliente))
    assert r.status_code == 404


async def test_entrar_queda_en_la_auditoria(cliente, sesion):
    u = await crear_usuario(sesion)
    await entrar(cliente, u.usuario)
    acciones = (
        (await sesion.execute(select(Auditoria.accion).where(Auditoria.usuario_id == u.id))).scalars().all()
    )
    assert acciones == ["sesion.iniciar"]


async def test_entrada_con_campos_de_mas_es_422(cliente, sesion):
    r = await cliente.post("/api/auth/entrar", json={"identificador": "x", "clave": "y", "rol": "gerente"})
    assert r.status_code == 422 and r.json()["codigo"] == "validacion"
