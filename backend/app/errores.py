"""Errores de dominio y su traducción a HTTP (docs/BACKEND-ARQUITECTURA.md §4).

Las capas de abajo (servicios, repositorios) lanzan estas excepciones; solo
aquí se convierten en respuesta. Así un servicio sirve igual para una ruta,
para Celery o para una prueba. Forma única del error:
    {"error": "<frase para la persona>", "codigo": "<para la máquina>", ...}
"""

import logging

from authx.exceptions import AuthXException, CSRFError, MissingCSRFTokenError
from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

log = logging.getLogger(__name__)


class ErrorDeDominio(Exception):
    estado = 400
    codigo = "error"

    def __init__(self, mensaje: str, *, codigo: str | None = None, confirmar: bool = False, **detalle):
        super().__init__(mensaje)
        self.mensaje = mensaje
        self.detalle = {"codigo": codigo or self.codigo, **detalle}
        # confirmar=True: lo hecho en la transacción SE GUARDA aunque se responda
        # con error. Solo para eventos de seguridad que deben quedar sí o sí
        # (login fallido, sesión robada, permiso denegado). Ver db.get_sesion.
        self.confirmar = confirmar


class NoAutenticado(ErrorDeDominio):
    estado, codigo = 401, "no_autenticado"


class SinPermiso(ErrorDeDominio):
    estado, codigo = 403, "sin_permiso"


class NoEncontrado(ErrorDeDominio):
    """404 también para lo que existe pero no es tuyo: no se confirma que exista."""

    estado, codigo = 404, "no_encontrado"


class Conflicto(ErrorDeDominio):
    estado, codigo = 409, "conflicto"


class ReglaDeNegocio(ErrorDeDominio):
    estado, codigo = 422, "regla_de_negocio"


def registrar(app: FastAPI) -> None:
    @app.exception_handler(ErrorDeDominio)
    async def _dominio(_: Request, e: ErrorDeDominio) -> JSONResponse:
        cabeceras = {"Retry-After": str(e.detalle["reintentar_en"])} if "reintentar_en" in e.detalle else None
        return JSONResponse({"error": e.mensaje, **e.detalle}, status_code=e.estado, headers=cabeceras)

    @app.exception_handler(AuthXException)
    async def _sesion(_: Request, e: AuthXException) -> JSONResponse:
        # Token ausente, vencido, inválido o sin su CSRF. Sin detalles técnicos.
        # AuthX re-envuelve la falta de CSRF (MissingCSRFTokenError) en un
        # MissingTokenError genérico al juntar los errores de cada ubicación
        # (authx/core.py): el tipo se pierde y solo queda el texto. Por eso se
        # mira también el mensaje. Sin esto, un CSRF ausente daría 401 en vez de 403.
        if isinstance(e, CSRFError | MissingCSRFTokenError) or "csrf" in str(e).lower():
            return JSONResponse(
                {"error": "La petición no trae su protección CSRF", "codigo": "csrf"}, status_code=403
            )
        return JSONResponse(
            {"error": "Tu sesión no es válida o ya venció. Vuelve a entrar.", "codigo": "no_autenticado"},
            status_code=401,
        )

    @app.exception_handler(RequestValidationError)
    async def _validacion(_: Request, e: RequestValidationError) -> JSONResponse:
        # Qué campo falló y por qué, sin repetir lo que mandó el cliente
        # (puede traer datos personales o basura).
        campos = [
            {"campo": ".".join(str(p) for p in err["loc"][1:]), "problema": err["type"]} for err in e.errors()
        ]
        return JSONResponse(
            {"error": "Revisa los datos enviados", "codigo": "validacion", "campos": campos}, status_code=422
        )

    @app.exception_handler(StarletteHTTPException)
    async def _http(_: Request, e: StarletteHTTPException) -> JSONResponse:
        mensajes = {404: "No existe", 405: "Método no permitido"}
        return JSONResponse(
            {"error": mensajes.get(e.status_code, "No se pudo completar"), "codigo": f"http_{e.status_code}"},
            status_code=e.status_code,
            headers=getattr(e, "headers", None),
        )

    @app.exception_handler(Exception)
    async def _inesperado(request: Request, _: Exception) -> JSONResponse:
        # Completo en el log; nunca la traza ni el mensaje interno al cliente.
        log.exception("Error no controlado en %s %s", request.method, request.url.path)
        return JSONResponse({"error": "Error interno del servidor", "codigo": "interno"}, status_code=500)
