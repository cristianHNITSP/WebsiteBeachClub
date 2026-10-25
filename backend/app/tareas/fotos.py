"""Archivos de las fotos eliminadas definitivamente (PLAN-BACKEND §18, §19.3)."""

from sqlalchemy.orm import Session

from app import contexto, imagenes
from app.auth.alcance import Alcance, fijar_en_base_sincrona
from app.config import obtener_config
from app.db import SesionSincrona
from app.repositorios import fotos as repo
from app.servicios.auditoria import nueva
from app.tareas import celery


def limpiar(sesion: Session) -> int:
    """Borra los archivos de las lápidas que aún los tengan. Idempotente: si se
    corta a la mitad, lo que falte se borra en la siguiente vuelta (borrar un
    archivo que ya no está no es error). Devuelve cuántas fotos limpió."""
    fijar_en_base_sincrona(sesion, Alcance(None))
    base = obtener_config().fotos_dir
    fotos = repo.lapidas_con_archivos(sesion)
    for f in fotos:
        imagenes.borrar(base, f.propiedad_id, f.habitacion_id, f.id)
        f.archivos_borrados = True
        sesion.add(nueva(accion="foto.archivos_borrados", entidad="foto", entidad_id=f.id))
    sesion.flush()
    return len(fotos)


@celery.task
def limpiar_fotos() -> None:
    contexto.abrir("tarea")
    with SesionSincrona.begin() as s:
        limpiar(s)
