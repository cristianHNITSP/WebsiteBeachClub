"""Quién hace la petición y qué puede hacer (BACKEND-USUARIOS-Y-PERMISOS §3).

Cero consultas a la base por petición: el token de acceso ya trae rol,
permisos y propiedades. Solo se consulta Redis para saber si su sesión fue
revocada (cerrar sesión, dar de baja a un empleado): así un token robado deja
de servir al instante, sin esperar sus 15 minutos.
"""

from dataclasses import dataclass
from typing import Annotated
from uuid import UUID

from authx import TokenPayload
from fastapi import Depends, Request

from app import contexto
from app.auth.tokens import auth
from app.conexion_redis import redis
from app.db import Sesion
from app.errores import NoAutenticado, SinPermiso
from app.servicios.auditoria import auditar

REVOCADA_TTL_S = 20 * 60  # más que la vida del token de acceso (15 min)


def clave_revocada(sid: UUID | str) -> str:
    return f"revocada:sid:{sid}"


@dataclass(frozen=True, slots=True)
class Actor:
    """El empleado que hace la petición, tal como lo dice su token."""

    id: UUID
    sid: UUID
    rol: str
    permisos: frozenset[str]
    propiedades: frozenset[UUID]  # a cuáles tiene acceso (vacío si tiene todas)
    todas_las_propiedades: bool

    def puede(self, permiso: str) -> bool:
        return permiso in self.permisos


async def actor_actual(payload: Annotated[TokenPayload, Depends(auth.access_token_required)]) -> Actor:
    datos = payload.model_extra or {}
    try:
        sid = UUID(datos["sid"])
        actor = Actor(
            id=UUID(payload.sub),
            sid=sid,
            rol=str(datos["rol"]),
            permisos=frozenset(datos.get("permisos", [])),
            propiedades=frozenset(UUID(p) for p in datos.get("propiedades", [])),
            todas_las_propiedades=bool(datos.get("todas", False)),
        )
    except (KeyError, ValueError, TypeError) as e:
        raise NoAutenticado("Tu sesión no es válida. Vuelve a entrar.") from e
    try:
        revocada = await redis.exists(clave_revocada(sid))
    except Exception as e:
        # Sin Redis no se puede saber si fue revocada: se niega (más seguro).
        raise NoAutenticado("No se puede verificar tu sesión en este momento.") from e
    if revocada:
        raise NoAutenticado("Tu sesión se cerró. Vuelve a entrar.")
    if ctx := contexto.actual():  # todo lo que audite esta solicitud lleva quién y con qué sesión
        ctx.usuario_id, ctx.sesion_id = actor.id, actor.sid
    return actor


ActorActual = Annotated[Actor, Depends(actor_actual)]


def requiere_permiso(*claves: str):
    """403 si al empleado le falta CUALQUIERA de los permisos pedidos.
    Toda ruta del panel declara la suya (una prueba recorre las rutas y falla si alguna no)."""

    async def _dep(actor: ActorActual, sesion: Sesion, request: Request) -> Actor:
        if not set(claves) <= actor.permisos:
            # Evento de seguridad: queda en la auditoría aunque la respuesta sea 403.
            await auditar(
                sesion,
                accion="permiso.denegado",
                entidad="ruta",
                entidad_id=f"{request.method} {request.url.path}"[:64],
                despues={"requeridos": sorted(claves), "faltan": sorted(set(claves) - actor.permisos)},
            )
            raise SinPermiso("No tienes permiso para esto", confirmar=True)
        return actor

    _dep.permisos_requeridos = claves  # type: ignore[attr-defined]  # lo lee la prueba de contrato
    return _dep
