"""Reglas de las habitaciones y su papelera (PLAN-BACKEND §11.1, §19). Sin FastAPI.

Toda acción comprueba, en este orden: permiso (lo hizo la ruta), propiedad
(alcance), estado y versión; y todo cambio queda en la auditoría en la misma
transacción (PLAN-BACKEND §17.3)."""

from uuid import UUID

from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm.exc import StaleDataError

from app import imagenes
from app.auth.alcance import Alcance
from app.auth.dependencias import Actor
from app.errores import Conflicto, NoEncontrado, SinPermiso
from app.esquemas.habitaciones import HabitacionCambios, HabitacionNueva, HabitacionSalida
from app.modelos import Habitacion
from app.repositorios import fotos as repo_fotos
from app.repositorios import habitaciones as repo
from app.servicios import papelera
from app.servicios.auditoria import auditar

NOMBRE_REPETIDO = "Ya hay una habitación con ese nombre en esa propiedad"
OTRO_LA_CAMBIO = "Alguien más cambió esta habitación mientras la editabas. Recarga para ver lo nuevo."


def _foto(h: Habitacion) -> dict:
    """Estado completo para la auditoría (antes / después)."""
    return HabitacionSalida.model_validate(h).model_dump(mode="json")


RECURSO = papelera.Recurso(
    entidad="habitacion",
    foto=_foto,
    nombre_ocupado=(
        "No se puede restaurar: ya hay otra habitación con ese nombre. Cámbiale el nombre a la otra primero."
    ),
)


async def _obtener(sesion: AsyncSession, alcance: Alcance, habitacion_id: UUID, **kw) -> Habitacion:
    h = await repo.por_id(sesion, alcance, habitacion_id, **kw)
    if h is None:
        raise NoEncontrado("Esa habitación no existe")  # o es de otra propiedad: no se confirma
    return h


async def con_portada(sesion: AsyncSession, habitaciones: list[Habitacion]) -> list[Habitacion]:
    """Pone en cada habitación la URL de su portada (o None): `foto` de la salida."""
    portadas = await repo_fotos.portadas(sesion, [h.id for h in habitaciones])
    for h in habitaciones:
        f = portadas.get(h.id)
        h.foto = (
            imagenes.url(f.propiedad_id, f.habitacion_id, f.id, 1080) if f else None
        )  # atributo de salida
    return habitaciones


async def listar(sesion, alcance, **filtros):
    items, total = await repo.listar(sesion, alcance, **filtros)
    return await con_portada(sesion, items), total


async def obtener(sesion: AsyncSession, alcance: Alcance, habitacion_id: UUID) -> Habitacion:
    """También la que está en la papelera o eliminada definitivamente: lo que la
    nombra (reservas, historial) la enlaza y debe poder decir qué fue. Su
    `situacion` lo dice; editarla sigue sin poderse (404)."""
    h = await _obtener(sesion, alcance, habitacion_id, incluir_eliminadas=True)
    return (await con_portada(sesion, [h]))[0]


async def crear(
    sesion: AsyncSession, actor: Actor, alcance: Alcance, datos: HabitacionNueva, *, ip: str
) -> Habitacion:
    if not alcance.permite(datos.propiedad_id):
        raise NoEncontrado("Esa propiedad no existe")
    h = Habitacion(**datos.model_dump())
    try:
        async with sesion.begin_nested():  # SAVEPOINT: el choque no tumba la transacción
            sesion.add(h)
            await sesion.flush()
    except IntegrityError as e:
        _traducir(e)
        raise
    await sesion.refresh(h)
    await auditar(
        sesion, usuario_id=actor.id, accion="habitacion.crear", entidad="habitacion", entidad_id=h.id,
        despues=_foto(h), ip=ip,
    )  # fmt: skip
    return h


async def editar(
    sesion: AsyncSession,
    actor: Actor,
    alcance: Alcance,
    habitacion_id: UUID,
    datos: HabitacionCambios,
    *,
    ip: str,
) -> Habitacion:
    h = await _obtener(sesion, alcance, habitacion_id)
    if h.version != datos.version:
        raise Conflicto(OTRO_LA_CAMBIO, codigo="version")
    antes = _foto(h)
    try:
        # Los cambios DENTRO del savepoint: begin_nested() vacía lo pendiente
        # antes de abrirlo, y un choque ahí tumbaría toda la transacción.
        async with sesion.begin_nested():
            for campo, valor in datos.model_dump(exclude={"version"}).items():
                setattr(h, campo, valor)
            # UPDATE … WHERE version = <la vista>: si otro guardó entre la
            # lectura y aquí, no actualiza nada y SQLAlchemy lo detecta.
            await sesion.flush()
    except StaleDataError as e:
        raise Conflicto(OTRO_LA_CAMBIO, codigo="version") from e
    except IntegrityError as e:
        _traducir(e)
        raise
    await sesion.refresh(h)
    await auditar(
        sesion, usuario_id=actor.id, accion="habitacion.editar", entidad="habitacion", entidad_id=h.id,
        antes=antes, despues=_foto(h), ip=ip,
    )  # fmt: skip
    return h


async def eliminar(
    sesion: AsyncSession, actor: Actor, alcance: Alcance, habitacion_id: UUID, *, motivo: str | None, ip: str
) -> None:
    h = await _obtener(sesion, alcance, habitacion_id, incluir_eliminadas=True)
    await papelera.a_papelera(sesion, actor, h, RECURSO, motivo=motivo, ip=ip)


async def borrar_definitivo(
    sesion: AsyncSession, actor: Actor, alcance: Alcance, habitacion_id: UUID, *, ip: str
) -> None:
    if not actor.puede("papelera.vaciar"):  # permiso primero (PLAN-BACKEND §17.3)
        raise SinPermiso("Solo un gerente puede eliminar definitivamente")
    h = await _obtener(sesion, alcance, habitacion_id, incluir_eliminadas=True)
    await papelera.borrar_definitivo(sesion, actor, h, RECURSO, ip=ip)


async def restaurar(
    sesion: AsyncSession, actor: Actor, alcance: Alcance, habitacion_id: UUID, *, ip: str
) -> Habitacion:
    h = await _obtener(sesion, alcance, habitacion_id, incluir_eliminadas=True)
    await papelera.restaurar(sesion, actor, h, RECURSO, ip=ip)
    return h


async def en_papelera(sesion: AsyncSession, alcance: Alcance, *, cursor: str | None, limite: int):
    return await papelera.listar(
        sesion, Habitacion, alcance.filtro(Habitacion.propiedad_id), cursor=cursor, limite=limite
    )


def _traducir(e: IntegrityError) -> None:
    """Las violaciones conocidas pasan a error de dominio; cualquier otra sigue
    su camino (500 en la respuesta, completa en el log)."""
    texto = str(e.orig)
    if "uq_habitaciones_propiedad_nombre" in texto:
        raise Conflicto(NOMBRE_REPETIDO, codigo="nombre_repetido") from e
    if "fk_habitaciones_propiedad_id_propiedades" in texto:
        raise NoEncontrado("Esa propiedad no existe") from e
