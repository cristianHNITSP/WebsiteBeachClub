"""Gestión del personal desde el panel (fase 3e; BACKEND-USUARIOS-Y-PERMISOS §1–§4).

- Alta con contraseña TEMPORAL: la persona la cambia al entrar.
- Baja = desactivar, nunca borrar: su historial y su auditoría siguen apuntando
  a alguien. Desactivar cierra todas sus sesiones al instante.
- Cambiar rol o propiedades cierra sus sesiones: los permisos nuevos rigen ya,
  no cuando venza su token (15 min).
- Nadie se desactiva ni se cambia el rol a sí mismo, y siempre queda al menos
  una persona activa que pueda gestionar al personal.
"""

from uuid import UUID

from psycopg.errors import UniqueViolation
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.claves import hasher, problema_de_clave
from app.auth.dependencias import Actor
from app.errores import Conflicto, NoEncontrado, ReglaDeNegocio
from app.esquemas.personal import PersonaCambios, PersonaNueva
from app.modelos import Rol, Usuario
from app.repositorios import usuarios as repo
from app.servicios.auditoria import auditar
from app.servicios.auth import revocar_sesiones

GESTIONA = "usuarios.gestionar"


def a_salida(u: Usuario) -> dict:
    permisos = {p.clave for p in u.rol.permisos}
    return {
        "id": u.id,
        "usuario": u.usuario,
        "nombre": u.nombre,
        "correo": u.correo,
        "rol": u.rol.clave,
        "rol_nombre": u.rol.nombre,
        "activo": u.activo,
        "propiedades": sorted((p.id for p in u.propiedades), key=str),
        "todas_las_propiedades": "propiedades.todas" in permisos,
        "debe_cambiar_clave": u.debe_cambiar_clave,
        "ultimo_acceso": u.ultimo_acceso,
        "creado": u.creado,
    }


def _foto(u: Usuario) -> dict:
    """Para la auditoría: sin contraseña ni hash, nunca."""
    s = a_salida(u)
    return {
        **s,
        "id": str(s["id"]),
        "propiedades": [str(p) for p in s["propiedades"]],
        "ultimo_acceso": str(s["ultimo_acceso"]) if s["ultimo_acceso"] else None,
        "creado": str(s["creado"]),
    }


async def _cargar(sesion: AsyncSession, usuario_id: UUID) -> Usuario:
    u = await repo.por_id(sesion, usuario_id)
    if u is None or not u.rol.es_personal:
        raise NoEncontrado("Esa persona no existe")
    return u


async def _rol(sesion: AsyncSession, clave: str) -> Rol:
    rol = await repo.rol_por_clave(sesion, clave)
    if rol is None or not rol.es_personal:
        raise ReglaDeNegocio("Ese rol no existe", codigo="rol")
    return rol


async def _propiedades(sesion: AsyncSession, actor: Actor, ids: list[UUID]):
    if not actor.todas_las_propiedades and not set(ids) <= actor.propiedades:
        raise NoEncontrado("Esa propiedad no existe")  # no se da acceso a lo que uno no tiene
    props = await repo.propiedades_por_ids(sesion, ids)
    if len(props) != len(ids):
        raise NoEncontrado("Esa propiedad no existe")
    return props


def _clave(clave: str, usuario: str, correo: str) -> str:
    if problema := problema_de_clave(clave, usuario=usuario, correo=correo):
        raise ReglaDeNegocio(problema, codigo="clave_debil")
    return hasher.hash(clave)


async def _seguira_habiendo_gestor(sesion: AsyncSession, u: Usuario) -> None:
    """Antes de quitarle a `u` la gestión (desactivar o cambiar de rol). Con un
    candado: dos gerentes que se dan de baja uno al otro a la vez no pueden dejar
    el sistema sin nadie (el segundo espera y ve que ya solo queda uno)."""
    await sesion.execute(select(func.pg_advisory_xact_lock(func.hashtext("frida.gestores"))))
    if (
        any(p.clave == GESTIONA for p in u.rol.permisos)
        and u.activo
        and await repo.gerentes_activos(sesion) <= 1
    ):
        raise ReglaDeNegocio(
            "Es la única persona activa que puede gestionar al personal. Da de alta a otra antes.",
            codigo="ultimo_gestor",
        )


async def listar(sesion, **filtros):
    return await repo.listar(sesion, **filtros)


async def obtener(sesion, usuario_id: UUID) -> Usuario:
    return await _cargar(sesion, usuario_id)


async def roles(sesion):
    return await repo.roles_del_personal(sesion)


async def crear(sesion: AsyncSession, actor: Actor, datos: PersonaNueva) -> Usuario:
    rol = await _rol(sesion, datos.rol)
    props = await _propiedades(sesion, actor, datos.propiedades)
    correo = str(datos.correo).lower()
    u = Usuario(
        usuario=datos.usuario,
        correo=correo,
        nombre=datos.nombre,
        rol_id=rol.id,
        hash_clave=_clave(datos.clave_temporal, datos.usuario, correo),
        debe_cambiar_clave=True,
    )
    u.propiedades = props
    try:
        async with sesion.begin_nested():
            sesion.add(u)
            await sesion.flush()
    except IntegrityError as e:
        if isinstance(e.orig, UniqueViolation):
            raise Conflicto("Ya hay alguien con ese usuario o correo", codigo="duplicado") from e
        raise
    u = await _cargar(sesion, u.id)
    await auditar(sesion, accion="usuario.alta", entidad="usuario", entidad_id=u.id, despues=_foto(u))
    return u


async def editar(sesion: AsyncSession, actor: Actor, usuario_id: UUID, datos: PersonaCambios) -> Usuario:
    u = await _cargar(sesion, usuario_id)
    antes = _foto(u)
    rol = await _rol(sesion, datos.rol)
    props = await _propiedades(sesion, actor, datos.propiedades)
    cambia_acceso = rol.id != u.rol_id or {p.id for p in props} != {p.id for p in u.propiedades}
    if rol.id != u.rol_id:
        if u.id == actor.id:
            raise ReglaDeNegocio("No puedes cambiar tu propio rol", codigo="propio")
        if not any(p.clave == GESTIONA for p in rol.permisos):
            await _seguira_habiendo_gestor(sesion, u)
    try:
        async with sesion.begin_nested():
            u.nombre, u.correo, u.rol_id = datos.nombre, str(datos.correo).lower(), rol.id
            u.propiedades = props
            await sesion.flush()
    except IntegrityError as e:
        if isinstance(e.orig, UniqueViolation):
            raise Conflicto("Ya hay alguien con ese correo", codigo="duplicado") from e
        raise
    cerradas = await revocar_sesiones(sesion, u.id, None) if cambia_acceso and u.id != actor.id else []
    # Se relee con su rol nuevo (la relación vieja quedó en memoria). El id
    # antes de expirar: después, leerlo dispararía una consulta fuera de lugar.
    uid = u.id
    sesion.expire(u)
    u = await _cargar(sesion, uid)
    await auditar(
        sesion,
        accion="usuario.editar",
        entidad="usuario",
        entidad_id=u.id,
        antes=antes,
        despues={**_foto(u), "sesiones_cerradas": len(cerradas)},
    )
    return u


async def desactivar(sesion: AsyncSession, actor: Actor, usuario_id: UUID) -> Usuario:
    u = await _cargar(sesion, usuario_id)
    if u.id == actor.id:
        raise ReglaDeNegocio("No puedes darte de baja a ti mismo", codigo="propio")
    if not u.activo:
        return u
    await _seguira_habiendo_gestor(sesion, u)
    u.activo = False
    cerradas = await revocar_sesiones(sesion, u.id, None)  # fuera YA, en todos sus dispositivos
    await sesion.flush()
    await auditar(
        sesion,
        accion="usuario.baja",
        entidad="usuario",
        entidad_id=u.id,
        despues={"sesiones_cerradas": len(cerradas)},
    )
    return u


async def reactivar(sesion: AsyncSession, actor: Actor, usuario_id: UUID) -> Usuario:
    u = await _cargar(sesion, usuario_id)
    if not u.activo:
        u.activo = True
        await sesion.flush()
        await auditar(sesion, accion="usuario.reactivar", entidad="usuario", entidad_id=u.id)
    return u


async def restablecer_clave(sesion: AsyncSession, actor: Actor, usuario_id: UUID, clave: str) -> Usuario:
    """El gerente pone una temporal (la persona la olvidó). Cierra sus sesiones."""
    u = await _cargar(sesion, usuario_id)
    if u.id == actor.id:
        raise ReglaDeNegocio("Para tu propia contraseña usa Configuración, Seguridad", codigo="propio")
    u.hash_clave, u.debe_cambiar_clave = _clave(clave, u.usuario, u.correo), True
    cerradas = await revocar_sesiones(sesion, u.id, None)
    await sesion.flush()
    await auditar(
        sesion,
        accion="usuario.restablecer_clave",
        entidad="usuario",
        entidad_id=u.id,
        despues={"sesiones_cerradas": len(cerradas)},
    )
    return u
