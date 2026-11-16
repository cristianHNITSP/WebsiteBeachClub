"""Propiedades (sucursales): Cabañas Frida, Casa Frida y las que el dueño dé de alta.

No se borran: una propiedad tiene habitaciones, reservas y personal que apuntan a ella.
La `clave` (interna, única) sale del nombre y no cambia al renombrar.
"""

import re
import unicodedata
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.errores import Conflicto, NoEncontrado
from app.esquemas.propiedades import PropiedadEntrada
from app.modelos import Propiedad
from app.repositorios import usuarios as repo
from app.servicios.auditoria import auditar


def _foto(p: Propiedad) -> dict:
    return {"id": str(p.id), "clave": p.clave, "nombre": p.nombre, "lugar": p.lugar}


def _clave_de(nombre: str) -> str:
    plano = unicodedata.normalize("NFD", nombre).encode("ascii", "ignore").decode().lower()
    return re.sub(r"[^a-z0-9]+", "-", plano).strip("-")[:32] or "propiedad"


async def _nombre_libre(sesion: AsyncSession, nombre: str, salvo: UUID | None = None) -> None:
    consulta = select(Propiedad.id).where(Propiedad.nombre.ilike(nombre), Propiedad.id != salvo)
    otra = (await sesion.execute(consulta)).first()
    if otra:
        raise Conflicto("Ya hay una propiedad con ese nombre", codigo="duplicado")


async def listar(sesion: AsyncSession) -> list[Propiedad]:
    return await repo.todas_las_propiedades(sesion)


async def crear(sesion: AsyncSession, datos: PropiedadEntrada) -> Propiedad:
    await _nombre_libre(sesion, datos.nombre)
    base = _clave_de(datos.nombre)
    parecidas = select(Propiedad.clave).where(Propiedad.clave.like(f"{base}%"))
    usadas = set((await sesion.execute(parecidas)).scalars())
    clave = next(c for c in (base, *(f"{base}-{n}" for n in range(2, 1000))) if c not in usadas)
    p = Propiedad(clave=clave, nombre=datos.nombre, lugar=datos.lugar)
    sesion.add(p)
    await sesion.flush()
    await auditar(sesion, accion="propiedad.alta", entidad="propiedad", entidad_id=p.id, despues=_foto(p))
    return p


async def editar(sesion: AsyncSession, propiedad_id: UUID, datos: PropiedadEntrada) -> Propiedad:
    p = await sesion.get(Propiedad, propiedad_id)
    if p is None:
        raise NoEncontrado("Esa propiedad no existe")
    await _nombre_libre(sesion, datos.nombre, salvo=p.id)
    antes = _foto(p)
    p.nombre, p.lugar = datos.nombre, datos.lugar
    await sesion.flush()
    await auditar(
        sesion, accion="propiedad.editar", entidad="propiedad", entidad_id=p.id, antes=antes, despues=_foto(p)
    )
    return p
