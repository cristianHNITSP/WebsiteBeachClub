"""Límite de intentos de entrada, en Redis (BACKEND-USUARIOS-Y-PERMISOS §5).

Por IP y por usuario: 5 fallos en 15 minutos bloquean 15 minutos. El contador
por usuario frena a quien prueba contraseñas desde muchas IP; el de IP, a quien
prueba muchos usuarios desde una. Si Redis no responde, se BLOQUEA (en el login
es más seguro fallar cerrado; PLAN-BACKEND §8).
"""

import hashlib

from app.conexion_redis import redis
from app.errores import ErrorDeDominio

MAXIMO = 5
VENTANA_S = 15 * 60


class DemasiadosIntentos(ErrorDeDominio):
    estado, codigo = 429, "demasiados_intentos"


def _claves(ip: str, identificador: str) -> list[str]:
    # El identificador va con hash: Redis no guarda correos ni usuarios.
    ident = hashlib.sha256(identificador.strip().lower().encode()).hexdigest()[:32]
    return [f"intentos:ip:{ip}", f"intentos:id:{ident}"]


async def comprobar(ip: str, identificador: str) -> None:
    try:
        valores = await redis.mget(_claves(ip, identificador))
        espera = max(
            [
                await redis.ttl(k)
                for k, v in zip(_claves(ip, identificador), valores, strict=True)
                if v is not None and int(v) >= MAXIMO
            ]
            or [0]
        )
    except Exception as e:
        raise DemasiadosIntentos(
            "No se puede verificar el acceso en este momento. Intenta en un minuto.", reintentar_en=60
        ) from e
    if espera > 0:
        minutos = max(1, round(espera / 60))
        raise DemasiadosIntentos(
            f"Demasiados intentos. Vuelve a intentarlo en {minutos} minuto{'s' if minutos != 1 else ''}.",
            reintentar_en=espera,
        )


async def registrar_fallo(ip: str, identificador: str) -> None:
    async with redis.pipeline(transaction=True) as p:
        for k in _claves(ip, identificador):
            p.incr(k)
            p.expire(k, VENTANA_S, nx=True)  # la ventana empieza con el PRIMER fallo
        await p.execute()


async def limpiar_usuario(ip: str, identificador: str) -> None:
    """Al entrar bien se olvidan los fallos de ese usuario (los de la IP se quedan)."""
    await redis.delete(_claves(ip, identificador)[1])
