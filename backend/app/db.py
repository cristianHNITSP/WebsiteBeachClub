"""Conexión a Postgres: motor async (API) y síncrono (Celery).

Una operación del negocio = una transacción (PLAN-BACKEND §6.1). La abre y la
cierra la dependencia `Sesion`: commit si la ruta termina bien, rollback si
algo falla. Nadie más hace commit.
"""

from collections.abc import AsyncIterator
from typing import Annotated

from fastapi import Depends
from sqlalchemy import create_engine
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import Session, sessionmaker

from app.config import obtener_config


def _opciones() -> dict:
    c = obtener_config()
    return {
        "pool_size": c.db_pool,
        "max_overflow": c.db_pool,
        "pool_pre_ping": True,
        # Tope por consulta también desde la conexión (además del ALTER ROLE
        # del usuario de la API): ninguna consulta desbocada tumba la base.
        "connect_args": {"options": f"-c statement_timeout={c.db_tope_consulta_ms}"},
    }


motor: AsyncEngine = create_async_engine(obtener_config().url_api(), **_opciones())
SesionAsync = async_sessionmaker(motor, expire_on_commit=False)

# Celery: mismo modelo, sesión síncrona (BACKEND-ARQUITECTURA §7).
motor_sincrono = create_engine(obtener_config().url_api(), **_opciones())
SesionSincrona = sessionmaker(motor_sincrono, expire_on_commit=False)


async def get_sesion() -> AsyncIterator[AsyncSession]:
    async with SesionAsync() as sesion:
        try:
            yield sesion
            await sesion.commit()
        except BaseException as e:
            # Un error de dominio con confirmar=True guarda lo hecho (el evento de
            # seguridad y su auditoría); cualquier otro error lo deshace todo.
            await (sesion.commit() if getattr(e, "confirmar", False) else sesion.rollback())
            raise


# scope="function": el commit corre ANTES de enviar la respuesta. Con el
# alcance por omisión ("request"), FastAPI lo correría DESPUÉS: el cliente
# podría recibir "200, guardado" de algo que luego falla al guardar.
Sesion = Annotated[AsyncSession, Depends(get_sesion, scope="function")]

__all__ = ["Sesion", "SesionAsync", "SesionSincrona", "Session", "get_sesion", "motor", "motor_sincrono"]
