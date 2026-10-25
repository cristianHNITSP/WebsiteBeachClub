"""Tareas de mantenimiento del propio sistema."""

import json
import logging
import time

import redis
from sqlalchemy import select

from app import contexto
from app.config import obtener_config
from app.db import SesionSincrona
from app.modelos import Auditoria
from app.servicios.auditoria import nueva
from app.tareas import celery

_redis = redis.Redis.from_url(str(obtener_config().redis_url), socket_timeout=2)


@celery.task
def latido() -> None:
    """Prueba de vida del worker y de beat: /api/health/listo la muestra.
    Idempotente: sobrescribir la misma clave no hace daño."""
    _redis.set("celery:latido", time.time(), ex=180)


log_sello = logging.getLogger("frida.sello")


@celery.task
def sellar_auditoria() -> None:
    """Cada hora: la cabeza de la cadena de auditoría (secuencia y hash) se
    registra como evento encadenado y como línea JSON en el registro del
    contenedor. Guardada FUERA del servidor (PLAN-BACKEND §17.4), permite probar
    que nadie truncó ni reescribió la cadena después de esa hora: la cadena sola
    detecta alteraciones en medio, pero no que se corte la cola."""
    contexto.abrir("tarea")
    with SesionSincrona.begin() as s:
        fila = s.execute(
            select(Auditoria.secuencia, Auditoria.hash).order_by(Auditoria.secuencia.desc()).limit(1)
        ).first()
        if fila is None:
            return
        sello = {"secuencia": fila.secuencia, "hash": fila.hash}
        s.add(nueva(accion="auditoria.sello", entidad="auditoria", despues=sello))
    log_sello.warning(json.dumps({"sello_auditoria": sello}))  # WARNING: sale aunque el nivel sea alto
