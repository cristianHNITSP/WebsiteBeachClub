"""Consultas de usuarios. Sin reglas de negocio ni commit (BACKEND-ARQUITECTURA §1)."""

from uuid import UUID

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.modelos import Permiso, Propiedad, Rol, Usuario


def _con_acceso():
    # Lo que la sesión necesita, cargado a propósito (las relaciones son lazy="raise").
    return (selectinload(Usuario.rol).selectinload(Rol.permisos), selectinload(Usuario.propiedades))


async def por_identificador(sesion: AsyncSession, identificador: str) -> Usuario | None:
    """Por usuario o por correo, sin distinguir mayúsculas (columnas citext)."""
    consulta = select(Usuario).where(or_(Usuario.usuario == identificador, Usuario.correo == identificador))
    return (await sesion.execute(consulta.options(*_con_acceso()))).scalar_one_or_none()


async def por_id(sesion: AsyncSession, usuario_id: UUID) -> Usuario | None:
    consulta = select(Usuario).where(Usuario.id == usuario_id).options(*_con_acceso())
    return (await sesion.execute(consulta)).scalar_one_or_none()


async def todas_las_propiedades(sesion: AsyncSession) -> list[Propiedad]:
    return list((await sesion.execute(select(Propiedad).order_by(Propiedad.nombre))).scalars())


async def listar(
    sesion: AsyncSession, *, q: str | None, rol: str | None, activo: bool | None, pagina: int, por_pagina: int
) -> tuple[list[Usuario], int]:
    filtros = [Rol.es_personal.is_(True)]
    if q:
        patron = q.strip()
        filtros.append(
            or_(
                Usuario.nombre.icontains(patron, autoescape=True),
                Usuario.usuario.icontains(patron, autoescape=True),
                Usuario.correo.icontains(patron, autoescape=True),
            )
        )
    if rol:
        filtros.append(Rol.clave == rol)
    if activo is not None:
        filtros.append(Usuario.activo.is_(activo))
    base = select(Usuario).join(Usuario.rol).where(*filtros)
    total = (await sesion.execute(select(func.count()).select_from(base.subquery()))).scalar_one()
    consulta = (
        base.options(*_con_acceso())
        .order_by(Usuario.activo.desc(), Usuario.nombre, Usuario.id)
        .limit(por_pagina)
        .offset((pagina - 1) * por_pagina)
    )
    return list((await sesion.execute(consulta)).scalars()), total


async def roles_del_personal(sesion: AsyncSession) -> list[Rol]:
    consulta = (
        select(Rol).where(Rol.es_personal.is_(True)).options(selectinload(Rol.permisos)).order_by(Rol.id)
    )
    return list((await sesion.execute(consulta)).scalars())


async def rol_por_clave(sesion: AsyncSession, clave: str) -> Rol | None:
    consulta = select(Rol).where(Rol.clave == clave).options(selectinload(Rol.permisos))
    return (await sesion.execute(consulta)).scalar_one_or_none()


async def propiedades_por_ids(sesion: AsyncSession, ids: list[UUID]) -> list[Propiedad]:
    return list((await sesion.execute(select(Propiedad).where(Propiedad.id.in_(ids)))).scalars())


async def gerentes_activos(sesion: AsyncSession) -> int:
    """Cuántas personas activas tienen la gestión del personal (para no quedarse sin ninguna)."""
    consulta = (
        select(func.count(Usuario.id.distinct()))
        .join(Usuario.rol)
        .join(Rol.permisos)
        .where(Usuario.activo.is_(True), Permiso.clave == "usuarios.gestionar")
    )
    return (await sesion.execute(consulta)).scalar_one()
