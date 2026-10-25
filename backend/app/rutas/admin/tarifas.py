"""Tarifas de temporada de una habitación: /api/admin/habitaciones/{id}/tarifas."""

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends

from app.auth.alcance import AlcanceActual
from app.auth.dependencias import Actor, requiere_permiso
from app.db import Sesion
from app.esquemas.tarifas import TarifaEntrada, TarifaSalida
from app.servicios import tarifas as servicio

router = APIRouter(prefix="/api/admin/habitaciones/{habitacion_id}/tarifas", tags=["panel: tarifas"])

Ver = Annotated[Actor, Depends(requiere_permiso("habitaciones.ver"))]
Editar = Annotated[Actor, Depends(requiere_permiso("habitaciones.editar"))]
Eliminar = Annotated[Actor, Depends(requiere_permiso("habitaciones.eliminar"))]


@router.get("", response_model=list[TarifaSalida])
async def listar(habitacion_id: UUID, _: Ver, alcance: AlcanceActual, sesion: Sesion):
    return [servicio.a_salida(t) for t in await servicio.listar(sesion, alcance, habitacion_id)]


@router.post("", response_model=TarifaSalida, status_code=201)
async def crear(
    habitacion_id: UUID, datos: TarifaEntrada, actor: Editar, alcance: AlcanceActual, sesion: Sesion
):
    return servicio.a_salida(await servicio.crear(sesion, actor, alcance, habitacion_id, datos))


@router.put("/{tarifa_id}", response_model=TarifaSalida)
async def editar(
    habitacion_id: UUID,
    tarifa_id: UUID,
    datos: TarifaEntrada,
    actor: Editar,
    alcance: AlcanceActual,
    sesion: Sesion,
):
    return servicio.a_salida(await servicio.editar(sesion, actor, alcance, habitacion_id, tarifa_id, datos))


@router.delete("/{tarifa_id}", status_code=204)
async def eliminar(
    habitacion_id: UUID,
    tarifa_id: UUID,
    actor: Eliminar,
    alcance: AlcanceActual,
    sesion: Sesion,
    definitivo: bool = False,
) -> None:
    if definitivo:
        await servicio.borrar_definitivo(sesion, actor, alcance, habitacion_id, tarifa_id)
    else:
        await servicio.eliminar(sesion, actor, alcance, habitacion_id, tarifa_id)


@router.post("/{tarifa_id}/restaurar", response_model=TarifaSalida)
async def restaurar(
    habitacion_id: UUID, tarifa_id: UUID, actor: Eliminar, alcance: AlcanceActual, sesion: Sesion
):
    return servicio.a_salida(await servicio.restaurar(sesion, actor, alcance, habitacion_id, tarifa_id))
