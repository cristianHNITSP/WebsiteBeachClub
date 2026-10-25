"""Quién, desde dónde y en qué solicitud (auditoría forense, PLAN-BACKEND §17.4).

Una solicitud HTTP (o un comando de la CLI, o una tarea) abre su `Contexto`;
la sesión del empleado lo completa al validarse. `auditar()` lo lee solo: nadie
tiene que acordarse de pasar la IP o la sesión, y ningún evento sale sin ellas.
"""

import json
import logging
import time
import uuid
from contextvars import ContextVar
from dataclasses import dataclass
from uuid import UUID

log_acceso = logging.getLogger("frida.acceso")


@dataclass(slots=True)
class Contexto:
    solicitud_id: UUID
    origen: str  # http | cli | tarea
    ip: str | None = None
    agente: str | None = None
    usuario_id: UUID | None = None
    sesion_id: UUID | None = None
    sitio_id: UUID | None = None  # API pública: qué website hizo la petición


_actual: ContextVar[Contexto | None] = ContextVar("contexto", default=None)


def actual() -> Contexto | None:
    return _actual.get()


def abrir(origen: str, **datos) -> Contexto:
    """Para la CLI y las tareas (las solicitudes HTTP lo abren en `Solicitudes`)."""
    ctx = Contexto(solicitud_id=uuid.uuid7(), origen=origen, **datos)
    _actual.set(ctx)
    return ctx


SIN_LOG = ("/api/health",)  # el healthcheck de Docker no llena el registro


class Solicitudes:
    """Middleware ASGI: cada solicitud recibe un id (uuidv7) que viaja en la
    respuesta (`X-Solicitud-Id`), en cada fila de auditoría que produzca y en
    una línea JSON del registro de acceso. Con ese id se reconstruye qué pasó."""

    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            return await self.app(scope, receive, send)
        cabeceras = dict(scope.get("headers") or [])
        ctx = Contexto(
            solicitud_id=uuid.uuid7(),
            origen="http",
            # Detrás de Nginx, uvicorn ya pone aquí la IP real (--proxy-headers).
            ip=scope["client"][0] if scope.get("client") else None,
            agente=cabeceras.get(b"user-agent", b"").decode("latin-1")[:300] or None,
        )
        token = _actual.set(ctx)
        inicio, estado = time.perf_counter(), 500

        async def enviar(mensaje):
            nonlocal estado
            if mensaje["type"] == "http.response.start":
                estado = mensaje["status"]
                mensaje["headers"] = [
                    *mensaje.get("headers", []),
                    (b"x-solicitud-id", str(ctx.solicitud_id).encode()),
                ]
            await send(mensaje)

        try:
            await self.app(scope, receive, enviar)
        finally:
            if not scope["path"].startswith(SIN_LOG):
                log_acceso.info(
                    json.dumps(
                        {
                            "solicitud_id": str(ctx.solicitud_id),
                            "metodo": scope["method"],
                            "ruta": scope["path"],
                            "estado": estado,
                            "ms": round((time.perf_counter() - inicio) * 1000, 1),
                            "ip": ctx.ip,
                            "usuario_id": str(ctx.usuario_id) if ctx.usuario_id else None,
                            "sesion_id": str(ctx.sesion_id) if ctx.sesion_id else None,
                            "sitio_id": str(ctx.sitio_id) if ctx.sitio_id else None,
                        },
                        ensure_ascii=False,
                    )
                )
            _actual.reset(token)
