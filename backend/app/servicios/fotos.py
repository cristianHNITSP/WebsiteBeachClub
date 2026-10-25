"""Fotos de las habitaciones (PLAN-BACKEND §18). Sin FastAPI."""

from uuid import UUID

from psycopg.errors import UniqueViolation
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.concurrency import run_in_threadpool

from app import imagenes
from app.auth.alcance import Alcance
from app.auth.dependencias import Actor
from app.config import obtener_config
from app.errores import Conflicto, NoEncontrado, ReglaDeNegocio, SinPermiso
from app.modelos import Foto
from app.repositorios import fotos as repo
from app.repositorios import habitaciones as repo_habitaciones
from app.servicios import papelera
from app.servicios.auditoria import auditar

MAX_POR_HABITACION = 30


def a_salida(f: Foto) -> dict:
    return {
        "id": f.id,
        "orden": f.orden,
        "ancho": f.ancho,
        "alto": f.alto,
        "urls": {str(a): imagenes.url(f.propiedad_id, f.habitacion_id, f.id, a) for a in imagenes.ANCHOS},
        "creada": f.creada,
    }


def _foto(f: Foto) -> dict:
    return {
        "id": str(f.id),
        "habitacion_id": str(f.habitacion_id),
        "orden": f.orden,
        "ancho": f.ancho,
        "alto": f.alto,
        "formato_original": f.formato_original,
        "bytes_original": f.bytes_original,
        "huella_sha256": f.huella_sha256,
    }


RECURSO = papelera.Recurso(entidad="foto", foto=_foto, nombre_ocupado="Esa foto ya está en la habitación")


async def _habitacion(sesion, alcance, habitacion_id):
    h = await repo_habitaciones.por_id(sesion, alcance, habitacion_id)
    if h is None:
        raise NoEncontrado("Esa habitación no existe")
    return h


async def listar(sesion: AsyncSession, alcance: Alcance, habitacion_id: UUID) -> list[Foto]:
    await _habitacion(sesion, alcance, habitacion_id)
    return await repo.de_habitacion(sesion, alcance, habitacion_id)


async def subir(
    sesion: AsyncSession, actor: Actor, alcance: Alcance, habitacion_id: UUID, datos: bytes
) -> Foto:
    h = await _habitacion(sesion, alcance, habitacion_id)
    cuantas, orden = await repo.siguiente_orden(sesion, h.id)
    if cuantas >= MAX_POR_HABITACION:
        raise ReglaDeNegocio(f"Máximo {MAX_POR_HABITACION} fotos por habitación", codigo="demasiadas_fotos")
    try:
        # Decodificar y codificar es trabajo de CPU: en un hilo, sin frenar a las
        # demás peticiones. ponytail: en la petición (~1 s por foto); si pesa, a Celery.
        lista = await run_in_threadpool(imagenes.procesar, datos)
    except imagenes.ImagenInvalida as e:
        raise ReglaDeNegocio(str(e), codigo="imagen_invalida") from e
    f = Foto(
        habitacion_id=h.id,
        propiedad_id=h.propiedad_id,
        orden=orden,
        ancho=lista.ancho,
        alto=lista.alto,
        formato_original=lista.formato,
        bytes_original=lista.bytes_original,
        huella_sha256=lista.huella_sha256,
        subida_por=actor.id,
    )
    try:
        async with sesion.begin_nested():
            sesion.add(f)
            await sesion.flush()
    except IntegrityError as e:
        if isinstance(e.orig, UniqueViolation):
            raise Conflicto("Esa foto ya está en la habitación", codigo="foto_repetida") from e
        raise
    await sesion.refresh(f)
    # La fila primero (dentro de la transacción) y luego los archivos: si escribir
    # falla, la excepción deshace la fila. Al revés quedarían archivos huérfanos.
    await run_in_threadpool(
        imagenes.guardar, obtener_config().fotos_dir, h.propiedad_id, h.id, f.id, lista.variantes
    )
    await auditar(sesion, accion="foto.subir", entidad="foto", entidad_id=f.id, despues=_foto(f))
    return f


async def ordenar(sesion: AsyncSession, actor: Actor, alcance: Alcance, habitacion_id: UUID, ids: list[UUID]):
    fotos = await listar(sesion, alcance, habitacion_id)
    if sorted(ids) != sorted(f.id for f in fotos):
        raise ReglaDeNegocio("La lista debe tener cada foto de la habitación una vez", codigo="orden")
    antes = [str(f.id) for f in fotos]
    posicion = {fid: i for i, fid in enumerate(ids)}
    for f in fotos:
        f.orden = posicion[f.id]
    await sesion.flush()
    await auditar(
        sesion,
        accion="foto.ordenar",
        entidad="habitacion",
        entidad_id=habitacion_id,
        antes={"orden": antes},
        despues={"orden": [str(i) for i in ids]},
    )
    return sorted(fotos, key=lambda f: f.orden)


async def _cargar(sesion, alcance, habitacion_id, foto_id) -> Foto:
    f = await repo.por_id(sesion, alcance, habitacion_id, foto_id, incluir_eliminadas=True)
    if f is None:
        raise NoEncontrado("Esa foto no existe")
    return f


async def eliminar(sesion, actor, alcance, habitacion_id: UUID, foto_id: UUID) -> None:
    await papelera.a_papelera(
        sesion, actor, await _cargar(sesion, alcance, habitacion_id, foto_id), RECURSO, motivo=None, ip=None
    )


async def restaurar(sesion, actor, alcance, habitacion_id: UUID, foto_id: UUID) -> Foto:
    f = await _cargar(sesion, alcance, habitacion_id, foto_id)
    await papelera.restaurar(sesion, actor, f, RECURSO, ip=None)
    return f


async def borrar_definitivo(sesion, actor, alcance, habitacion_id: UUID, foto_id: UUID) -> None:
    if not actor.puede("papelera.vaciar"):
        raise SinPermiso("Solo un gerente puede eliminar definitivamente")
    await papelera.borrar_definitivo(
        sesion, actor, await _cargar(sesion, alcance, habitacion_id, foto_id), RECURSO, ip=None
    )
