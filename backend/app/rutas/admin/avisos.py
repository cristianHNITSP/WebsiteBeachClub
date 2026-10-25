"""Avisos del panel: /api/admin/avisos (fase 4). Cualquier persona del personal
ve los de sus propiedades y permisos; leído y borrado son suyos."""

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends

from app.auth.alcance import AlcanceActual
from app.auth.dependencias import Actor, requiere_permiso
from app.db import Sesion
from app.esquemas.avisos import AvisoSalida, Leido, Resumen
from app.servicios import avisos as servicio

router = APIRouter(prefix="/api/admin/avisos", tags=["panel: avisos"])

# Sin permiso específico: basta con ser personal con sesión (la propiedad la
# filtra RLS y el permiso de cada aviso, el servicio).
Personal = Annotated[Actor, Depends(requiere_permiso())]


@router.get("", response_model=list[AvisoSalida])
async def listar(actor: Personal, _: AlcanceActual, sesion: Sesion):
    return [
        AvisoSalida(
            id=a.id, tipo=a.tipo, titulo=a.titulo, texto=a.texto, destino=a.destino, creado=a.creado,
            leido=leido, propio=a.causado_por == actor.id,
        )
        for a, leido in await servicio.listar(sesion, actor)
    ]  # fmt: skip


@router.get("/resumen", response_model=Resumen)
async def resumen(actor: Personal, _: AlcanceActual, sesion: Sesion):
    return Resumen(sin_leer=await servicio.sin_leer(sesion, actor))


@router.post("/leer-todos", status_code=204)
async def leer_todos(actor: Personal, _: AlcanceActual, sesion: Sesion) -> None:
    await servicio.leer_todos(sesion, actor)


@router.post("/{aviso_id}/leido", status_code=204)
async def marcar(aviso_id: UUID, datos: Leido, actor: Personal, _: AlcanceActual, sesion: Sesion) -> None:
    await servicio.marcar_leido(sesion, actor, aviso_id, datos.leido)


@router.delete("/{aviso_id}", status_code=204)
async def borrar(aviso_id: UUID, actor: Personal, _: AlcanceActual, sesion: Sesion) -> None:
    await servicio.borrar(sesion, actor, aviso_id)


@router.post("/{aviso_id}/restaurar", status_code=204)
async def restaurar(aviso_id: UUID, actor: Personal, _: AlcanceActual, sesion: Sesion) -> None:
    await servicio.restaurar(sesion, actor, aviso_id)
