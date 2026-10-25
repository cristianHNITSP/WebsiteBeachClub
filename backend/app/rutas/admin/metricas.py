"""Métricas del panel: /api/admin/metricas (fase 5, PLAN-BACKEND §9)."""

from datetime import date, timedelta
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query

from app.auth.alcance import AlcanceActual
from app.auth.dependencias import Actor, requiere_permiso
from app.db import Sesion
from app.errores import ReglaDeNegocio
from app.servicios import metricas as servicio
from app.servicios.reservas import hoy

router = APIRouter(prefix="/api/admin/metricas", tags=["panel: métricas"])

VerMetricas = Annotated[Actor, Depends(requiere_permiso("metricas.ver"))]
VerHabitaciones = Annotated[Actor, Depends(requiere_permiso("habitaciones.ver"))]


@router.get("/tablero")
async def tablero(_: VerMetricas, alcance: AlcanceActual, sesion: Sesion):
    """Hoy, el mes contra el anterior, 12 meses y los próximos 14 días. Lee solo
    `metricas_diarias` (cientos de filas) y se guarda 60 s en Redis."""
    return await servicio.tablero(sesion, alcance)


@router.get("/habitaciones/{habitacion_id}")
async def habitacion(
    habitacion_id: UUID,
    _: VerHabitaciones,
    alcance: AlcanceActual,
    sesion: Sesion,
    mes: Annotated[str | None, Query(pattern=r"^\d{4}-\d{2}$")] = None,
):
    try:
        primero = date.fromisoformat(f"{mes}-01") if mes else hoy().replace(day=1)
    except ValueError as e:
        raise ReglaDeNegocio("Mes no válido", codigo="mes") from e
    return await servicio.habitacion_mes(sesion, alcance, habitacion_id, primero)


@router.get("/pagos")
async def pagos(
    _: VerMetricas, alcance: AlcanceActual, sesion: Sesion, dias: Annotated[int, Query(ge=7, le=730)] = 90
):
    """Cómo pagaron las estancias que terminaron en los últimos `dias` (hasta hoy)."""
    hasta = hoy() + timedelta(days=1)
    return await servicio.formas_de_pago(sesion, alcance, hasta - timedelta(days=dias), hasta)
