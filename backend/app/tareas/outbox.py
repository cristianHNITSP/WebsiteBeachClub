"""Despachador del outbox (PLAN-BACKEND §6.4): lo que se escribió en la misma
transacción del cambio sale de aquí hacia fuera: avisos del panel, SSE,
métricas y las entregas de webhooks a las websites (las manda `tareas.publica`)."""

import json
import logging

import redis as redis_sincrono
from sqlalchemy import func, select

from app import contexto
from app.auth.alcance import Alcance, fijar_en_base_sincrona
from app.config import obtener_config
from app.db import SesionSincrona
from app.modelos import Outbox
from app.servicios import avisos, externas, metricas, webhooks
from app.servicios.auth import ahora
from app.tareas import celery
from app.tiempo_real import canal, mensaje

log = logging.getLogger(__name__)
_redis = redis_sincrono.Redis.from_url(str(obtener_config().redis_url), socket_timeout=2)
LOTE = 200


def despachar(sesion) -> list[tuple[str, dict]]:
    """Marca como despachado un lote y crea sus avisos, en la transacción de
    `sesion`. SKIP LOCKED: dos workers nunca toman el mismo evento. Devuelve lo
    que hay que publicar DESPUÉS del commit (si no, alguien podría leer antes de
    que exista)."""
    fijar_en_base_sincrona(sesion, Alcance(None))
    filas = (
        sesion.execute(
            select(Outbox)
            .where(Outbox.despachado_en.is_(None))
            .order_by(Outbox.momento, Outbox.id)
            .limit(LOTE)
            .with_for_update(skip_locked=True)
        )
        .scalars()
        .all()
    )
    for e in filas:
        avisos.guardar_sincrono(sesion, e)
        webhooks.encolar(sesion, e)
        externas.choque_con_propia(sesion, e)  # ¿cae sobre una de Booking, Airbnb…?
        # Métricas: se recalculan los días que tocó la reserva (los pagos
        # también: cambian lo que falta por cobrar).
        if e.agregado == "reserva" and e.propiedad_id:
            metricas.recalcular_evento(sesion, e.datos or {}, e.propiedad_id)
        e.despachado_en, e.intentos = ahora(), e.intentos + 1
    sesion.flush()
    return [(canal(e.propiedad_id), mensaje(e)) for e in filas]


@celery.task
def despachar_outbox() -> int:
    contexto.abrir("tarea")
    with SesionSincrona.begin() as s:
        publicar = despachar(s)
    if publicar:
        metricas.invalidar_cache(_redis)
    for nombre, m in publicar:
        try:
            _redis.publish(nombre, json.dumps(m, ensure_ascii=False))
        except Exception:
            # Ya está guardado y despachado: quien reconecte lo recibe por
            # Last-Event-ID. Que Redis falle no pierde el evento.
            log.exception("No se pudo publicar el evento %s", m["id"])
    return len(publicar)


@celery.task
def verificar_metricas() -> int:
    """Cada noche: recalcula toda la ventana desde las reservas y corrige lo que se
    hubiera desviado (PLAN-BACKEND §9). Idempotente."""
    contexto.abrir("tarea")
    with SesionSincrona.begin() as s:
        fijar_en_base_sincrona(s, Alcance(None))
        # Sin el tope de 5 s del usuario de la API: recorrer la ventana entera con
        # millones de reservas tarda más (y es una tarea, no una petición).
        s.execute(select(func.set_config("statement_timeout", "0", True)))
        n = metricas.recalcular_todo(s)
    metricas.invalidar_cache(_redis)
    return n
