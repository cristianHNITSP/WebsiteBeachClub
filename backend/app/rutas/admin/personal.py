"""Gestión del personal: /api/admin/personal (fase 3e)."""

import math
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query

from app.auth.dependencias import Actor, requiere_permiso
from app.db import Sesion
from app.esquemas.base import Meta, Pagina
from app.esquemas.personal import ClaveTemporal, PersonaCambios, PersonaNueva, PersonaSalida, RolSalida
from app.servicios import personal as servicio

router = APIRouter(prefix="/api/admin/personal", tags=["panel: personal"])

Ver = Annotated[Actor, Depends(requiere_permiso("usuarios.ver"))]
Gestionar = Annotated[Actor, Depends(requiere_permiso("usuarios.gestionar"))]


@router.get("", response_model=Pagina[PersonaSalida])
async def listar(
    _: Ver,
    sesion: Sesion,
    q: Annotated[str | None, Query(max_length=120)] = None,
    rol: Annotated[str | None, Query(max_length=40)] = None,
    activo: bool | None = None,
    pagina: Annotated[int, Query(ge=1, le=10_000)] = 1,
    por_pagina: Annotated[int, Query(ge=1, le=100)] = 20,
):
    items, total = await servicio.listar(
        sesion, q=q, rol=rol, activo=activo, pagina=pagina, por_pagina=por_pagina
    )
    return Pagina(
        items=[servicio.a_salida(u) for u in items],
        meta=Meta(total=total, pagina=pagina, por_pagina=por_pagina, paginas=math.ceil(total / por_pagina)),
    )


@router.get("/roles", response_model=list[RolSalida])
async def roles(_: Ver, sesion: Sesion):
    return await servicio.roles(sesion)


@router.get("/{usuario_id}", response_model=PersonaSalida)
async def obtener(usuario_id: UUID, _: Ver, sesion: Sesion):
    return servicio.a_salida(await servicio.obtener(sesion, usuario_id))


@router.post("", response_model=PersonaSalida, status_code=201)
async def crear(datos: PersonaNueva, actor: Gestionar, sesion: Sesion):
    return servicio.a_salida(await servicio.crear(sesion, actor, datos))


@router.put("/{usuario_id}", response_model=PersonaSalida)
async def editar(usuario_id: UUID, datos: PersonaCambios, actor: Gestionar, sesion: Sesion):
    return servicio.a_salida(await servicio.editar(sesion, actor, usuario_id, datos))


@router.post("/{usuario_id}/desactivar", response_model=PersonaSalida)
async def desactivar(usuario_id: UUID, actor: Gestionar, sesion: Sesion):
    return servicio.a_salida(await servicio.desactivar(sesion, actor, usuario_id))


@router.post("/{usuario_id}/reactivar", response_model=PersonaSalida)
async def reactivar(usuario_id: UUID, actor: Gestionar, sesion: Sesion):
    return servicio.a_salida(await servicio.reactivar(sesion, actor, usuario_id))


@router.post("/{usuario_id}/clave", response_model=PersonaSalida)
async def restablecer_clave(usuario_id: UUID, datos: ClaveTemporal, actor: Gestionar, sesion: Sesion):
    return servicio.a_salida(
        await servicio.restablecer_clave(sesion, actor, usuario_id, datos.clave_temporal)
    )
