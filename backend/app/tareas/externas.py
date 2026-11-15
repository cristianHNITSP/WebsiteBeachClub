"""Tareas de otras plataformas y del bot (PLAN-BACKEND §13). Delgadas: la red
siempre FUERA de las transacciones (se lee, y después se guarda)."""

import logging
from collections.abc import Callable
from contextlib import contextmanager
from datetime import UTC, datetime, timedelta
from urllib.parse import urlsplit

from sqlalchemy import func, select

from app import contexto, red
from app.auth.alcance import Alcance, fijar_en_base_sincrona
from app.db import SesionSincrona
from app.modelos import AjustesBot, CalendarioExterno, FichaExterna, Propiedad
from app.servicios import bot, externas, fichas
from app.servicios.auditoria import nueva as nueva_auditoria
from app.tareas import celery
from app.tareas.outbox import publicar_en_vivo

log = logging.getLogger(__name__)


@contextmanager
def _transaccion():
    with SesionSincrona.begin() as s:
        fijar_en_base_sincrona(s, Alcance(None))
        yield s


CADA = timedelta(minutes=5)  # la vuelta (beat); con petición condicional casi no cuesta
ESPERA_MAXIMA = timedelta(hours=1)


def espera_tras_errores(errores: int) -> timedelta:
    """5 min, 10, 20, 40… hasta 1 h: no se insiste contra un enlace roto."""
    return min(CADA * 2 ** max(errores - 1, 0), ESPERA_MAXIMA) if errores else timedelta(0)


@celery.task
def leer_calendario(calendario_id: str) -> dict | None:
    """Lee UN iCal (fuera de toda transacción) y guarda lo que cambió. Barato:
    petición condicional (304 = nada cambió, sin archivo) y, si llega el mismo
    contenido, tampoco se procesa (misma huella)."""
    contexto.abrir("tarea")
    with _transaccion() as s:
        c = s.get(CalendarioExterno, calendario_id)
        if c is None or not c.activo:
            return None
        url, etag, modificado, huella_vieja = c.url, c.etag, c.ultima_modificacion, c.huella
    try:
        datos, etag, modificado = red.descargar_si_cambio(
            url, maximo=externas.MAX_BYTES, etag=etag, modificado=modificado
        )
        eventos = externas.leer_ical(datos) if datos is not None else None
        # Huella de las RESERVAS leídas, no del archivo: hay plataformas que cambian
        # su marca de tiempo interna en cada petición aunque nada haya cambiado.
        huella = externas.huella(eventos) if eventos is not None else huella_vieja
        if huella == huella_vieja:
            eventos = None
        error = None
    except (red.ErrorRed, externas.ArchivoInvalido) as e:
        eventos, error, huella = None, str(e)[:300], huella_vieja
    with _transaccion() as s:
        c = s.get(CalendarioExterno, calendario_id, with_for_update=True)
        if c is None:
            return None
        c.ultima_lectura, c.ultimo_error = func.now(), error
        if error:
            c.errores_seguidos += 1
            return {"error": error}
        c.errores_seguidos, c.etag, c.ultima_modificacion, c.huella = 0, etag, modificado, huella
        if eventos is None:
            return {"sin_cambios": True}  # 304 o el mismo contenido: nada que procesar
        cuenta = externas.guardar(
            s, propiedad_id=c.propiedad_id, canal=c.canal, origen="ical", publicacion=c.publicacion,
            eventos=eventos, calendario_id=c.id,
        )  # fmt: skip
        c.eventos = len(eventos)
        if any(cuenta.values()):  # solo lo que cambió: leer seguido no llena la auditoría
            s.add(
                nueva_auditoria(
                    accion="externas.leer_ical", entidad="calendario_externo", entidad_id=c.id,
                    despues={"canal": c.canal, "eventos": len(eventos), **cuenta},
                )
            )  # fmt: skip
        return cuenta


@celery.task
def leer_calendarios() -> int:
    """Cada 5 min: los que tocan (los que fallan esperan cada vez más), uno por
    uno, cada uno con su lectura y su transacción."""
    contexto.abrir("tarea")
    ahora = datetime.now(UTC)
    with _transaccion() as s:
        activos = s.execute(
            select(
                CalendarioExterno.id, CalendarioExterno.errores_seguidos, CalendarioExterno.ultima_lectura
            ).where(CalendarioExterno.activo)
        ).all()
    tocan = [
        str(c.id)
        for c in activos
        if c.ultima_lectura is None or ahora - c.ultima_lectura >= espera_tras_errores(c.errores_seguidos)
    ]
    for i in tocan:
        leer_calendario(i)
    return len(tocan)


@celery.task(soft_time_limit=1800)
def buscar_menciones() -> str:
    contexto.abrir("tarea")
    return bot.ejecutar(_transaccion)


def _guardar_ficha(
    ficha_id, estado: str, detalle: str | None, resumen=None, cuartos=None, titulo=None, previo=None
) -> None:
    with _transaccion() as s:
        f = s.get(FichaExterna, ficha_id, with_for_update=True)
        if f is None:
            return
        cambio = (previo or (f.estado, len(f.cuartos))) != (
            estado,
            len(cuartos if cuartos is not None else f.cuartos),
        )
        f.estado, f.detalle, f.leida_en = estado, detalle, func.now()
        if resumen is not None:
            f.resumen, f.cuartos, f.titulo = resumen, cuartos or [], titulo
        if cambio:  # leer seguido no llena la auditoría: solo lo que cambió
            s.add(
                nueva_auditoria(
                    accion="fichas.leer", entidad="ficha_externa", entidad_id=f.id,
                    despues={"estado": estado, "cuartos": len(cuartos or [])},
                )
            )  # fmt: skip


def _fase(ficha_id, texto: str, avisar: Callable[[str], None] | None = None) -> None:
    """Lo que el panel muestra en vivo: la ficha queda "leyendo" y dice en qué fase va."""
    with _transaccion() as s:
        f = s.get(FichaExterna, ficha_id, with_for_update=True)
        if f is not None:
            f.estado, f.detalle = "leyendo", texto
    if avisar:
        avisar(texto)


def _leer_ficha(ficha_id: str, lector: bot.Lector, avisar: Callable[[str], None] | None = None) -> str | None:
    """Lee UNA ficha (fuera de toda transacción). Cortés y sin saltarse nada: si el
    robots.txt no la permite, o la plataforma pide verificación anti-robot o rechaza
    al bot, se detiene y lo dice."""
    with _transaccion() as s:
        f = s.get(FichaExterna, ficha_id)
        if f is None:
            return None
        url, previo = f.url, (f.estado, len(f.cuartos))
    _fase(ficha_id, "Revisando su robots.txt", avisar)
    if not lector.permiso(url):
        _guardar_ficha(ficha_id, "bloqueada_robots", "Su robots.txt no permite leerla", previo=previo)
        return "bloqueada_robots"
    _fase(ficha_id, "Descargando la página", avisar)
    try:
        html = lector.leer(url)
    except red.ErrorRed as e:
        rechazo = any(c in str(e) for c in ("403", "429", "503"))
        detalle = (
            f"La plataforma rechazó al bot ({e}): no se insiste ni se salta" if rechazo else str(e)[:300]
        )
        _guardar_ficha(ficha_id, "verificacion" if rechazo else "error", detalle, previo=previo)
        return "verificacion" if rechazo else "error"
    _fase(ficha_id, "Leyendo las habitaciones", avisar)
    cuartos = fichas.extraer_cuartos(html)
    datos = bot.extraer(html)
    resumen = {
        k: (float(v) if hasattr(v, "as_tuple") else v)
        for k, v in datos.items()
        if k != "titulo" and v is not None
    }
    if cuartos:
        estado, detalle = "leida", None
    elif fichas.pide_verificacion(html):
        estado, detalle = "verificacion", "La plataforma pidió verificación anti-robot: el bot no la salta"
    else:
        estado, detalle = "sin_datos", None  # la página responde; los tipos de habitación ya se conocen
    _guardar_ficha(ficha_id, estado, detalle, resumen, cuartos, datos["titulo"], previo=previo)
    return estado


def _contacto() -> str | None:
    with _transaccion() as s:
        return s.get(AjustesBot, 1).contacto


@celery.task
def leer_ficha(ficha_id: str) -> str | None:
    contexto.abrir("tarea")
    contacto = _contacto()
    if not contacto:
        _guardar_ficha(
            ficha_id, "error", "Falta el contacto del bot en el panel: sin él no se lee ninguna página"
        )
        return "error"
    return _leer_ficha(ficha_id, bot.Lector(contacto))


class _EnVivo:
    """Lo que el bot va haciendo, para todas las personas conectadas (SSE, de paso: no se guarda).
    Cada aviso lleva la lista COMPLETA de páginas: quien abre el panel a media vuelta la ve entera
    con el siguiente aviso."""

    def __init__(self, filas) -> None:
        self.inicio = datetime.now(UTC).isoformat()
        self.paginas = [
            {"sitio": (urlsplit(url).hostname or url).removeprefix("www."), "plataforma": canal,
             "propiedad": nombre, "estado": "pendiente", "fase": None}
            for _, url, canal, nombre in filas
        ]  # fmt: skip

    def enviar(self, estado: str = "trabajando") -> None:
        publicar_en_vivo(
            {"tipo": "bot.progreso", "agregado": "bot", "agregado_id": "fichas", "propiedad_id": None,
             "por": None, "estado": estado, "inicio": self.inicio, "paginas": [dict(p) for p in self.paginas]}
        )  # fmt: skip

    def fase(self, i: int, texto: str) -> None:
        self.paginas[i] |= {"estado": "leyendo", "fase": texto}
        self.enviar()

    def resultado(self, i: int, estado: str | None) -> None:
        self.paginas[i] |= {"estado": estado or "error", "fase": None}


@celery.task(soft_time_limit=900)
def leer_fichas() -> int:
    """Cada día: todas las fichas, una a la vez, con la espera que pida cada sitio. Mientras
    trabaja, avisa en vivo a todas las personas conectadas qué página visita."""
    contexto.abrir("tarea")
    with _transaccion() as s:
        filas = s.execute(
            select(FichaExterna.id, FichaExterna.url, FichaExterna.canal, Propiedad.nombre)
            .join(Propiedad, Propiedad.id == FichaExterna.propiedad_id)
            .order_by(FichaExterna.creado)
        ).all()
    contacto = _contacto()
    if not contacto:  # sin contacto no visita nada: tampoco lo anuncia
        for f in filas:
            _guardar_ficha(
                str(f.id), "error", "Falta el contacto del bot en el panel: sin él no se lee ninguna página"
            )
        return len(filas)
    lector, vivo = bot.Lector(contacto), _EnVivo(filas)
    vivo.enviar()
    try:
        for i, f in enumerate(filas):
            vivo.resultado(i, _leer_ficha(str(f.id), lector, lambda texto, i=i: vivo.fase(i, texto)))
    finally:
        vivo.enviar("terminado")  # también si se corta: que nadie se quede viendo "trabajando"
    return len(filas)
