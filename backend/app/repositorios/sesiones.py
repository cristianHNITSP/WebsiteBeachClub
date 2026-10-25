"""Consultas de sesiones del panel. Sin reglas ni commit."""

from datetime import datetime
from uuid import UUID

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.modelos import SesionUsuario


async def crear(sesion: AsyncSession, **datos) -> SesionUsuario:
    s = SesionUsuario(**datos)
    sesion.add(s)
    await sesion.flush()
    return s


async def por_id(sesion: AsyncSession, sid: UUID) -> SesionUsuario | None:
    return await sesion.get(SesionUsuario, sid)


async def por_id_bloqueada(sesion: AsyncSession, sid: UUID) -> SesionUsuario | None:
    """FOR UPDATE: dos renovaciones a la vez de la misma sesión se forman en fila."""
    consulta = select(SesionUsuario).where(SesionUsuario.id == sid).with_for_update()
    return (await sesion.execute(consulta)).scalar_one_or_none()


async def vigentes_de(sesion: AsyncSession, usuario_id: UUID, ahora: datetime) -> list[SesionUsuario]:
    consulta = (
        select(SesionUsuario)
        .where(
            SesionUsuario.usuario_id == usuario_id,
            SesionUsuario.revocada.is_(False),
            SesionUsuario.vence > ahora,
        )
        .order_by(SesionUsuario.usada.desc())
    )
    return list((await sesion.execute(consulta)).scalars())


async def revocar(
    sesion: AsyncSession, usuario_id: UUID, sids: list[UUID] | None = None, *, excepto: UUID | None = None
) -> list[UUID]:
    """Revoca las sesiones vigentes del usuario (todas, las indicadas o todas menos
    `excepto`). Devuelve cuáles."""
    consulta = (
        update(SesionUsuario)
        .where(SesionUsuario.usuario_id == usuario_id, SesionUsuario.revocada.is_(False))
        .values(revocada=True)
        .returning(SesionUsuario.id)
    )
    if sids is not None:
        consulta = consulta.where(SesionUsuario.id.in_(sids))
    if excepto is not None:
        consulta = consulta.where(SesionUsuario.id != excepto)
    return list((await sesion.execute(consulta)).scalars())
