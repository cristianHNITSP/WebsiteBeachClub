"""Habitaciones del panel: /api/admin/habitaciones (PLAN-BACKEND §11.1, §19.3)."""

import math
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Request

from app.auth.alcance import AlcanceActual
from app.auth.dependencias import Actor, requiere_permiso
from app.db import Sesion
from app.esquemas.base import Meta, MetaCursor, Pagina, PaginaCursor
from app.esquemas.habitaciones import EnPapelera, Estado, HabitacionCambios, HabitacionNueva, HabitacionSalida
from app.rutas.comun import ip
from app.servicios import habitaciones as servicio

router = APIRouter(prefix="/api/admin/habitaciones", tags=["panel: habitaciones"])

Ver = Annotated[Actor, Depends(requiere_permiso("habitaciones.ver"))]
Editar = Annotated[Actor, Depends(requiere_permiso("habitaciones.editar"))]
Eliminar = Annotated[Actor, Depends(requiere_permiso("habitaciones.eliminar"))]


@router.get("", response_model=Pagina[HabitacionSalida])
async def listar(
    _: Ver,
    alcance: AlcanceActual,
    sesion: Sesion,
    q: Annotated[str | None, Query(max_length=120)] = None,
    estado: Estado | None = None,
    pagina: Annotated[int, Query(ge=1, le=10_000)] = 1,
    por_pagina: Annotated[int, Query(ge=1, le=100)] = 20,
):
    items, total = await servicio.listar(
        sesion, alcance, q=q.strip() if q else None, estado=estado, pagina=pagina, por_pagina=por_pagina
    )
    return Pagina(
        items=items,
        meta=Meta(total=total, pagina=pagina, por_pagina=por_pagina, paginas=math.ceil(total / por_pagina)),
    )


# Antes que /{habitacion_id}: si no, «papelera» se intentaría leer como uuid.
@router.get("/papelera", response_model=PaginaCursor[EnPapelera])
async def papelera(
    _: Eliminar,
    alcance: AlcanceActual,
    sesion: Sesion,
    cursor: Annotated[str | None, Query(max_length=200)] = None,
    limite: Annotated[int, Query(ge=1, le=100)] = 20,
):
    filas, siguiente = await servicio.en_papelera(sesion, alcance, cursor=cursor, limite=limite)
    items = [
        EnPapelera(
            id=h.id,
            tipo="habitacion",
            nombre=h.nombre,
            propiedad_id=h.propiedad_id,
            eliminado_en=h.eliminado_en,
            motivo=h.motivo_eliminacion,
        )
        for h in filas
    ]
    return PaginaCursor(items=items, meta=MetaCursor(siguiente=siguiente))


@router.get("/{habitacion_id}", response_model=HabitacionSalida)
async def obtener(habitacion_id: UUID, _: Ver, alcance: AlcanceActual, sesion: Sesion):
    return await servicio.obtener(sesion, alcance, habitacion_id)


@router.post("", response_model=HabitacionSalida, status_code=201)
async def crear(
    datos: HabitacionNueva, actor: Editar, alcance: AlcanceActual, sesion: Sesion, request: Request
):
    return await servicio.crear(sesion, actor, alcance, datos, ip=ip(request))


@router.put("/{habitacion_id}", response_model=HabitacionSalida)
async def editar(
    habitacion_id: UUID,
    datos: HabitacionCambios,
    actor: Editar,
    alcance: AlcanceActual,
    sesion: Sesion,
    request: Request,
):
    return await servicio.editar(sesion, actor, alcance, habitacion_id, datos, ip=ip(request))


@router.delete("/{habitacion_id}", status_code=204)
async def eliminar(
    habitacion_id: UUID,
    actor: Eliminar,
    alcance: AlcanceActual,
    sesion: Sesion,
    request: Request,
    definitivo: bool = False,
    motivo: Annotated[str | None, Query(max_length=300)] = None,
) -> None:
    if definitivo:
        await servicio.borrar_definitivo(sesion, actor, alcance, habitacion_id, ip=ip(request))
    else:
        await servicio.eliminar(sesion, actor, alcance, habitacion_id, motivo=motivo, ip=ip(request))


@router.post("/{habitacion_id}/restaurar", response_model=HabitacionSalida)
async def restaurar(
    habitacion_id: UUID, actor: Eliminar, alcance: AlcanceActual, sesion: Sesion, request: Request
):
    return await servicio.restaurar(sesion, actor, alcance, habitacion_id, ip=ip(request))
