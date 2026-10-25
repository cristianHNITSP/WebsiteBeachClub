"""Tareas de la API pública (PLAN-BACKEND §4, §5.2, §7). Delgadas: llaman a los servicios."""

from app import contexto
from app.auth.alcance import Alcance, fijar_en_base_sincrona
from app.db import SesionSincrona
from app.servicios import idempotencia, reservas, webhooks
from app.tareas import celery


@celery.task
def vencer_retenciones() -> int:
    """Cada minuto: las retenidas sin pagar a los 15 min liberan sus noches."""
    contexto.abrir("tarea")
    with SesionSincrona.begin() as s:
        fijar_en_base_sincrona(s, Alcance(None))
        return reservas.vencer_retenciones(s)


@celery.task
def entregar_webhooks() -> int:
    """Cada 15 s: aparta las entregas que tocan (transacción corta), las manda
    sin transacción abierta y guarda cada resultado en la suya."""
    contexto.abrir("tarea")
    with SesionSincrona.begin() as s:
        lote = webhooks.apartar(s)
    for entrega_id, url, secreto, cuerpo in lote:
        codigo, error = webhooks.enviar(url, secreto, cuerpo)
        with SesionSincrona.begin() as s:
            webhooks.resultado(s, entrega_id, codigo, error)
    return len(lote)


@celery.task
def limpiar_idempotencia() -> int:
    contexto.abrir("tarea")
    with SesionSincrona.begin() as s:
        return idempotencia.borrar_viejas(s)
