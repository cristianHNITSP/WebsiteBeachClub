"""Celery: worker + beat en el mismo contenedor (PLAN-BACKEND §2).

`celery -A app.tareas worker --beat -Q default`
Reglas (BACKEND-ARQUITECTURA §7): tareas delgadas e idempotentes que reciben
ids y llaman a los mismos servicios que las rutas.
"""

from celery import Celery
from celery.schedules import crontab

from app.config import obtener_config

celery = Celery(
    "beachclub",
    broker=str(obtener_config().redis_url),
    include=[
        "app.tareas.sistema",
        "app.tareas.fotos",
        "app.tareas.outbox",
        "app.tareas.publica",
        "app.tareas.externas",
    ],
)
celery.conf.update(
    task_serializer="json",
    accept_content=["json"],
    task_ignore_result=True,  # los resultados importantes se guardan en Postgres, no aquí
    task_acks_late=True,  # si el worker muere a mitad, la tarea vuelve a la cola
    task_reject_on_worker_lost=True,
    worker_prefetch_multiplier=1,
    task_default_queue="default",
    broker_connection_retry_on_startup=True,
    timezone="America/Merida",
    enable_utc=True,
    beat_schedule={
        "latido": {"task": "app.tareas.sistema.latido", "schedule": 60.0},
        "sellar-auditoria": {"task": "app.tareas.sistema.sellar_auditoria", "schedule": 3600.0},
        # Cada 2 s: los avisos en vivo llegan con ese retraso como máximo.
        "despachar-outbox": {"task": "app.tareas.outbox.despachar_outbox", "schedule": 2.0},
        # 3:30 de Mérida: la verificación nocturna de métricas.
        "verificar-metricas": {
            "task": "app.tareas.outbox.verificar_metricas",
            "schedule": crontab(hour=3, minute=30),
        },
        "limpiar-fotos": {"task": "app.tareas.fotos.limpiar_fotos", "schedule": 900.0},
        # API pública (fase 6): retenciones vencidas, avisos a las websites, claves viejas.
        "vencer-retenciones": {"task": "app.tareas.publica.vencer_retenciones", "schedule": 60.0},
        "entregar-webhooks": {"task": "app.tareas.publica.entregar_webhooks", "schedule": 15.0},
        # Otras plataformas (fase 9): sus iCal cada 5 min (petición condicional: casi
        # gratis si nada cambió); el bot, una vez al día.
        "leer-calendarios": {"task": "app.tareas.externas.leer_calendarios", "schedule": 300.0},
        "buscar-menciones": {
            "task": "app.tareas.externas.buscar_menciones",
            "schedule": crontab(hour=6, minute=20),
        },
        "limpiar-idempotencia": {
            "task": "app.tareas.publica.limpiar_idempotencia",
            "schedule": crontab(hour=4, minute=10),
        },
    },
)
