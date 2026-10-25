"""Reservas del panel: /api/admin/reservas (PLAN-BACKEND §5, §6). HTTP y nada más."""

from datetime import date, timedelta
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query

from app.auth.alcance import AlcanceActual
from app.auth.dependencias import Actor, requiere_permiso
from app.db import Sesion
from app.errores import ReglaDeNegocio
from app.esquemas.reservas import (
    MAX_NOCHES,
    Accion,
    AjusteCobroCambio,
    AjusteCobroSalida,
    Cotizacion,
    Devolucion,
    Estado,
    EventoSalida,
    Mover,
    PagoNuevo,
    ReservaDetalle,
    ReservaNueva,
    ReservaSalida,
)
from app.servicios import reservas as servicio

router = APIRouter(prefix="/api/admin/reservas", tags=["panel: reservas"])
cobro = APIRouter(prefix="/api/admin/ajustes/cobro", tags=["panel: ajustes"])

Ver = Annotated[Actor, Depends(requiere_permiso("reservas.ver"))]
Crear = Annotated[Actor, Depends(requiere_permiso("reservas.crear"))]
Editar = Annotated[Actor, Depends(requiere_permiso("reservas.editar"))]
Cancelar = Annotated[Actor, Depends(requiere_permiso("reservas.cancelar"))]
Cobrar = Annotated[Actor, Depends(requiere_permiso("pagos.registrar"))]
AjustarCobro = Annotated[Actor, Depends(requiere_permiso("ajustes.cobro"))]
VENTANA_MAXIMA = timedelta(days=400)


@router.get("", response_model=list[ReservaSalida])
async def listar(
    _: Ver,
    alcance: AlcanceActual,
    sesion: Sesion,
    desde: date,
    hasta: date,
    habitacion_id: UUID | None = None,
    estado: Annotated[list[Estado] | None, Query()] = None,
    q: Annotated[str | None, Query(max_length=120)] = None,
    limite: Annotated[int, Query(ge=1, le=2000)] = 1000,
):
    """Las que tocan la ventana [desde, hasta): lo que pinta la Línea de tiempo."""
    if not desde < hasta <= desde + VENTANA_MAXIMA:
        raise ReglaDeNegocio("La ventana va de 1 a 400 días", codigo="ventana")
    filas = await servicio.listar(
        sesion, alcance, desde=desde, hasta=hasta, habitacion_id=habitacion_id,
        estados=tuple(estado) if estado else None, q=q.strip() if q else None, limite=limite,
    )  # fmt: skip
    return [servicio.a_salida(r) for r in filas]


@router.get("/cotizar", response_model=Cotizacion)
async def cotizar(
    _: Ver,
    alcance: AlcanceActual,
    sesion: Sesion,
    habitacion_id: UUID,
    llegada: date,
    salida: date,
    excluir: UUID | None = None,
):
    """Total, anticipo y saldo calculados por el servidor (el panel nunca los calcula)."""
    if not 0 < (salida - llegada).days <= MAX_NOCHES:
        raise ReglaDeNegocio(f"De 1 a {MAX_NOCHES} noches", codigo="noches")
    return await servicio.cotizar(sesion, alcance, habitacion_id, llegada, salida, excluir)


@router.get("/{reserva_id}", response_model=ReservaDetalle)
async def detalle(reserva_id: UUID, _: Ver, alcance: AlcanceActual, sesion: Sesion):
    r, pagos, desglose = await servicio.detalle(sesion, alcance, reserva_id)
    return {**servicio.a_salida(r), "pagos": pagos, "desglose": desglose}


@router.get("/{reserva_id}/historial", response_model=list[EventoSalida])
async def historial(reserva_id: UUID, _: Ver, alcance: AlcanceActual, sesion: Sesion):
    return await servicio.historial(sesion, alcance, reserva_id)


@router.post("", response_model=ReservaSalida, status_code=201)
async def crear(datos: ReservaNueva, actor: Crear, alcance: AlcanceActual, sesion: Sesion):
    return servicio.a_salida(await servicio.crear(sesion, actor, alcance, datos))


@router.put("/{reserva_id}/fechas", response_model=ReservaSalida)
async def mover(reserva_id: UUID, datos: Mover, actor: Editar, alcance: AlcanceActual, sesion: Sesion):
    return servicio.a_salida(await servicio.mover(sesion, actor, alcance, reserva_id, datos))


@router.post("/{reserva_id}/llegada", response_model=ReservaSalida)
async def llegada(reserva_id: UUID, datos: Accion, actor: Editar, alcance: AlcanceActual, sesion: Sesion):
    return servicio.a_salida(await servicio.llegada(sesion, actor, alcance, reserva_id, datos.version))


@router.post("/{reserva_id}/salida", response_model=ReservaSalida)
async def salida(reserva_id: UUID, datos: Accion, actor: Editar, alcance: AlcanceActual, sesion: Sesion):
    return servicio.a_salida(await servicio.salida(sesion, actor, alcance, reserva_id, datos.version))


@router.post("/{reserva_id}/cancelar", response_model=ReservaSalida)
async def cancelar(reserva_id: UUID, datos: Accion, actor: Cancelar, alcance: AlcanceActual, sesion: Sesion):
    return servicio.a_salida(
        await servicio.cancelar(sesion, actor, alcance, reserva_id, datos.version, datos.motivo)
    )


@router.post("/{reserva_id}/pagos", response_model=ReservaSalida, status_code=201)
async def registrar_pago(
    reserva_id: UUID, datos: PagoNuevo, actor: Cobrar, alcance: AlcanceActual, sesion: Sesion
):
    return servicio.a_salida(await servicio.registrar_pago(sesion, actor, alcance, reserva_id, datos))


@router.post("/{reserva_id}/devoluciones", response_model=ReservaSalida, status_code=201)
async def devolver(
    reserva_id: UUID, datos: Devolucion, actor: Cobrar, alcance: AlcanceActual, sesion: Sesion
):
    return servicio.a_salida(await servicio.devolver(sesion, actor, alcance, reserva_id, datos))


@cobro.get("", response_model=list[AjusteCobroSalida])
async def ajustes_cobro(_: Ver, alcance: AlcanceActual, sesion: Sesion):
    return await servicio.ajustes_cobro(sesion, alcance)


@cobro.put("/{propiedad_id}", response_model=AjusteCobroSalida)
async def cambiar_cobro(
    propiedad_id: UUID, datos: AjusteCobroCambio, actor: AjustarCobro, alcance: AlcanceActual, sesion: Sesion
):
    return await servicio.cambiar_cobro(sesion, actor, alcance, propiedad_id, datos)
