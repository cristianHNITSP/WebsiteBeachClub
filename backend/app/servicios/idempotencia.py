"""`Idempotency-Key` de la API pública (PLAN-BACKEND §7). Sin FastAPI.

La clave se inserta en la MISMA transacción que la operación:
- Clave nueva: se ejecuta y se guarda la respuesta; ambas cosas o ninguna.
- Clave ya terminada, misma petición: se devuelve lo guardado sin ejecutar.
- Misma clave con otra petición: 422.
- Dos a la vez con la misma clave: la segunda espera en el INSERT a que la
  primera termine (Postgres) y entonces recibe lo guardado. Si la espera pasa de
  3 s, 409 `en_proceso` con `Retry-After: 1`.
Si la operación falla, no queda nada: reintentar con la misma clave vuelve a
intentarlo (una petición que falló no ocurrió).
"""

import hashlib
from collections.abc import Awaitable, Callable
from datetime import timedelta
from uuid import UUID

from psycopg.errors import LockNotAvailable
from sqlalchemy import delete, func, select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.exc import OperationalError
from sqlalchemy.ext.asyncio import AsyncSession

from app.errores import Conflicto, ReglaDeNegocio
from app.modelos import ClaveIdempotencia

ESPERA = "3s"


def huella(metodo: str, ruta: str, cuerpo: bytes) -> str:
    return hashlib.sha256(f"{metodo} {ruta}\n".encode() + cuerpo).hexdigest()


async def ejecutar(
    sesion: AsyncSession,
    sitio_id: UUID,
    clave: UUID,
    huella_peticion: str,
    operacion: Callable[[], Awaitable[tuple[int, dict]]],
) -> tuple[int, dict, bool]:
    """(código HTTP, cuerpo, repetida)."""
    await sesion.execute(select(func.set_config("lock_timeout", ESPERA, True)))
    try:
        nueva = await sesion.scalar(
            insert(ClaveIdempotencia)
            .values(
                sitio_id=sitio_id, clave=clave, hash_peticion=huella_peticion, codigo_http=0, respuesta={}
            )
            .on_conflict_do_nothing()
            .returning(ClaveIdempotencia.clave)
        )
    except OperationalError as e:
        if isinstance(e.orig, LockNotAvailable):
            raise Conflicto(
                "Esa petición se está procesando. Intenta en un segundo.",
                codigo="en_proceso",
                reintentar_en=1,
            ) from e
        raise
    await sesion.execute(select(func.set_config("lock_timeout", "0", True)))
    if nueva is None:
        guardada = await sesion.get(ClaveIdempotencia, (sitio_id, clave))
        if guardada.hash_peticion != huella_peticion:
            raise ReglaDeNegocio(
                "Esa Idempotency-Key ya se usó con otra petición", codigo="idempotencia_reutilizada"
            )
        return guardada.codigo_http, guardada.respuesta, True
    codigo, cuerpo = await operacion()
    fila = await sesion.get(ClaveIdempotencia, (sitio_id, clave))
    fila.codigo_http, fila.respuesta = codigo, cuerpo
    await sesion.flush()
    return codigo, cuerpo, False


def borrar_viejas(sesion, dias: int = 7) -> int:
    """Celery, cada día. Síncrona."""
    r = sesion.execute(
        delete(ClaveIdempotencia).where(ClaveIdempotencia.creada < func.now() - timedelta(days=dias))
    )
    return r.rowcount
