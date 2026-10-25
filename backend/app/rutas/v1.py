"""API pública v1 para las websites (PLAN-BACKEND §4.3). HTTP y nada más.

Caché: lo que se puede cachear lo dice `X-Accel-Expires` (Nginx, §12); lo de
reservas lleva `Cache-Control: no-store` y nunca se cachea.
"""

from datetime import date
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Header, Path, Query, Request, Response
from fastapi.encoders import jsonable_encoder
from fastapi.responses import JSONResponse
from sqlalchemy import any_, literal, select

from app.auth.sitio import SitioActual
from app.db import Sesion
from app.errores import ReglaDeNegocio, SinPermiso
from app.esquemas.publica import HabitacionDisponible, HabitacionPublica, ReservaPublica, ReservaWeb
from app.esquemas.reservas import MAX_NOCHES
from app.modelos import Sitio
from app.servicios import idempotencia, publica

router = APIRouter(prefix="/api/v1", tags=["API pública v1"])

Codigo = Annotated[str, Path(max_length=12)]
Token = Annotated[str, Query(min_length=20, max_length=100, description="El del enlace del huésped")]
ClaveIdempotencia = Annotated[UUID | None, Header(alias="Idempotency-Key")]
SIN_CACHE = {"Cache-Control": "no-store"}


def _base(request: Request) -> str:
    return str(request.base_url)


def _clave(clave: UUID | None) -> UUID:
    if clave is None:
        raise ReglaDeNegocio(
            "Falta la cabecera Idempotency-Key (un UUID por intento)", codigo="sin_idempotencia"
        )
    return clave


async def _idempotente(request: Request, sesion, sitio, clave, operacion) -> JSONResponse:
    huella = idempotencia.huella(request.method, request.url.path, await request.body())
    codigo, cuerpo, repetida = await idempotencia.ejecutar(sesion, sitio.id, _clave(clave), huella, operacion)
    cabeceras = {**SIN_CACHE, **({"Idempotent-Replayed": "true"} if repetida else {})}
    return JSONResponse(cuerpo, status_code=codigo, headers=cabeceras)


@router.get("/habitaciones", response_model=list[HabitacionPublica])
async def habitaciones(sitio: SitioActual, sesion: Sesion, request: Request, response: Response):
    response.headers["X-Accel-Expires"] = "60"
    return await publica.catalogo(sesion, sitio.alcance, _base(request))


@router.get("/disponibilidad", response_model=list[HabitacionDisponible])
async def disponibilidad(
    sitio: SitioActual,
    sesion: Sesion,
    request: Request,
    response: Response,
    llegada: date,
    salida: date,
    huespedes: Annotated[int, Query(ge=1, le=20)] = 1,
):
    if not 0 < (salida - llegada).days <= MAX_NOCHES:
        raise ReglaDeNegocio(f"De 1 a {MAX_NOCHES} noches", codigo="noches")
    response.headers["X-Accel-Expires"] = "5"  # la comprobación final la hace Postgres al retener
    return await publica.disponibilidad(sesion, sitio.alcance, _base(request), llegada, salida, huespedes)


@router.post("/reservas", status_code=201, response_model=ReservaPublica)
async def retener(
    datos: ReservaWeb, sitio: SitioActual, sesion: Sesion, request: Request, clave: ClaveIdempotencia = None
):
    """Retiene las noches 15 minutos. `Idempotency-Key` obligatoria: reintentar
    con la misma clave nunca crea dos reservas."""

    async def operacion():
        r, token = await publica.retener(sesion, sitio, datos)
        return 201, jsonable_encoder(ReservaPublica.model_validate(publica.a_salida(r, token)))

    return await _idempotente(request, sesion, sitio, clave, operacion)


@router.get("/reservas/{codigo}", response_model=ReservaPublica)
async def consultar(codigo: Codigo, t: Token, sitio: SitioActual, sesion: Sesion, response: Response):
    response.headers.update(SIN_CACHE)
    return publica.a_salida(await publica.consultar(sesion, sitio, codigo, t))


@router.post("/reservas/{codigo}/cancelar", response_model=ReservaPublica)
async def cancelar(
    codigo: Codigo,
    t: Token,
    sitio: SitioActual,
    sesion: Sesion,
    request: Request,
    clave: ClaveIdempotencia = None,
):
    async def operacion():
        r = await publica.cancelar(sesion, sitio, codigo, t)
        return 200, jsonable_encoder(ReservaPublica.model_validate(publica.a_salida(r)))

    return await _idempotente(request, sesion, sitio, clave, operacion)


@router.options("/{ruta:path}", include_in_schema=False)
async def verificacion_previa(ruta: str, request: Request, sesion: Sesion) -> Response:
    """CORS: el navegador pregunta antes de mandar cabeceras propias. La
    pregunta no trae la clave, así que se acepta cualquier origen de algún sitio
    vigente; la petición real comprueba que sea el de ESE sitio."""
    origen = request.headers.get("origin", "")
    vigente = await sesion.scalar(
        select(Sitio.id).where(Sitio.revocado_en.is_(None), literal(origen) == any_(Sitio.origenes)).limit(1)
    )
    if not origen or vigente is None:
        raise SinPermiso("Origen no permitido", codigo="origen_no_permitido")
    request.state.origen_permitido = origen
    return Response(
        status_code=204,
        headers={
            "Access-Control-Allow-Methods": "GET, POST",
            "Access-Control-Allow-Headers": "X-Frida-Clave, Idempotency-Key, Content-Type",
            "Access-Control-Max-Age": "600",
        },
    )
