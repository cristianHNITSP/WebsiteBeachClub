"""Tarifas de temporada (aprobadas 2026-10-11). Sin FastAPI."""

from datetime import date, timedelta
from uuid import UUID

from psycopg.errors import ExclusionViolation
from sqlalchemy.dialects.postgresql import Range
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencias import Actor
from app.errores import Conflicto, NoEncontrado, SinPermiso
from app.esquemas.tarifas import TarifaEntrada
from app.modelos import Habitacion, Tarifa
from app.repositorios import habitaciones as repo_habitaciones
from app.repositorios import tarifas as repo
from app.servicios import papelera
from app.servicios.auditoria import auditar


def precios_por_noche(base: int, temporadas: list[Tarifa], llegada: date, salida: date) -> list[int]:
    """El precio de cada noche de [llegada, salida): la temporada que la cubre o
    la tarifa base. Las temporadas no se cruzan (lo garantiza la base)."""
    precios = []
    noche = llegada
    while noche < salida:
        t = next((t for t in temporadas if t.periodo.lower <= noche < t.periodo.upper), None)
        precios.append(t.tarifa_centavos if t else base)
        noche += timedelta(days=1)
    return precios


async def total_de(sesion: AsyncSession, h: Habitacion, llegada: date, salida: date) -> int:
    return sum(
        precios_por_noche(
            h.tarifa_centavos, await repo.que_tocan(sesion, h.id, llegada, salida), llegada, salida
        )
    )


def a_salida(t: Tarifa) -> dict:
    return {
        "id": t.id,
        "habitacion_id": t.habitacion_id,
        "nombre": t.nombre,
        "desde": t.periodo.lower,
        "hasta": t.periodo.upper,
        "tarifa_centavos": t.tarifa_centavos,
    }


def _foto(t: Tarifa) -> dict:
    return {k: str(v) if not isinstance(v, int | str) else v for k, v in a_salida(t).items()}


RECURSO = papelera.Recurso(
    entidad="tarifa", foto=_foto, nombre_ocupado="Esa temporada se cruza con otra vigente"
)


async def _habitacion(sesion, alcance, habitacion_id) -> Habitacion:
    h = await repo_habitaciones.por_id(sesion, alcance, habitacion_id)
    if h is None:
        raise NoEncontrado("Esa habitación no existe")
    return h


async def _guardar(sesion: AsyncSession, t: Tarifa, datos: TarifaEntrada) -> None:
    try:
        async with sesion.begin_nested():  # cambios dentro del savepoint (BACKEND-ARQUITECTURA §6)
            t.nombre, t.periodo, t.tarifa_centavos = (
                datos.nombre,
                Range(datos.desde, datos.hasta),
                datos.tarifa_centavos,
            )
            sesion.add(t)
            await sesion.flush()
    except IntegrityError as e:
        if isinstance(e.orig, ExclusionViolation):
            raise Conflicto(
                "Esas fechas se cruzan con otra temporada de la habitación", codigo="temporada_cruzada"
            ) from e
        raise


async def listar(sesion, alcance, habitacion_id: UUID) -> list[Tarifa]:
    await _habitacion(sesion, alcance, habitacion_id)
    return await repo.de_habitacion(sesion, alcance, habitacion_id)


async def crear(sesion, actor: Actor, alcance, habitacion_id: UUID, datos: TarifaEntrada) -> Tarifa:
    h = await _habitacion(sesion, alcance, habitacion_id)
    t = Tarifa(habitacion_id=h.id, propiedad_id=h.propiedad_id)
    await _guardar(sesion, t, datos)
    await sesion.refresh(t)
    await auditar(sesion, accion="tarifa.crear", entidad="tarifa", entidad_id=t.id, despues=_foto(t))
    return t


async def _cargar(sesion, alcance, habitacion_id, tarifa_id) -> Tarifa:
    t = await repo.por_id(sesion, alcance, habitacion_id, tarifa_id)
    if t is None:
        raise NoEncontrado("Esa temporada no existe")
    return t


async def editar(
    sesion, actor, alcance, habitacion_id: UUID, tarifa_id: UUID, datos: TarifaEntrada
) -> Tarifa:
    t = await _cargar(sesion, alcance, habitacion_id, tarifa_id)
    if t.eliminado_en is not None:
        raise NoEncontrado("Esa temporada no existe")
    antes = _foto(t)
    await _guardar(sesion, t, datos)
    await sesion.refresh(t)
    await auditar(
        sesion, accion="tarifa.editar", entidad="tarifa", entidad_id=t.id, antes=antes, despues=_foto(t)
    )
    return t


async def eliminar(sesion, actor, alcance, habitacion_id: UUID, tarifa_id: UUID) -> None:
    await papelera.a_papelera(
        sesion, actor, await _cargar(sesion, alcance, habitacion_id, tarifa_id), RECURSO, motivo=None, ip=None
    )


async def restaurar(sesion, actor, alcance, habitacion_id: UUID, tarifa_id: UUID) -> Tarifa:
    t = await _cargar(sesion, alcance, habitacion_id, tarifa_id)
    await papelera.restaurar(sesion, actor, t, RECURSO, ip=None)
    return t


async def borrar_definitivo(sesion, actor, alcance, habitacion_id: UUID, tarifa_id: UUID) -> None:
    if not actor.puede("papelera.vaciar"):
        raise SinPermiso("Solo un gerente puede eliminar definitivamente")
    await papelera.borrar_definitivo(
        sesion, actor, await _cargar(sesion, alcance, habitacion_id, tarifa_id), RECURSO, ip=None
    )
