"""Fichas del hotel en otras plataformas: alta, lectura del bot (sin saltarse nada) e importación."""

from contextlib import contextmanager

from sqlalchemy import select

from app import red
from app.modelos import AjustesBot, FichaExterna
from app.servicios import bot
from app.tareas import externas as tarea
from tests.conftest import csrf, entrar_como
from tests.fabricas import abrir_alcance, propiedad
from tests.unitarias.test_fichas import FICHA, pagina

SUCIA = "https://www.booking.com/hotel/mx/casa-frida-chelem.es-mx.html?chal_t=1793881895624&force_referer=x"


async def test_alta_con_enlace_limpio_y_permisos(cliente, sesion):
    p = await propiedad(sesion, "chelem")
    await entrar_como(cliente, sesion, rol="recepcion", propiedades=("chelem",))
    cuerpo = {"propiedad_id": str(p.id), "url": SUCIA}
    assert (
        await cliente.post("/api/admin/externas/fichas", json=cuerpo, headers=csrf(cliente))
    ).status_code == 403

    await entrar_como(cliente, sesion)
    r = await cliente.post("/api/admin/externas/fichas", json=cuerpo, headers=csrf(cliente))
    assert r.status_code == 201, r.text
    assert r.json()["url"] == "https://www.booking.com/hotel/mx/casa-frida-chelem.es-mx.html"
    assert r.json()["canal"] == "booking" and r.json()["estado"] == "pendiente"
    lista = await cliente.get(
        "/api/admin/externas/fichas"
    )  # el listado respeta el acceso por propiedad (RLS)
    assert [f["id"] for f in lista.json()] == [r.json()["id"]]
    otra = await cliente.post("/api/admin/externas/fichas", json=cuerpo, headers=csrf(cliente))
    assert otra.status_code == 409 and otra.json()["codigo"] == "duplicado"


async def test_el_bot_lee_y_no_se_salta_nada(sesion, monkeypatch):
    await abrir_alcance(sesion)
    p = await propiedad(sesion, "chelem")
    a = await sesion.get(AjustesBot, 1)
    a.contacto = "reservas@hotelesfrida.mx"
    urls = {
        "ok": "https://ok.ejemplo.mx/ficha",
        "robots": "https://privado.ejemplo.mx/privado/ficha",
        "reto": "https://reto.ejemplo.mx/ficha",
        "rechaza": "https://rechaza.ejemplo.mx/ficha",
        "vacia": "https://vacia.ejemplo.mx/ficha",
    }
    fichas = {k: FichaExterna(propiedad_id=p.id, canal="otro", url=u) for k, u in urls.items()}
    sesion.add_all(fichas.values())
    await sesion.flush()
    paginas = {
        urls["ok"]: pagina(FICHA),
        urls["reto"]: "<html><script src='https://x.awswaf.com/challenge.js'></script></html>",
        urls["vacia"]: "<html><body><p>Hola</p></body></html>",
    }

    def descargar(url, **kw):
        if url.endswith("/robots.txt"):
            return url, b"User-agent: *\nDisallow: /privado/\n"
        if "rechaza" in url:
            raise red.ErrorRed("Respondió 403")
        return url, paginas[url].encode()

    monkeypatch.setattr(red, "descargar", descargar)
    monkeypatch.setattr(bot.time, "sleep", lambda s: None)
    en_vivo = []  # lo que reciben en vivo todos los conectados mientras el bot trabaja
    monkeypatch.setattr(tarea, "publicar_en_vivo", en_vivo.append)

    def correr(s):
        @contextmanager
        def transaccion():
            yield s
            s.flush()

        monkeypatch.setattr(tarea, "_transaccion", transaccion)
        return tarea.leer_fichas()

    assert await sesion.run_sync(correr) == 5
    # En vivo: arranca con las 5 páginas pendientes, dice qué página visita y en qué fase, y termina.
    assert {m["tipo"] for m in en_vivo} == {"bot.progreso"} and all("id" not in m for m in en_vivo)
    primero, ultimo = en_vivo[0], en_vivo[-1]
    assert (
        primero["estado"] == "trabajando" and [p["estado"] for p in primero["paginas"]] == ["pendiente"] * 5
    )
    assert any(
        p["sitio"] == "ok.ejemplo.mx" and p["estado"] == "leyendo" and p["fase"] == "Descargando la página"
        for m in en_vivo
        for p in m["paginas"]
    )
    assert ultimo["estado"] == "terminado"
    assert {p["sitio"]: p["estado"] for p in ultimo["paginas"]}["privado.ejemplo.mx"] == "bloqueada_robots"
    estados = {}
    for k, f in fichas.items():
        await sesion.refresh(f)
        estados[k] = f.estado
    assert estados == {
        "ok": "leida", "robots": "bloqueada_robots", "reto": "verificacion",
        "rechaza": "verificacion", "vacia": "sin_datos",
    }  # fmt: skip
    assert fichas["ok"].cuartos[0]["nombre"] == "Habitación Doble - 2 camas" and fichas["ok"].detalle is None
    assert (
        "no la salta" in fichas["reto"].detalle and "no se insiste ni se salta" in fichas["rechaza"].detalle
    )

    # Sin contacto, el bot no lee ninguna página (y lo dice), ni anuncia que trabaja.
    a.contacto = None
    await sesion.flush()
    en_vivo.clear()
    await sesion.run_sync(correr)
    assert en_vivo == []
    await sesion.refresh(fichas["ok"])
    assert fichas["ok"].estado == "error" and "contacto" in fichas["ok"].detalle
    assert len(list(await sesion.scalars(select(FichaExterna)))) == 5
