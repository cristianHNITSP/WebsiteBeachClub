"""Sitios web: /api/admin/sitios (PLAN-BACKEND §4.2). HTTP y nada más."""

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends

from app.auth.dependencias import Actor, requiere_permiso
from app.db import Sesion
from app.esquemas.sitios import EntregaSalida, SitioConSecretos, SitioEntrada, SitioSalida
from app.servicios import sitios as servicio

router = APIRouter(prefix="/api/admin/sitios", tags=["panel: sitios web"])
Gestionar = Annotated[Actor, Depends(requiere_permiso("sitios.gestionar"))]


@router.get("", response_model=list[SitioSalida])
async def listar(_: Gestionar, sesion: Sesion):
    return [servicio.a_salida(s) for s in await servicio.listar(sesion)]


@router.post("", status_code=201, response_model=SitioConSecretos)
async def crear(datos: SitioEntrada, actor: Gestionar, sesion: Sesion):
    """La clave secreta y el secreto de webhooks salen SOLO en esta respuesta."""
    return await servicio.crear(sesion, actor, datos)


@router.put("/{sitio_id}", response_model=SitioSalida)
async def editar(sitio_id: UUID, datos: SitioEntrada, actor: Gestionar, sesion: Sesion):
    return await servicio.editar(sesion, actor, sitio_id, datos)


@router.post("/{sitio_id}/rotar-claves", response_model=SitioConSecretos)
async def rotar_claves(sitio_id: UUID, actor: Gestionar, sesion: Sesion):
    return await servicio.rotar_claves(sesion, actor, sitio_id)


@router.post("/{sitio_id}/rotar-webhook", response_model=SitioConSecretos)
async def rotar_webhook(sitio_id: UUID, actor: Gestionar, sesion: Sesion):
    return await servicio.rotar_webhook(sesion, actor, sitio_id)


@router.post("/{sitio_id}/revocar", response_model=SitioSalida)
async def revocar(sitio_id: UUID, actor: Gestionar, sesion: Sesion):
    return await servicio.revocar(sesion, actor, sitio_id)


@router.get("/{sitio_id}/entregas", response_model=list[EntregaSalida])
async def entregas(sitio_id: UUID, _: Gestionar, sesion: Sesion):
    return await servicio.entregas(sesion, sitio_id)


@router.post("/{sitio_id}/entregas/{entrega_id}/reintentar", response_model=EntregaSalida)
async def reintentar(sitio_id: UUID, entrega_id: UUID, actor: Gestionar, sesion: Sesion):
    return await servicio.reintentar(sesion, actor, sitio_id, entrega_id)
