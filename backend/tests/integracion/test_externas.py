"""Otras plataformas (iCal, CSV) y el bot (fase 9, PLAN-BACKEND §13)."""

from contextlib import contextmanager
from datetime import timedelta
from decimal import Decimal
from types import SimpleNamespace

import pytest
from pydantic import SecretStr
from sqlalchemy import select

from app import red
from app.modelos import AjustesBot, Auditoria, Aviso, FichaExterna, MencionExterna, ReservaExterna
from app.servicios import bot, externas
from app.servicios.externas import ArchivoInvalido, Evento, leer_csv, leer_ical
from app.servicios.reservas import hoy
from app.tareas.outbox import despachar
from tests.conftest import csrf, entrar_como
from tests.fabricas import abrir_alcance, crear_habitacion, propiedad


def _ical(*eventos: str) -> bytes:
    return (
        "BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Airbnb//ES\r\n" + "".join(eventos) + "END:VCALENDAR\r\n"
    ).encode()


def _vevento(uid, inicio, fin=None, resumen="Reserved", estado=None):
    lineas = [f"UID:{uid}", f"DTSTART;VALUE=DATE:{inicio:%Y%m%d}"]
    if fin:
        lineas.append(f"DTEND;VALUE=DATE:{fin:%Y%m%d}")
    lineas.append(f"SUMMARY:{resumen}")
    if estado:
        lineas.append(f"STATUS:{estado}")
    return "BEGIN:VEVENT\r\n" + "\r\n".join(lineas) + "\r\nEND:VEVENT\r\n"


D = hoy() + timedelta(days=20)

PUBLICA = [
    {"nombre": "Cabaña estándar", "m2": 20, "camas": "2 camas Queen", "capacidad_maxima": 4},
    {"nombre": "Cabaña estándar", "m2": 20, "camas": "1 cama King", "capacidad_maxima": 2},
]


async def una_ficha(sesion, canal="airbnb", url="https://www.airbnb.mx/rooms/1"):
    """Una ficha de plataforma con lo que publica (las plataformas son aparte del motor)."""
    await abrir_alcance(sesion)
    p = await propiedad(sesion, "chelem")
    f = FichaExterna(propiedad_id=p.id, canal=canal, url=url, estado="leida", cuartos=PUBLICA)
    sesion.add(f)
    await sesion.flush()
    return f


def test_leer_ical():
    ev = leer_ical(
        _ical(
            _vevento("a@airbnb", D, D + timedelta(days=3), "Ana (HM123)"),
            _vevento("b@airbnb", D + timedelta(days=5)),  # sin fin: una noche
            _vevento("c@airbnb", D, D + timedelta(days=1), estado="CANCELLED"),
            "BEGIN:VEVENT\r\nSUMMARY:sin uid\r\nDTSTART;VALUE=DATE:20261201\r\nEND:VEVENT\r\n",
        )
    )
    assert [e.uid for e in ev] == ["a@airbnb", "b@airbnb", "c@airbnb"]
    assert (ev[0].llegada, ev[0].salida, ev[0].titulo) == (D, D + timedelta(days=3), "Ana (HM123)")
    assert ev[1].salida == D + timedelta(days=6) and ev[2].cancelada
    with pytest.raises(ArchivoInvalido):
        leer_ical(b"<html>no soy un calendario</html>")


def test_leer_csv_de_booking_en_ingles_y_espanol():
    ingles = (
        b"Book number,Booked by,Guest name(s),Check-in,Check-out,Status\n"
        b"4021,Ana Ruiz,Ana Ruiz,2026-11-20,2026-11-23,ok\n"
        b"4022,Luis,Luis Paz,2026-11-24,2026-11-25,cancelled_by_guest\n"
    )
    ev = leer_csv(ingles)
    assert [(e.uid, e.titulo, e.cancelada) for e in ev] == [
        ("4021", "Ana Ruiz", False),
        ("4022", "Luis Paz", True),
    ]
    espanol = "﻿Número de reserva;Nombre del cliente;Entrada;Salida;Estado\n77;Eva;20/11/2026;22/11/2026;OK\n"
    ev = leer_csv(espanol.encode())
    assert ev == [
        Evento("77", D.replace(year=2026, month=11, day=20), D.replace(year=2026, month=11, day=22), "Eva")
    ]
    with pytest.raises(ArchivoInvalido):
        leer_csv(b"nombre,precio\nx,1\n")


async def test_guardar_es_idempotente_y_cancela_lo_que_desaparece(sesion):
    from app.modelos import CalendarioExterno

    f = await una_ficha(sesion)
    cal = CalendarioExterno(
        propiedad_id=f.propiedad_id, ficha_id=f.id, publicacion="Cabaña estándar, 20 m²", canal="airbnb",
        url="https://www.airbnb.mx/calendar/ical/1.ics?s=x",
    )  # fmt: skip
    sesion.add(cal)
    await sesion.flush()

    def guardar(eventos):
        return lambda s: externas.guardar(
            s, propiedad_id=f.propiedad_id, canal="airbnb", origen="ical", eventos=eventos,
            calendario_id=cal.id,
        )  # fmt: skip

    uno = Evento("x1@airbnb", D, D + timedelta(days=2), "Reserved")
    dos = Evento("x2@airbnb", D + timedelta(days=4), D + timedelta(days=6), "Reserved")
    assert (await sesion.run_sync(guardar([uno, dos])))["nuevas"] == 2
    assert await sesion.run_sync(guardar([uno, dos])) == {"nuevas": 0, "cambiadas": 0, "canceladas": 0}
    movida = Evento("x1@airbnb", D + timedelta(days=1), D + timedelta(days=3), "Reserved")
    cuenta = await sesion.run_sync(guardar([movida]))  # x2 ya no viene: se canceló en Airbnb
    assert cuenta["cambiadas"] == 1 and cuenta["canceladas"] == 1
    filas = {
        x.uid_externo: x
        for x in await sesion.scalars(select(ReservaExterna).where(ReservaExterna.calendario_id == cal.id))
    }
    assert filas["x1@airbnb"].llegada == D + timedelta(days=1) and filas["x2@airbnb"].estado == "cancelada"
    assert len(filas) == 2  # UNIQUE (canal, uid): releer nunca duplica


async def test_lo_de_las_plataformas_no_toca_las_reservas_del_motor(cliente, sesion):
    """Plataformas y motor van separados (no son espejo): una reserva de fuera sobre una propia no
    avisa de «doble venta» ni cambia nada del motor; y al revés, crear una propia tampoco."""
    await entrar_como(cliente, sesion)
    h = await crear_habitacion(sesion, "chelem", nombre="Ext Separada")
    r = await cliente.post(
        "/api/admin/reservas",
        json={"habitacion_id": str(h.id), "llegada": str(D), "salida": str(D + timedelta(days=3)),
              "adultos": 1, "huesped_nombre": "Propia"},
        headers=csrf(cliente),
    )  # fmt: skip
    assert r.status_code == 201, r.text
    ev = Evento("encima@airbnb", D + timedelta(days=1), D + timedelta(days=2), "Reserved")
    cuenta = await sesion.run_sync(
        lambda s: externas.guardar(s, propiedad_id=h.propiedad_id, canal="airbnb", origen="csv", eventos=[ev])
    )
    assert cuenta == {"nuevas": 1, "cambiadas": 0, "canceladas": 0}
    await sesion.run_sync(despachar)
    assert await sesion.scalar(select(Aviso).where(Aviso.titulo == "Posible doble venta")) is None
    assert (await cliente.get(f"/api/admin/reservas/{r.json()['id']}")).json()["estado"] == "confirmada"


async def test_rutas_y_permisos(cliente, sesion):
    f = await una_ficha(sesion)
    await entrar_como(cliente, sesion, rol="recepcion", propiedades=("chelem",))
    assert (
        await cliente.get(f"/api/admin/externas/reservas?desde={D}&hasta={D + timedelta(days=30)}")
    ).status_code == 200
    nuevo = {
        "ficha_id": str(f.id),
        "indice": 0,
        "url": "https://www.airbnb.mx/calendar/ical/9.ics?s=secreto123",
    }
    assert (
        await cliente.post("/api/admin/externas/calendarios", json=nuevo, headers=csrf(cliente))
    ).status_code == 403

    await entrar_como(cliente, sesion)
    malo = {**nuevo, "url": "http://www.airbnb.mx/x.ics"}
    assert (
        await cliente.post("/api/admin/externas/calendarios", json=malo, headers=csrf(cliente))
    ).status_code == 422
    r = await cliente.post("/api/admin/externas/calendarios", json=nuevo, headers=csrf(cliente))
    assert r.status_code == 201, r.text
    assert "secreto123" not in r.text and r.json()["url"].startswith("https://www.airbnb.mx/…")
    assert r.json()["publicacion"] == "Cabaña estándar, 20 m², 2 camas Queen, hasta 4 personas"
    fuera = {
        **nuevo,
        "indice": 9,
        "url": "https://www.airbnb.mx/calendar/ical/10.ics",
    }  # esa publicación no existe
    x = await cliente.post("/api/admin/externas/calendarios", json=fuera, headers=csrf(cliente))
    assert x.status_code == 422 and x.json()["codigo"] == "publicacion"
    otra_publicacion = {**nuevo, "indice": 1, "url": "https://www.airbnb.mx/calendar/ical/11.ics"}
    assert (
        await cliente.post("/api/admin/externas/calendarios", json=otra_publicacion, headers=csrf(cliente))
    ).status_code == 201  # la misma ficha, otra publicación: otro calendario
    fila = await sesion.scalar(select(Auditoria).where(Auditoria.accion == "calendario_externo.crear"))
    assert "secreto123" not in str(fila.despues)
    otra = await cliente.post("/api/admin/externas/calendarios", json=nuevo, headers=csrf(cliente))
    assert otra.status_code == 409 and otra.json()["codigo"] == "duplicado"

    p = await propiedad(sesion, "chelem")
    archivo = b"Book number,Guest name(s),Check-in,Check-out,Status\n9001,Ana,2026-12-01,2026-12-04,ok\n"
    r = await cliente.post(
        "/api/admin/externas/csv", files={"archivo": ("reservas.csv", archivo, "text/csv")},
        data={"propiedad_id": str(p.id)}, headers=csrf(cliente),
    )  # fmt: skip
    assert r.status_code == 200 and r.json()["nuevas"] == 1, r.text
    r = await cliente.post(
        "/api/admin/externas/csv", files={"archivo": ("x.csv", b"a,b\n1,2\n", "text/csv")},
        data={"propiedad_id": str(p.id)}, headers=csrf(cliente),
    )  # fmt: skip
    assert r.status_code == 422 and r.json()["codigo"] == "archivo"


# ── El bot ──

HTML = """<html><head><title>Casa Frida | Chuburná</title>
<script type="application/ld+json">{"@context":"https://schema.org","@graph":[
 {"@type":"Hotel","name":"Casa Frida Chuburná","priceRange":"$$",
  "aggregateRating":{"@type":"AggregateRating","ratingValue":"9.2","bestRating":"10","reviewCount":"148"}},
 {"@type":"Offer","price":"2450","priceCurrency":"MXN"}]}</script>
<script type="application/ld+json">{ roto </script></head><body><script>alert(1)</script></body></html>"""


def test_extraer_datos_estructurados():
    d = bot.extraer(HTML)
    assert d == {
        "titulo": "Casa Frida Chuburná",
        "precio": "MXN 2450",
        "calificacion": Decimal("4.60"),
        "resenas": 148,
    }
    assert bot.extraer("<html><title> Solo título </title></html>")["titulo"] == "Solo título"


def test_dominios_bloqueados():
    lista = ["booking.com", "airbnb.mx"]
    assert bot.bloqueado("https://www.booking.com/hotel/mx/casa-frida.html", lista)
    assert bot.bloqueado("https://es.airbnb.mx/rooms/1", lista)
    assert not bot.bloqueado("https://notbooking.com/x", lista)


def _correr(sesion):
    @contextmanager
    def abrir():
        yield sesion

    return bot.ejecutar(abrir)


async def test_bot_sin_clave_no_busca(sesion, monkeypatch):
    monkeypatch.setattr(bot, "obtener_config", lambda: SimpleNamespace(brave_search_clave=None))
    llamadas = []
    monkeypatch.setattr(bot, "buscar", lambda *a: llamadas.append(a) or [])
    resultado = await sesion.run_sync(_correr)
    assert "Sin BRAVE_SEARCH_CLAVE" in resultado and llamadas == []
    assert (await sesion.get(AjustesBot, 1)).consultas_mes == 0


async def test_bot_respeta_bloqueos_robots_y_tope(sesion, monkeypatch):
    monkeypatch.setattr(
        bot, "obtener_config", lambda: SimpleNamespace(brave_search_clave=SecretStr("k" * 20))
    )
    a = await sesion.get(AjustesBot, 1)
    a.contacto, a.consultas, a.tope_mensual, a.consultas_mes, a.mes = (
        "reservas@hotelesfrida.mx",
        ["Casa Frida"],
        5,
        0,
        None,
    )
    await sesion.flush()
    hallazgos = [
        {
            "url": "https://www.booking.com/hotel/casa-frida.html",
            "titulo": "Casa Frida en Booking",
            "descripcion": "9.2",
        },
        {"url": "https://blog.ejemplo.mx/privado/casa-frida", "titulo": "Blog", "descripcion": None},
        {"url": "https://guia.ejemplo.mx/casa-frida", "titulo": "Guía", "descripcion": None},
    ]
    monkeypatch.setattr(bot, "buscar", lambda consulta, clave: hallazgos)
    leidas = []

    def descargar(url, **kw):
        leidas.append(url)
        if url.endswith("/robots.txt"):
            return url, b"User-agent: *\nDisallow: /privado/\n"
        return url, HTML.encode()

    monkeypatch.setattr(red, "descargar", descargar)
    monkeypatch.setattr(bot.time, "sleep", lambda s: None)
    resultado = await sesion.run_sync(_correr)
    assert "1 páginas leídas" in resultado, resultado
    m = {x.dominio: x for x in await sesion.scalars(select(MencionExterna))}
    assert (
        m["booking.com"].estado == "bloqueada_dominio" and m["booking.com"].titulo == "Casa Frida en Booking"
    )
    assert m["blog.ejemplo.mx"].estado == "bloqueada_robots"
    assert m["guia.ejemplo.mx"].estado == "leida" and m["guia.ejemplo.mx"].calificacion == Decimal("4.60")
    assert not any("booking.com" in u for u in leidas)  # ni su robots.txt se pidió
    assert not any("/privado/" in u for u in leidas)
    # Volver a correr no duplica (UNIQUE url) y cuenta contra el tope.
    await sesion.run_sync(_correr)
    assert len(list(await sesion.scalars(select(MencionExterna)))) == 3
    a = await sesion.get(AjustesBot, 1)
    assert a.consultas_mes == 2
    a.consultas_mes = 5
    await sesion.flush()
    assert "Tope mensual" in await sesion.run_sync(_correr)


# ── Lectura eficiente de los iCal y aviso de reservas de fuera ──


def test_espera_tras_errores():
    from app.tareas.externas import espera_tras_errores

    minutos = [espera_tras_errores(n).total_seconds() / 60 for n in range(8)]
    assert minutos == [0, 5, 10, 20, 40, 60, 60, 60]  # crece y se topa en 1 h


async def test_lectura_condicional_y_aviso_de_reservas_de_fuera(sesion, monkeypatch):
    from app.modelos import CalendarioExterno
    from app.tareas import externas as tarea

    f = await una_ficha(sesion)
    cal = CalendarioExterno(
        propiedad_id=f.propiedad_id,
        ficha_id=f.id,
        publicacion="Cabaña Eficiente, 20 m²",
        canal="airbnb",
        url="https://www.airbnb.mx/calendar/ical/7.ics?s=x",
    )
    sesion.add(cal)
    await sesion.flush()
    ical = _ical(
        _vevento("fuera1@airbnb", D, D + timedelta(days=2)),
        _vevento("fuera2@airbnb", D + timedelta(days=5), D + timedelta(days=7)),
    )
    respuestas = iter([
        (ical, '"v1"', None),  # primera lectura: trae el calendario
        (ical, '"v1"', None),  # mismo contenido (la plataforma no soporta 304): no se procesa
        (None, '"v1"', None),  # 304: nada cambió
    ])  # fmt: skip
    pedidas = []

    def descargar(url, *, maximo, etag, modificado):
        pedidas.append(etag)
        r = next(respuestas, None)
        if r is None:
            raise red.ErrorRed("Respondió 503")
        return r

    monkeypatch.setattr(red, "descargar_si_cambio", descargar)

    def correr(s):
        @contextmanager
        def transaccion():  # como SesionSincrona.begin(): al cerrar, lo hecho queda escrito
            yield s
            s.flush()

        monkeypatch.setattr(tarea, "_transaccion", transaccion)
        return [tarea.leer_calendario(str(cal.id)) for _ in range(4)]

    resultados = await sesion.run_sync(correr)
    assert resultados[0]["nuevas"] == 2
    assert resultados[1] == {"sin_cambios": True} and resultados[2] == {"sin_cambios": True}
    assert resultados[3] == {"error": "Respondió 503"}
    assert pedidas == [None, '"v1"', '"v1"', '"v1"']  # desde la segunda, petición condicional con su ETag
    await sesion.refresh(cal)
    assert cal.errores_seguidos == 1 and cal.huella and cal.etag == '"v1"'

    # Las 2 reservas de fuera: UN aviso (por el outbox), con su permiso y a dónde ir.
    await sesion.run_sync(despachar)
    aviso = await sesion.scalar(
        select(Aviso).where(
            Aviso.titulo == "Reservas de otras plataformas", Aviso.texto.contains("Cabaña Eficiente")
        )
    )
    assert aviso is not None and aviso.texto.startswith("2 reservas nuevas de Airbnb")
    assert aviso.permiso == "externas.ver" and aviso.destino == "/admin/otras-plataformas"


# ── Las reservas de fuera entran al calendario del motor (migración 0024) ──


async def _con_cuartos_en_linea(sesion, n=2):
    await abrir_alcance(sesion)
    return [
        await crear_habitacion(sesion, "chelem", nombre=f"Cabaña {i}", capacidad=4, venta_en_linea=True)
        for i in range(n)
    ]


def _leer(sesion, propiedad_id, *eventos, canal="booking"):
    return sesion.run_sync(
        lambda s: externas.guardar(
            s, propiedad_id=propiedad_id, canal=canal, origen="ical", eventos=list(eventos)
        )
    )


async def test_la_de_fuera_entra_al_calendario_con_su_fuente_y_sin_duplicar(sesion):
    from app.modelos import Reserva

    h1, _ = await _con_cuartos_en_linea(sesion)
    ev = Evento("b1@booking", D, D + timedelta(days=2), "Ana Ruiz", False)
    await _leer(sesion, h1.propiedad_id, ev)
    await _leer(sesion, h1.propiedad_id, ev)  # releer no duplica
    filas = (await sesion.scalars(select(Reserva).where(Reserva.fuente == "booking"))).all()
    assert len(filas) == 1
    r = filas[0]
    assert (r.estado, r.huesped_nombre, r.habitacion_id, r.total_centavos) == (
        "confirmada",
        "Ana Ruiz",
        h1.id,
        0,
    )
    assert (r.llegada, r.salida) == (D, D + timedelta(days=2))


async def test_la_segunda_de_las_mismas_fechas_va_a_otra_habitacion_en_linea(sesion):
    from app.modelos import Reserva

    h1, h2 = await _con_cuartos_en_linea(sesion)
    a = Evento("b1@booking", D, D + timedelta(days=2), None, False)
    b = Evento("b2@booking", D, D + timedelta(days=2), None, False)
    await _leer(sesion, h1.propiedad_id, a, b)
    cuartos = set(await sesion.scalars(select(Reserva.habitacion_id).where(Reserva.fuente == "booking")))
    assert cuartos == {h1.id, h2.id}


async def test_no_se_asigna_a_una_habitacion_solo_fisica(sesion):
    from app.modelos import Reserva

    await abrir_alcance(sesion)
    fisica = await crear_habitacion(sesion, "chelem", venta_en_linea=False)
    await _leer(sesion, fisica.propiedad_id, Evento("b1@booking", D, D + timedelta(days=1), None, False))
    assert (await sesion.scalars(select(Reserva).where(Reserva.fuente == "booking"))).first() is None


async def test_cancelada_en_la_plataforma_se_cancela_y_cambio_de_fechas_se_sigue(sesion):
    from app.modelos import Reserva

    h1, _ = await _con_cuartos_en_linea(sesion)
    await _leer(sesion, h1.propiedad_id, Evento("b1@booking", D, D + timedelta(days=2), "Ana", False))
    await _leer(
        sesion,
        h1.propiedad_id,
        Evento("b1@booking", D + timedelta(days=1), D + timedelta(days=4), "Ana", False),
    )
    r = (await sesion.scalars(select(Reserva).where(Reserva.fuente == "booking"))).one()
    assert (r.llegada, r.salida) == (D + timedelta(days=1), D + timedelta(days=4))
    await _leer(sesion, h1.propiedad_id, Evento("b1@booking", D, D + timedelta(days=2), "Ana", True))
    await sesion.refresh(r)
    assert r.estado == "cancelada"


async def test_si_la_recepcion_la_cancela_no_vuelve_a_salir(sesion):
    from app.modelos import Reserva

    h1, _ = await _con_cuartos_en_linea(sesion)
    ev = Evento("b1@booking", D, D + timedelta(days=2), "Ana", False)
    await _leer(sesion, h1.propiedad_id, ev)
    r = (await sesion.scalars(select(Reserva).where(Reserva.fuente == "booking"))).one()
    r.estado = "cancelada"
    await sesion.flush()
    await _leer(sesion, h1.propiedad_id, ev)  # el iCal la sigue trayendo
    await sesion.refresh(r)
    assert r.estado == "cancelada"
    assert len((await sesion.scalars(select(Reserva).where(Reserva.fuente == "booking"))).all()) == 1


async def test_sin_cuarto_libre_queda_sin_asignar_y_avisa(sesion):
    from app.modelos import Reserva

    (h1,) = await _con_cuartos_en_linea(sesion, 1)
    await _leer(
        sesion, h1.propiedad_id,
        Evento("b1@booking", D, D + timedelta(days=2), None, False),
        Evento("b2@booking", D, D + timedelta(days=2), None, False),
    )  # fmt: skip
    assert len((await sesion.scalars(select(Reserva).where(Reserva.fuente == "booking"))).all()) == 1
    await sesion.run_sync(despachar)
    assert (
        await sesion.scalars(
            select(Aviso).where(Aviso.titulo == "Reserva de plataforma sin habitación asignada")
        )
    ).first() is not None


async def test_la_de_fuera_no_se_mueve_ni_se_cobra_pero_si_marca_llegada_y_salida(sesion):
    from app.auth.alcance import Alcance
    from app.errores import ReglaDeNegocio
    from app.esquemas.reservas import Mover, PagoNuevo
    from app.modelos import Reserva
    from app.servicios import reservas as srv
    from tests.fabricas import crear_usuario

    (h1,) = await _con_cuartos_en_linea(sesion, 1)
    hoy_ = hoy()
    await _leer(sesion, h1.propiedad_id, Evento("b1@booking", hoy_, hoy_ + timedelta(days=2), "Ana", False))
    r = (await sesion.scalars(select(Reserva).where(Reserva.fuente == "booking"))).one()
    gerente = await crear_usuario(sesion, rol="gerente")
    actor = SimpleNamespace(id=gerente.id, permisos=frozenset())
    alcance = Alcance(None)
    with pytest.raises(ReglaDeNegocio) as e:
        await srv.mover(sesion, actor, alcance, r.id, Mover(
            habitacion_id=h1.id, llegada=hoy_, salida=hoy_ + timedelta(days=3), version=r.version
        ))  # fmt: skip
    assert e.value.detalle["codigo"] == "de_plataforma"
    with pytest.raises(ReglaDeNegocio) as e:
        await srv.registrar_pago(sesion, actor, alcance, r.id, PagoNuevo(
            concepto="abono", metodo="efectivo", monto_centavos=1000
        ))  # fmt: skip
    assert e.value.detalle["codigo"] == "de_plataforma"
    r = await srv.llegada(sesion, actor, alcance, r.id, r.version)
    assert r.estado == "en_curso"
    r = await srv.salida(sesion, actor, alcance, r.id, r.version)  # no debe nada: la cobra la plataforma
    assert r.estado == "completada"
