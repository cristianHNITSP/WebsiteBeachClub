"""Papelera, restaurar y borrado definitivo: UNA implementación para todo modelo
con `ConBorradoLogico` (PLAN-BACKEND §19). Cada recurso (habitaciones, tarifas,
sitios, personal…) solo dice cómo se llama en la auditoría, cómo se fotografía
y qué mensaje dar si su nombre está ocupado; las reglas viven aquí una vez.

Reglas:
- A la papelera: idempotente.
- Restaurar: solo de la papelera; si su nombre ya lo usa otro, 409.
- Borrado definitivo: solo de la papelera y solo con `papelera.vaciar`. Deja la
  LÁPIDA (ver ConBorradoLogico): lo que la nombra sigue resolviendo y dice
  «eliminada definitivamente». Repetirlo no hace nada.
- Todo queda en la auditoría, en la misma transacción.
"""

import base64
from collections.abc import Callable
from dataclasses import dataclass
from datetime import datetime
from typing import Any
from uuid import UUID

from psycopg.errors import UniqueViolation
from sqlalchemy import ColumnElement
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencias import Actor
from app.errores import Conflicto, ReglaDeNegocio, SinPermiso
from app.modelos.base import ConBorradoLogico
from app.repositorios import papelera as repo
from app.servicios.auditoria import auditar
from app.servicios.auth import ahora


@dataclass(frozen=True, slots=True)
class Recurso:
    entidad: str  # «habitacion»: así aparece en la auditoría («habitacion.eliminar»)
    foto: Callable[[Any], dict]  # su estado completo, para la auditoría
    nombre_ocupado: str  # mensaje si al restaurar su nombre ya lo usa otro


async def _auditar(sesion, actor, obj, recurso: Recurso, accion: str, ip: str, **cambios) -> None:
    await auditar(
        sesion, usuario_id=actor.id, accion=f"{recurso.entidad}.{accion}", entidad=recurso.entidad,
        entidad_id=obj.id, ip=ip, **cambios,
    )  # fmt: skip


async def a_papelera(
    sesion: AsyncSession,
    actor: Actor,
    obj: ConBorradoLogico,
    recurso: Recurso,
    *,
    motivo: str | None,
    ip: str,
) -> None:
    if obj.eliminado_en is not None:
        return
    antes = recurso.foto(obj)
    obj.eliminado_en, obj.eliminado_por, obj.motivo_eliminacion = ahora(), actor.id, motivo
    await sesion.flush()
    await _auditar(sesion, actor, obj, recurso, "eliminar", ip, antes=antes, despues={"motivo": motivo})


async def restaurar(
    sesion: AsyncSession, actor: Actor, obj: ConBorradoLogico, recurso: Recurso, *, ip: str
) -> None:
    if obj.purgado_en is not None:
        raise Conflicto("Se eliminó definitivamente: ya no se puede restaurar", codigo="eliminado_definitivo")
    if obj.eliminado_en is None:
        return
    try:
        # El cambio DENTRO del savepoint: begin_nested() vacía lo pendiente antes
        # de abrirlo, y un choque fuera de él tumbaría toda la transacción.
        async with sesion.begin_nested():
            obj.eliminado_en = obj.eliminado_por = obj.motivo_eliminacion = None
            await sesion.flush()
    except IntegrityError as e:
        if isinstance(e.orig, UniqueViolation):
            raise Conflicto(recurso.nombre_ocupado, codigo="nombre_repetido") from e
        raise
    await sesion.refresh(obj)
    await _auditar(sesion, actor, obj, recurso, "restaurar", ip, despues=recurso.foto(obj))


async def borrar_definitivo(
    sesion: AsyncSession, actor: Actor, obj: ConBorradoLogico, recurso: Recurso, *, ip: str
) -> None:
    if not actor.puede("papelera.vaciar"):
        raise SinPermiso("Solo un gerente puede eliminar definitivamente")
    if obj.purgado_en is not None:
        return
    if obj.eliminado_en is None:
        raise ReglaDeNegocio("Primero mándalo a la papelera", codigo="no_en_papelera")
    antes = recurso.foto(obj)
    obj.purgado_en, obj.purgado_por = ahora(), actor.id
    obj.vaciar_contenido()
    await sesion.flush()
    await _auditar(sesion, actor, obj, recurso, "borrar_definitivo", ip, antes=antes)


# ── Listado, paginado por cursor ──


def _cursor(obj) -> str:
    return base64.urlsafe_b64encode(f"{obj.eliminado_en.isoformat()}|{obj.id}".encode()).decode()


def _leer_cursor(cursor: str) -> tuple[datetime, UUID]:
    try:
        momento, ident = base64.urlsafe_b64decode(cursor.encode()).decode().split("|")
        return datetime.fromisoformat(momento), UUID(ident)
    except ValueError as e:
        raise ReglaDeNegocio("El cursor no es válido", codigo="cursor") from e


async def listar(
    sesion: AsyncSession, modelo, filtro: ColumnElement[bool], *, cursor: str | None, limite: int
) -> tuple[list, str | None]:
    filas = await repo.en_papelera(
        sesion, modelo, filtro, despues_de=_leer_cursor(cursor) if cursor else None, limite=limite + 1
    )
    hay_mas = len(filas) > limite
    filas = filas[:limite]
    return filas, (_cursor(filas[-1]) if hay_mas else None)
