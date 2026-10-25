"""Tiempo real del panel: outbox → Redis → SSE (PLAN-BACKEND §6.4, §10).

- Canales de Redis: `eventos:<propiedad_id>` (o `eventos:global`).
- Cada persona escucha solo sus propiedades y recibe solo lo que su rol puede ver.
- Cada evento lleva su `id` (el del outbox, uuidv7, ordenado): si la conexión se
  corta, el navegador reconecta con `Last-Event-ID` y aquí se reenvía lo que
  faltó, desde el outbox.
- Latido cada 25 s (que nada en el camino corte la conexión) y el flujo se cierra
  solo a los 10 min (el token de acceso dura 15): el panel reconecta con la
  sesión renovada. Si la sesión se revoca, se corta en segundos.
"""

import json
import time
from collections.abc import AsyncIterator, Awaitable, Callable
from uuid import UUID

from sqlalchemy import select

from app.auth.dependencias import Actor, clave_revocada
from app.conexion_redis import redis
from app.modelos import Outbox

LATIDO_S = 25
REVISAR_S = 10
DURACION_MAX_S = 10 * 60
REENVIO_MAX = 500
# Qué permiso hace falta para recibir cada familia de eventos.
PERMISO_DE = {"reserva": "reservas.ver", "pago": "reservas.ver", "externas": "externas.ver"}


def canal(propiedad_id: UUID | None) -> str:
    return f"eventos:{propiedad_id or 'global'}"


def mensaje(e: Outbox) -> dict:
    """Lo que viaja al panel: poco y sin datos personales (el panel pide lo
    demás a la API, con sus permisos)."""
    return {
        "id": str(e.id),
        "tipo": e.tipo,
        "agregado": e.agregado,
        "agregado_id": str(e.agregado_id),
        "propiedad_id": str(e.propiedad_id) if e.propiedad_id else None,
        "por": (e.datos or {}).get("por"),
    }


def puede_ver(actor: Actor, m: dict) -> bool:
    permiso = PERMISO_DE.get(m["tipo"].split(".")[0])
    if permiso and not actor.puede(permiso):
        return False
    prop = m.get("propiedad_id")
    return actor.todas_las_propiedades or prop is None or UUID(prop) in actor.propiedades


def sse(m: dict) -> str:
    return f"id: {m['id']}\ndata: {json.dumps(m, ensure_ascii=False)}\n\n"


async def flujo(
    actor: Actor,
    ultimo: UUID | None,
    desconectado: Callable[[], Awaitable[bool]],
    abrir_sesion,
    *,
    duracion_max_s: float = DURACION_MAX_S,
) -> AsyncIterator[str]:
    yield "retry: 3000\n\n"  # el navegador reintenta a los 3 s
    if ultimo is not None:
        async with abrir_sesion() as s:
            consulta = (
                select(Outbox)
                .where(Outbox.id > ultimo, Outbox.despachado_en.is_not(None))
                .order_by(Outbox.id)
                .limit(REENVIO_MAX)
            )
            perdidos = [mensaje(e) for e in (await s.execute(consulta)).scalars()]
        for m in perdidos:
            if puede_ver(actor, m):
                yield sse(m)

    pubsub = redis.pubsub()
    if actor.todas_las_propiedades:
        await pubsub.psubscribe("eventos:*")
    else:
        await pubsub.subscribe(canal(None), *(canal(p) for p in actor.propiedades))
    inicio = latido = revisado = time.monotonic()
    try:
        while time.monotonic() - inicio < duracion_max_s:
            if await desconectado():
                return
            llegado = await pubsub.get_message(ignore_subscribe_messages=True, timeout=1.0)
            if llegado and llegado.get("data"):
                m = json.loads(llegado["data"])
                if puede_ver(actor, m):
                    yield sse(m)
            ahora = time.monotonic()
            if ahora - latido >= LATIDO_S:
                latido = ahora
                yield ": latido\n\n"
            if ahora - revisado >= REVISAR_S:
                revisado = ahora
                if await redis.exists(clave_revocada(actor.sid)):
                    return  # sesión cerrada o revocada: fuera ya
    finally:
        await pubsub.aclose()
