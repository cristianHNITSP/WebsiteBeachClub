"""Propiedades (sucursales): /api/admin/propiedades. Solo el dueño las da de alta o las edita."""

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends

from app.auth.dependencias import Actor, requiere_permiso
from app.db import Sesion
from app.esquemas.auth import PropiedadSalida
from app.esquemas.propiedades import PropiedadEntrada
from app.servicios import propiedades as servicio

router = APIRouter(prefix="/api/admin/propiedades", tags=["panel: propiedades"])

Gestionar = Annotated[Actor, Depends(requiere_permiso("propiedades.gestionar"))]


@router.get("", response_model=list[PropiedadSalida])
async def listar(_: Gestionar, sesion: Sesion):
    return await servicio.listar(sesion)


@router.post("", response_model=PropiedadSalida, status_code=201)
async def crear(datos: PropiedadEntrada, _: Gestionar, sesion: Sesion):
    return await servicio.crear(sesion, datos)


@router.put("/{propiedad_id}", response_model=PropiedadSalida)
async def editar(propiedad_id: UUID, datos: PropiedadEntrada, _: Gestionar, sesion: Sesion):
    return await servicio.editar(sesion, propiedad_id, datos)
