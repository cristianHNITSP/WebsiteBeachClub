"""Salud del servicio, para el despliegue y la prueba de humo (PLAN-BACKEND §8).

- /api/health: el proceso vive. No toca nada más (si la base cae, la API no
  debe "morir" por eso; para eso está /listo).
- /api/health/listo: la base y Redis responden. 503 si alguna no.
Públicas a propósito: no exponen datos, solo "ok" o "falla" por componente.
"""

import asyncio
import time

from fastapi import APIRouter
from fastapi.responses import JSONResponse
from sqlalchemy import text

from app.conexion_redis import redis
from app.db import motor

router = APIRouter(prefix="/api/health", tags=["salud"])

TOPE_S = 2.0  # un componente que tarda más que esto cuenta como caído


@router.get("")
async def vivo() -> dict:
    return {"estado": "ok"}


async def _base() -> None:
    async with motor.connect() as c:
        await c.execute(text("SELECT 1"))


async def _redis() -> None:
    await redis.ping()


async def _componente(prueba) -> str:
    try:
        await asyncio.wait_for(prueba(), timeout=TOPE_S)
        return "ok"
    except Exception:
        return "falla"


async def _celery() -> str:
    """Informativo: el worker deja un latido en Redis cada minuto (tareas/sistema.py).
    No decide si la API está lista: la API sigue sirviendo aunque el worker caiga."""
    try:
        valor = await asyncio.wait_for(redis.get("celery:latido"), timeout=TOPE_S)
        return "ok" if valor and time.time() - float(valor) < 180 else "sin latido"
    except Exception:
        return "desconocido"


@router.get("/listo")
async def listo() -> JSONResponse:
    base, red, celery = await asyncio.gather(_componente(_base), _componente(_redis), _celery())
    estado = 200 if base == red == "ok" else 503
    cuerpo = {
        "estado": "listo" if estado == 200 else "no listo",
        "base": base,
        "redis": red,
        "celery": celery,
    }
    return JSONResponse(cuerpo, status_code=estado)
