"""Fotos de una habitación: /api/admin/habitaciones/{id}/fotos (PLAN-BACKEND §18)."""

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, UploadFile

from app.auth.alcance import AlcanceActual
from app.auth.dependencias import Actor, requiere_permiso
from app.db import Sesion
from app.errores import ErrorDeDominio
from app.esquemas.fotos import FotoSalida, Orden
from app.imagenes import MAX_BYTES
from app.servicios import fotos as servicio

router = APIRouter(prefix="/api/admin/habitaciones/{habitacion_id}/fotos", tags=["panel: fotos"])

Ver = Annotated[Actor, Depends(requiere_permiso("habitaciones.ver"))]
Editar = Annotated[Actor, Depends(requiere_permiso("habitaciones.editar"))]
Eliminar = Annotated[Actor, Depends(requiere_permiso("habitaciones.eliminar"))]


class FotoMuyGrande(ErrorDeDominio):
    estado, codigo = 413, "foto_muy_grande"


@router.get("", response_model=list[FotoSalida])
async def listar(habitacion_id: UUID, _: Ver, alcance: AlcanceActual, sesion: Sesion):
    return [servicio.a_salida(f) for f in await servicio.listar(sesion, alcance, habitacion_id)]


@router.post("", response_model=FotoSalida, status_code=201)
async def subir(
    habitacion_id: UUID, archivo: UploadFile, actor: Editar, alcance: AlcanceActual, sesion: Sesion
):
    # Se lee con tope: un byte más del máximo basta para saber que se pasó.
    # (Nginx corta antes con client_max_body_size en esta ruta.) El nombre y el
    # tipo que manda el navegador se ignoran: decide el contenido.
    datos = await archivo.read(MAX_BYTES + 1)
    if len(datos) > MAX_BYTES:
        raise FotoMuyGrande("La foto pesa más de 15 MB")
    return servicio.a_salida(await servicio.subir(sesion, actor, alcance, habitacion_id, datos))


@router.put("/orden", response_model=list[FotoSalida])
async def ordenar(habitacion_id: UUID, datos: Orden, actor: Editar, alcance: AlcanceActual, sesion: Sesion):
    """La primera de la lista es la portada."""
    return [
        servicio.a_salida(f) for f in await servicio.ordenar(sesion, actor, alcance, habitacion_id, datos.ids)
    ]


@router.delete("/{foto_id}", status_code=204)
async def eliminar(
    habitacion_id: UUID,
    foto_id: UUID,
    actor: Eliminar,
    alcance: AlcanceActual,
    sesion: Sesion,
    definitivo: bool = False,
) -> None:
    if definitivo:
        await servicio.borrar_definitivo(sesion, actor, alcance, habitacion_id, foto_id)
    else:
        await servicio.eliminar(sesion, actor, alcance, habitacion_id, foto_id)


@router.post("/{foto_id}/restaurar", response_model=FotoSalida)
async def restaurar(
    habitacion_id: UUID, foto_id: UUID, actor: Eliminar, alcance: AlcanceActual, sesion: Sesion
):
    return servicio.a_salida(await servicio.restaurar(sesion, actor, alcance, habitacion_id, foto_id))
