"""Login del panel: /api/auth/* (PLAN-BACKEND §11). HTTP y nada más."""

from typing import Annotated
from uuid import UUID

from authx import TokenPayload
from fastapi import APIRouter, Depends, Request, Response

from app.auth.dependencias import ActorActual
from app.auth.tokens import COOKIE_RENOVACION, auth
from app.db import Sesion
from app.errores import NoAutenticado
from app.esquemas.auth import CambiarClaveEntrada, EntrarEntrada, SesionAbiertaSalida, SesionSalida
from app.rutas.comun import ip
from app.servicios import auth as servicio
from app.servicios.auth import Credenciales

router = APIRouter(prefix="/api/auth", tags=["autenticación"])


def _poner_cookies(response: Response, c: Credenciales) -> None:
    auth.set_access_cookies(c.acceso, response, max_age=c.max_age)
    auth.set_refresh_cookies(c.renovacion, response, max_age=c.max_age)


# Pública a propósito: es la puerta de entrada. La protegen el límite de
# intentos (Redis) y SameSite=Strict en las cookies que emite.
@router.post("/entrar", response_model=SesionSalida)
async def entrar(datos: EntrarEntrada, request: Request, response: Response, sesion: Sesion):
    credenciales, salida = await servicio.entrar(
        sesion,
        identificador=datos.identificador,
        clave=datos.clave,
        recordar=datos.recordar,
        ip=ip(request),
        agente=request.headers.get("user-agent"),
    )
    _poner_cookies(response, credenciales)
    return salida


@router.post("/renovar", response_model=SesionSalida)
async def renovar(
    request: Request,
    response: Response,
    sesion: Sesion,
    payload: Annotated[TokenPayload, Depends(auth.refresh_token_required)],
):
    token = request.cookies.get(COOKIE_RENOVACION)
    sid = (payload.model_extra or {}).get("sid")
    if not token or not sid:
        raise NoAutenticado("Tu sesión no es válida. Vuelve a entrar.")
    credenciales, salida = await servicio.renovar(
        sesion, usuario_id=UUID(payload.sub), sid=UUID(sid), token=token
    )
    _poner_cookies(response, credenciales)
    return salida


@router.get("/yo", response_model=SesionSalida)
async def yo(actor: ActorActual, sesion: Sesion):
    return await servicio.yo(sesion, actor)


@router.post("/salir", status_code=204)
async def salir(actor: ActorActual, request: Request, response: Response, sesion: Sesion) -> None:
    await servicio.salir(sesion, actor, ip=ip(request))
    auth.unset_cookies(response)


@router.post("/salir-de-todas", status_code=204)
async def salir_de_todas(actor: ActorActual, request: Request, response: Response, sesion: Sesion) -> None:
    await servicio.salir_de_todas(sesion, actor, ip=ip(request))
    auth.unset_cookies(response)


@router.get("/sesiones", response_model=list[SesionAbiertaSalida])
async def sesiones(actor: ActorActual, sesion: Sesion):
    return [
        SesionAbiertaSalida(
            id=s.id, ip=s.ip, agente=s.agente, creada=s.creada, usada=s.usada, vence=s.vence, actual=actual
        )
        for s, actual in await servicio.sesiones_abiertas(sesion, actor)
    ]


@router.delete("/sesiones/{sid}", status_code=204)
async def cerrar_sesion(sid: UUID, actor: ActorActual, request: Request, sesion: Sesion) -> None:
    await servicio.cerrar_sesion(sesion, actor, sid, ip=ip(request))


@router.post("/clave", status_code=204)
async def cambiar_clave(
    datos: CambiarClaveEntrada, actor: ActorActual, request: Request, sesion: Sesion
) -> None:
    """Cambiar la propia contraseña. Cierra las demás sesiones de la persona."""
    await servicio.cambiar_clave(sesion, actor, actual=datos.actual, nueva=datos.nueva, ip=ip(request))
