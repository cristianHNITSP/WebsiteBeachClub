"""Punto de entrada de la API: `uvicorn app.main:app`."""

import logging
import sys
from contextlib import asynccontextmanager

from fastapi import FastAPI

from app import contexto, errores
from app.auth.sitio import CorsSitios
from app.conexion_redis import redis
from app.config import obtener_config
from app.db import motor
from app.rutas import auth, eventos, health, v1
from app.rutas.admin import (
    auditoria,
    avisos,
    externas,
    fotos,
    habitaciones,
    metricas,
    personal,
    reservas,
    sitios,
    tarifas,
)


@asynccontextmanager
async def _ciclo(_: FastAPI):
    yield
    # Al apagar: cerrar conexiones con orden (despliegue sin cortes a medias).
    await redis.aclose()
    await motor.dispose()


def crear_app() -> FastAPI:
    config = obtener_config()
    logging.basicConfig(level=logging.INFO if config.es_desarrollo else logging.WARNING)
    app = FastAPI(
        title="Hoteles Frida: motor de reservas",
        version="0.1.0",
        lifespan=_ciclo,
        # El contrato (OpenAPI) solo en desarrollo.
        docs_url="/api/docs" if config.es_desarrollo else None,
        redoc_url=None,
        openapi_url="/api/openapi.json" if config.es_desarrollo else None,
    )
    errores.registrar(app)
    # Registro de acceso: una línea JSON por solicitud, SIEMPRE (también en
    # producción), con el mismo id que la auditoría (PLAN-BACKEND §17.4).
    acceso = logging.getLogger("frida.acceso")
    if not acceso.handlers:
        acceso.addHandler(logging.StreamHandler(sys.stdout))
        acceso.setLevel(logging.INFO)
        acceso.propagate = False
    app.add_middleware(CorsSitios)
    app.add_middleware(contexto.Solicitudes)
    if config.es_desarrollo:
        # En producción las sirve Nginx (`location /media/fotos/`, alias al
        # volumen, solo GET, sin autoindex). Aquí, para que el panel las vea.
        from fastapi.staticfiles import StaticFiles

        app.mount("/media/fotos", StaticFiles(directory=config.fotos_dir, check_dir=False), name="fotos")
    app.include_router(health.router)
    app.include_router(auth.router)
    app.include_router(habitaciones.router)
    app.include_router(fotos.router)
    app.include_router(tarifas.router)
    app.include_router(auditoria.router)
    app.include_router(personal.router)
    app.include_router(avisos.router)
    app.include_router(metricas.router)
    app.include_router(eventos.router)
    app.include_router(reservas.router)
    app.include_router(reservas.cobro)
    app.include_router(sitios.router)
    app.include_router(externas.router)
    app.include_router(v1.router)
    return app


app = crear_app()
