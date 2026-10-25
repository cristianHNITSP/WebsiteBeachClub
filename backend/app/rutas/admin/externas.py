"""Otras plataformas y el bot: /api/admin/externas (PLAN-BACKEND §13). HTTP y nada más.

Ver: `externas.ver` (gerente y recepción). Configurar calendarios, subir CSV y
ajustar el bot: `ajustes.editar` (gerente). Leer un iCal o buscar con el bot son
llamadas de red: se encargan a Celery (202), nunca dentro de la petición.
"""

import logging
from datetime import date, timedelta
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Form, Query, UploadFile

from app.auth.alcance import AlcanceActual
from app.auth.dependencias import Actor, requiere_permiso
from app.config import obtener_config
from app.db import Sesion
from app.errores import NoEncontrado, ReglaDeNegocio
from app.esquemas.externas import (
    BotCambio,
    BotSalida,
    CalendarioNuevo,
    CalendarioSalida,
    Canal,
    ExternaSalida,
    ImportacionSalida,
    MencionSalida,
)
from app.modelos import AjustesBot, CalendarioExterno, MencionExterna
from app.servicios import externas as servicio
from app.servicios.auditoria import auditar

log = logging.getLogger(__name__)
router = APIRouter(prefix="/api/admin/externas", tags=["panel: otras plataformas"])
Ver = Annotated[Actor, Depends(requiere_permiso("externas.ver"))]
Editar = Annotated[Actor, Depends(requiere_permiso("ajustes.editar"))]


@router.get("/reservas", response_model=list[ExternaSalida])
async def reservas(_: Ver, alcance: AlcanceActual, sesion: Sesion, desde: date, hasta: date):
    if not desde < hasta <= desde + timedelta(days=400):
        raise ReglaDeNegocio("La ventana va de 1 a 400 días", codigo="ventana")
    return await servicio.listar_reservas(sesion, alcance, desde, hasta)


@router.get("/calendarios", response_model=list[CalendarioSalida])
async def calendarios(_: Ver, alcance: AlcanceActual, sesion: Sesion):
    return [servicio.calendario_salida(c) for c in await servicio.listar_calendarios(sesion, alcance)]


@router.post("/calendarios", status_code=201, response_model=CalendarioSalida)
async def crear_calendario(datos: CalendarioNuevo, actor: Editar, alcance: AlcanceActual, sesion: Sesion):
    c = await servicio.crear_calendario(sesion, actor, alcance, datos)
    _encargar_lectura(c.id)
    return servicio.calendario_salida(c)


@router.delete("/calendarios/{calendario_id}", status_code=204)
async def borrar_calendario(
    calendario_id: UUID, actor: Editar, alcance: AlcanceActual, sesion: Sesion
) -> None:
    await servicio.borrar_calendario(sesion, actor, alcance, calendario_id)


@router.post("/calendarios/{calendario_id}/leer", status_code=202)
async def leer_calendario(calendario_id: UUID, _: Editar, alcance: AlcanceActual, sesion: Sesion) -> dict:
    c = await sesion.get(CalendarioExterno, calendario_id)
    if c is None or not alcance.permite(c.propiedad_id):
        raise NoEncontrado("Ese calendario no existe")
    _encargar_lectura(c.id)
    return {"encargado": True}


def _encargar_lectura(calendario_id: UUID) -> None:
    from app.tareas.externas import leer_calendario

    _encargar(leer_calendario, str(calendario_id))


def _encargar(tarea, *args) -> None:
    try:
        tarea.delay(*args)
    except Exception:  # sin Redis: la vuelta programada lo hará
        log.warning("No se pudo encargar %s: queda para la vuelta programada", tarea.name)


@router.post("/csv", response_model=ImportacionSalida)
async def subir_csv(
    archivo: UploadFile,
    propiedad_id: Annotated[UUID, Form()],
    actor: Editar,
    alcance: AlcanceActual,
    sesion: Sesion,
    canal: Annotated[Canal, Form()] = "booking",
):
    contenido = await archivo.read(servicio.MAX_BYTES + 1)
    return await servicio.importar_csv(sesion, actor, alcance, propiedad_id, canal, contenido)


@router.get("/menciones", response_model=list[MencionSalida])
async def menciones(_: Ver, sesion: Sesion, limite: Annotated[int, Query(ge=1, le=500)] = 200):
    consulta = MencionExterna.__table__.select().order_by(
        MencionExterna.encontrada_en.desc(), MencionExterna.id.desc()
    )
    return (await sesion.execute(consulta.limit(limite))).mappings().all()


_CAMPOS_BOT = (
    "tope_mensual", "consultas_mes", "contacto", "consultas", "dominios_bloqueados", "ultima_ejecucion",
    "ultimo_resultado",
)  # fmt: skip


def _bot(a: AjustesBot) -> dict:
    return {
        "tiene_clave": obtener_config().brave_search_clave is not None,
        **{k: getattr(a, k) for k in _CAMPOS_BOT},
    }


@router.get("/bot", response_model=BotSalida)
async def bot(_: Ver, sesion: Sesion):
    return _bot(await sesion.get(AjustesBot, 1))


@router.put("/bot", response_model=BotSalida)
async def cambiar_bot(datos: BotCambio, _: Editar, sesion: Sesion):
    a = await sesion.get(AjustesBot, 1, with_for_update=True)
    antes = {k: getattr(a, k) for k in ("tope_mensual", "contacto", "consultas", "dominios_bloqueados")}
    for k, v in datos.model_dump().items():
        setattr(a, k, v)
    await sesion.flush()
    await auditar(
        sesion,
        accion="bot.ajustes",
        entidad="ajustes_bot",
        entidad_id=1,
        antes=antes,
        despues=datos.model_dump(),
    )
    return _bot(a)


@router.post("/bot/buscar", status_code=202)
async def buscar_ahora(_: Editar, sesion: Sesion) -> dict:
    """Respeta el tope mensual y dice por qué no busca (sin clave, sin contacto)."""
    from app.tareas.externas import buscar_menciones

    await auditar(sesion, accion="bot.buscar", entidad="ajustes_bot", entidad_id=1)
    _encargar(buscar_menciones)
    return {"encargado": True}
