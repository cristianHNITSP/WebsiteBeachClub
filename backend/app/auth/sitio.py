"""Quién llama a la API pública v1: un sitio web, por su clave (PLAN-BACKEND §4.2).

- Clave pública `pk_…` en la cabecera `X-Frida-Clave`: la usa el navegador del
  visitante (widget o JavaScript del sitio). Solo desde los orígenes permitidos
  del sitio; sin cabecera `Origin` (servidor, curl) también pasa: la clave es
  pública y solo sirve para ver, cotizar y retener.
- Clave secreta `sk_…` en `Authorization: Bearer`: servidor a servidor. Se
  compara su SHA-256 con el guardado; la clave nunca se guarda. (El plan decía
  "firma HMAC de cada petición", pero eso exige guardar la clave legible; con
  TLS, el portador + hash es lo que hacen Stripe y compañía.)

El alcance de la petición (y el RLS de Postgres) son las propiedades que vende
el sitio: nunca ve ni reserva nada de otra.
"""

import hashlib
import logging
import secrets
import time
from dataclasses import dataclass
from typing import Annotated
from uuid import UUID

from fastapi import Depends, Request
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app import contexto
from app.auth.alcance import Alcance, fijar_en_base
from app.conexion_redis import redis
from app.config import obtener_config
from app.db import Sesion
from app.errores import ErrorDeDominio, NoAutenticado, SinPermiso
from app.modelos import Sitio

log = logging.getLogger(__name__)

POR_MINUTO = 600  # por sitio; lo que sirve la caché de Nginx no llega aquí
POR_MINUTO_IP_ESCRITURA = 20  # retener y cancelar, por IP: frena a quien acapara noches


class DemasiadasPeticiones(ErrorDeDominio):
    estado, codigo = 429, "demasiadas_peticiones"


def _entorno() -> str:
    return "live" if obtener_config().entorno == "produccion" else "test"


def huella(clave: str) -> str:
    return hashlib.sha256(clave.encode()).hexdigest()


def nuevas_claves() -> tuple[str, str]:
    """(pública, secreta). La secreta se muestra UNA vez; aquí solo vive su hash."""
    e = _entorno()
    return f"pk_{e}_{secrets.token_urlsafe(24)}", f"sk_{e}_{secrets.token_urlsafe(32)}"


@dataclass(frozen=True, slots=True)
class SitioQueLlama:
    id: UUID
    nombre: str
    alcance: Alcance
    secreta: bool  # llamó con la clave secreta (servidor a servidor)


async def _limite(clave: str, maximo: int) -> None:
    """Ventana de un minuto en Redis. Si Redis no responde, deja pasar
    (PLAN-BACKEND §8: la verdad está en Postgres; solo el login falla cerrado)."""
    k = f"limite:{clave}:{int(time.time() // 60)}"
    try:
        async with redis.pipeline(transaction=True) as p:
            p.incr(k)
            p.expire(k, 70)
            n, _ = await p.execute()
    except Exception:
        log.warning("Sin Redis: el límite de peticiones de la API pública no se aplica")
        return
    if n > maximo:
        raise DemasiadasPeticiones("Demasiadas peticiones. Intenta en un minuto.", reintentar_en=60)


async def sitio_actual(request: Request, sesion: Sesion) -> SitioQueLlama:
    portador = request.headers.get("authorization", "")
    publica = request.headers.get("x-frida-clave", "")
    consulta = select(Sitio).options(selectinload(Sitio.propiedades)).where(Sitio.revocado_en.is_(None))
    if portador.startswith("Bearer sk_"):
        sitio = await sesion.scalar(consulta.where(Sitio.clave_secreta_hash == huella(portador[7:])))
        secreta = True
    elif publica.startswith("pk_"):
        sitio = await sesion.scalar(consulta.where(Sitio.clave_publica == publica))
        secreta = False
    else:
        raise NoAutenticado("Falta la clave del sitio (X-Frida-Clave o Authorization)", codigo="sin_clave")
    if sitio is None:
        raise NoAutenticado("Esa clave no es válida o fue revocada", codigo="clave_invalida")
    origen = request.headers.get("origin")
    if not secreta and origen is not None:
        if origen not in sitio.origenes:
            raise SinPermiso("Este sitio no puede usar la API desde ese origen", codigo="origen_no_permitido")
        request.state.origen_permitido = origen  # lo lee CorsSitios para la respuesta
    await _limite(f"sitio:{sitio.id}", POR_MINUTO)
    if request.method != "GET":
        ctx = contexto.actual()
        await _limite(f"ip:{ctx.ip if ctx else 'sin-ip'}", POR_MINUTO_IP_ESCRITURA)
    if ctx := contexto.actual():
        ctx.sitio_id = sitio.id
    alcance = Alcance(frozenset(p.id for p in sitio.propiedades))
    await fijar_en_base(sesion, alcance)
    return SitioQueLlama(id=sitio.id, nombre=sitio.nombre, alcance=alcance, secreta=secreta)


SitioActual = Annotated[SitioQueLlama, Depends(sitio_actual)]


class CorsSitios:
    """Middleware ASGI: en `/api/v1/` pone `Access-Control-Allow-Origin` con el
    origen que `sitio_actual` ya validó (también en las respuestas de error, para
    que el widget pueda leer `error`) y siempre `Vary: Origin`. La verificación
    previa (OPTIONS) la contesta la ruta de v1, que sí consulta la base."""

    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http" or not scope["path"].startswith("/api/v1/"):
            return await self.app(scope, receive, send)
        scope.setdefault("state", {})

        async def enviar(mensaje):
            if mensaje["type"] == "http.response.start":
                cabeceras = [*mensaje.get("headers", []), (b"vary", b"Origin")]
                if origen := scope["state"].get("origen_permitido"):
                    cabeceras.append((b"access-control-allow-origin", origen.encode("latin-1")))
                    cabeceras.append(
                        (b"access-control-expose-headers", b"X-Solicitud-Id, Idempotent-Replayed")
                    )
                mensaje["headers"] = cabeceras
            await send(mensaje)

        await self.app(scope, receive, enviar)
