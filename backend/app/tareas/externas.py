"""Tareas de otras plataformas y del bot (PLAN-BACKEND §13). Delgadas: la red
siempre FUERA de las transacciones (se lee, y después se guarda)."""

import logging
from contextlib import contextmanager
from datetime import UTC, datetime, timedelta

from sqlalchemy import func, select

from app import contexto, red
from app.auth.alcance import Alcance, fijar_en_base_sincrona
from app.db import SesionSincrona
from app.modelos import CalendarioExterno
from app.servicios import bot, externas
from app.servicios.auditoria import nueva as nueva_auditoria
from app.tareas import celery

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
            s, propiedad_id=c.propiedad_id, habitacion_id=c.habitacion_id, canal=c.canal, origen="ical",
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
