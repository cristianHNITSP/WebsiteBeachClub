"""Auditoría forense: /api/admin/auditoria (PLAN-BACKEND §17.4). Solo gerente (`auditoria.ver`)."""

from datetime import datetime
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Response

from app.auth.dependencias import Actor, requiere_permiso
from app.db import Sesion
from app.esquemas.auditoria import AuditoriaSalida, VerificacionSalida
from app.esquemas.base import MetaCursor, PaginaCursor
from app.servicios import auditoria as servicio

router = APIRouter(prefix="/api/admin/auditoria", tags=["panel: auditoría"])

Ver = Annotated[Actor, Depends(requiere_permiso("auditoria.ver"))]


class Filtros:
    def __init__(
        self,
        entidad: Annotated[str | None, Query(max_length=40)] = None,
        entidad_id: Annotated[str | None, Query(max_length=64)] = None,
        usuario_id: UUID | None = None,
        accion: Annotated[
            str | None, Query(max_length=60, description="Prefijo: «sesion.» trae todas las de sesión")
        ] = None,
        desde: datetime | None = None,
        hasta: datetime | None = None,
    ):
        self.datos = {
            "entidad": entidad,
            "entidad_id": entidad_id,
            "usuario_id": usuario_id,
            "accion": accion,
            "desde": desde,
            "hasta": hasta,
        }


@router.get("", response_model=PaginaCursor[AuditoriaSalida])
async def consultar(
    _: Ver,
    sesion: Sesion,
    filtros: Annotated[Filtros, Depends()],
    cursor: Annotated[int | None, Query(ge=1)] = None,
    limite: Annotated[int, Query(ge=1, le=200)] = 50,
):
    filas, siguiente = await servicio.consultar(sesion, antes_de=cursor, limite=limite, **filtros.datos)
    return PaginaCursor(items=filas, meta=MetaCursor(siguiente=siguiente))


@router.get("/verificar", response_model=VerificacionSalida)
async def verificar(_: Ver, sesion: Sesion, desde: Annotated[int, Query(ge=1)] = 1):
    """Recorre la cadena de hashes desde `desde` y dice si está íntegra."""
    return await servicio.verificar(sesion, desde=desde)


@router.get("/exportar")
async def exportar(_: Ver, sesion: Sesion, filtros: Annotated[Filtros, Depends()]) -> Response:
    """NDJSON en orden de la cadena. `X-Contenido-Sha256` = la huella del archivo,
    que también queda en la auditoría (cadena de custodia)."""
    cuerpo, huella, filas = await servicio.exportar(sesion, **filtros.datos)
    return Response(
        cuerpo,
        media_type="application/x-ndjson",
        headers={
            "Content-Disposition": 'attachment; filename="auditoria-frida.ndjson"',
            "X-Contenido-Sha256": huella,
            "X-Filas": str(filas),
        },
    )
