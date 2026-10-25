"""Reglas del login del panel (PLAN-BACKEND §11, BACKEND-USUARIOS-Y-PERMISOS §4–§5).

Sin FastAPI: devuelve credenciales y datos; la ruta pone las cookies."""

import hashlib
import uuid
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import limites
from app.auth.claves import HASH_DE_RELLENO, hasher, problema_de_clave
from app.auth.dependencias import REVOCADA_TTL_S, Actor, clave_revocada
from app.auth.tokens import auth
from app.conexion_redis import redis
from app.errores import Conflicto, NoAutenticado, NoEncontrado, ReglaDeNegocio, SinPermiso
from app.esquemas.auth import PropiedadSalida, SesionSalida
from app.modelos import Usuario
from app.repositorios import sesiones as repo_sesiones
from app.repositorios import usuarios as repo_usuarios
from app.servicios.auditoria import auditar

DURACION_SESION = timedelta(hours=12)  # decisión del usuario (2026-10-11): absoluta, no se alarga
GRACIA_ROTACION = timedelta(seconds=30)
FALLO = "Usuario o contraseña incorrectos"  # un solo mensaje: nunca "ese usuario no existe"


@dataclass(frozen=True, slots=True)
class Credenciales:
    acceso: str
    renovacion: str
    max_age: int | None  # None = cookie de sesión (se borra al cerrar el navegador)


def ahora() -> datetime:
    return datetime.now(UTC)


def _hash(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


async def _propiedades_de(sesion: AsyncSession, usuario: Usuario) -> tuple[list, bool]:
    permisos = {p.clave for p in usuario.rol.permisos}
    if "propiedades.todas" in permisos:
        return await repo_usuarios.todas_las_propiedades(sesion), True
    return sorted(usuario.propiedades, key=lambda p: p.nombre), False


async def _emitir(sesion: AsyncSession, usuario: Usuario, sid: UUID, vence: datetime, recordar: bool):
    propiedades, todas = await _propiedades_de(sesion, usuario)
    permisos = sorted(p.clave for p in usuario.rol.permisos)
    datos = {
        "sid": str(sid),
        "rol": usuario.rol.clave,
        "permisos": permisos,
        "propiedades": [] if todas else [str(p.id) for p in propiedades],
        "todas": todas,
    }
    acceso = auth.create_access_token(uid=str(usuario.id), data=datos)
    renovacion = auth.create_refresh_token(uid=str(usuario.id), expiry=vence, data={"sid": str(sid)})
    restante = int((vence - ahora()).total_seconds())
    credenciales = Credenciales(acceso, renovacion, max(restante, 0) if recordar else None)
    salida = SesionSalida(
        id=usuario.id,
        usuario=usuario.usuario,
        nombre=usuario.nombre,
        correo=usuario.correo,
        rol=usuario.rol.clave,
        permisos=permisos,
        propiedades=[PropiedadSalida.model_validate(p) for p in propiedades],
        todas_las_propiedades=todas,
        vence=vence,
        debe_cambiar_clave=usuario.debe_cambiar_clave,
    )
    return credenciales, salida


async def entrar(
    sesion: AsyncSession, *, identificador: str, clave: str, recordar: bool, ip: str, agente: str | None
) -> tuple[Credenciales, SesionSalida]:
    try:
        await limites.comprobar(ip, identificador)
    except limites.DemasiadosIntentos as e:
        await auditar(
            sesion,
            accion="sesion.bloqueada",
            entidad="sesion",
            despues={"identificador": identificador[:254]},
        )
        e.confirmar = True  # el bloqueo queda en la auditoría aunque se responda 429
        raise
    usuario = await repo_usuarios.por_identificador(sesion, identificador.strip())
    # Se verifica SIEMPRE (con un hash de relleno si no hay usuario): mismo tiempo de respuesta.
    valida, nuevo_hash = hasher.verify_and_update(
        clave, usuario.hash_clave if usuario and usuario.hash_clave else HASH_DE_RELLENO
    )
    if not (usuario and usuario.hash_clave and valida and usuario.activo):
        await limites.registrar_fallo(ip, identificador)
        # Evento de seguridad: queda aunque la respuesta sea 401. El motivo real
        # solo lo ve la auditoría; a quien intenta entrar siempre se le dice lo mismo.
        motivo = (
            "no_existe" if not usuario else "desactivado" if valida and usuario.activo is False else "clave"
        )
        await auditar(
            sesion,
            usuario_id=usuario.id if usuario else None,
            accion="sesion.fallo",
            entidad="sesion",
            despues={"identificador": identificador[:254], "motivo": motivo},
        )
        raise NoAutenticado(FALLO, codigo="credenciales", confirmar=True)
    if not usuario.rol.es_personal:
        await auditar(sesion, usuario_id=usuario.id, accion="sesion.no_es_personal", entidad="sesion")
        raise SinPermiso("Esta cuenta no tiene acceso al panel.", codigo="no_es_personal", confirmar=True)
    await limites.limpiar_usuario(ip, identificador)
    if nuevo_hash:  # los parámetros de Argon2 subieron: se actualiza el hash sin pedir nada
        usuario.hash_clave = nuevo_hash

    momento = ahora()
    vence = momento + DURACION_SESION
    # El id de la sesión se genera aquí (uuidv7, como los de la base) porque los
    # tokens lo llevan dentro: así la fila se inserta una vez y ya completa.
    sid = uuid.uuid7()
    credenciales, salida = await _emitir(sesion, usuario, sid, vence, recordar)
    await repo_sesiones.crear(
        sesion,
        id=sid,
        usuario_id=usuario.id,
        hash_renovacion=_hash(credenciales.renovacion),
        recordar=recordar,
        ip=ip,
        agente=(agente or "")[:300] or None,
        vence=vence,
    )
    usuario.ultimo_acceso = momento
    await auditar(
        sesion,
        usuario_id=usuario.id,
        sesion_id=sid,
        accion="sesion.iniciar",
        entidad="sesion",
        entidad_id=sid,
        despues={"recordar": recordar, "vence": vence.isoformat()},
    )
    return credenciales, salida


async def renovar(
    sesion: AsyncSession, *, usuario_id: UUID, sid: UUID, token: str
) -> tuple[Credenciales, SesionSalida]:
    s = await repo_sesiones.por_id_bloqueada(sesion, sid)
    momento = ahora()
    if s is None or s.usuario_id != usuario_id or s.revocada:
        raise NoAutenticado("Tu sesión se cerró. Vuelve a entrar.")
    if s.vence <= momento:
        raise NoAutenticado("Tu sesión terminó (dura 12 horas). Vuelve a entrar.", codigo="sesion_vencida")
    recibido = _hash(token)
    if recibido != s.hash_renovacion:
        if s.hash_anterior == recibido and s.rotada_en and momento - s.rotada_en < GRACIA_ROTACION:
            # Otra pestaña renovó hace un instante: sus cookies nuevas ya están en el navegador.
            raise Conflicto("La sesión ya se renovó en otra pestaña.", codigo="ya_renovada")
        # Un token de renovación viejo fuera de la gracia = copiado: se cierra TODA la sesión.
        # confirmar=True: la revocación SE GUARDA aunque se responda 401. Antes el
        # rollback del error la deshacía y la sesión robada seguía viva en la base.
        await revocar_sesiones(sesion, usuario_id, [s.id])
        await auditar(
            sesion,
            usuario_id=usuario_id,
            sesion_id=s.id,
            accion="sesion.reuso_detectado",
            entidad="sesion",
            entidad_id=s.id,
            despues={"revocada": True},
        )
        raise NoAutenticado(
            "Por seguridad cerramos tu sesión. Vuelve a entrar.", codigo="token_reusado", confirmar=True
        )
    usuario = await repo_usuarios.por_id(sesion, usuario_id)
    if usuario is None or not usuario.activo or not usuario.rol.es_personal:
        await revocar_sesiones(sesion, usuario_id, [s.id])
        await auditar(
            sesion,
            usuario_id=usuario_id,
            sesion_id=s.id,
            accion="sesion.revocada_sin_acceso",
            entidad="sesion",
            entidad_id=s.id,
        )
        raise NoAutenticado("Tu cuenta ya no tiene acceso. Habla con la gerencia.", confirmar=True)
    credenciales, salida = await _emitir(sesion, usuario, s.id, s.vence, s.recordar)
    s.hash_anterior, s.hash_renovacion, s.rotada_en, s.usada = (
        s.hash_renovacion,
        _hash(credenciales.renovacion),
        momento,
        momento,
    )
    await auditar(
        sesion,
        usuario_id=usuario_id,
        sesion_id=s.id,
        accion="sesion.renovar",
        entidad="sesion",
        entidad_id=s.id,
    )
    return credenciales, salida


async def yo(sesion: AsyncSession, actor: Actor) -> SesionSalida:
    usuario = await repo_usuarios.por_id(sesion, actor.id)
    s = await repo_sesiones.por_id(sesion, actor.sid)
    if usuario is None or not usuario.activo or s is None or s.revocada or s.vence <= ahora():
        raise NoAutenticado("Tu sesión ya no es válida. Vuelve a entrar.")
    propiedades, todas = await _propiedades_de(sesion, usuario)
    return SesionSalida(
        id=usuario.id,
        usuario=usuario.usuario,
        nombre=usuario.nombre,
        correo=usuario.correo,
        rol=usuario.rol.clave,
        permisos=sorted(p.clave for p in usuario.rol.permisos),
        propiedades=[PropiedadSalida.model_validate(p) for p in propiedades],
        todas_las_propiedades=todas,
        vence=s.vence,
        debe_cambiar_clave=usuario.debe_cambiar_clave,
    )


async def revocar_sesiones(
    sesion: AsyncSession, usuario_id: UUID, sids: list[UUID] | None, *, excepto: UUID | None = None
) -> list[UUID]:
    revocadas = await repo_sesiones.revocar(sesion, usuario_id, sids, excepto=excepto)
    # Además en Redis: el token de acceso de esas sesiones deja de servir YA,
    # no dentro de 15 minutos.
    if revocadas:
        async with redis.pipeline(transaction=False) as p:
            for sid in revocadas:
                p.set(clave_revocada(sid), 1, ex=REVOCADA_TTL_S)
            await p.execute()
    return revocadas


async def salir(sesion: AsyncSession, actor: Actor, *, ip: str) -> None:
    await revocar_sesiones(sesion, actor.id, [actor.sid])
    await auditar(
        sesion, usuario_id=actor.id, accion="sesion.cerrar", entidad="sesion", entidad_id=actor.sid, ip=ip
    )


async def salir_de_todas(sesion: AsyncSession, actor: Actor, *, ip: str) -> int:
    revocadas = await revocar_sesiones(sesion, actor.id, None)
    await auditar(
        sesion,
        usuario_id=actor.id,
        accion="sesion.cerrar_todas",
        entidad="usuario",
        entidad_id=actor.id,
        despues={"sesiones": len(revocadas)},
        ip=ip,
    )
    return len(revocadas)


async def sesiones_abiertas(sesion: AsyncSession, actor: Actor):
    return [(s, s.id == actor.sid) for s in await repo_sesiones.vigentes_de(sesion, actor.id, ahora())]


async def cerrar_sesion(sesion: AsyncSession, actor: Actor, sid: UUID, *, ip: str) -> None:
    # Solo las propias: la de otro usuario responde 404 (no se confirma que existe).
    if not await revocar_sesiones(sesion, actor.id, [sid]):
        raise NoEncontrado("Esa sesión no existe o ya está cerrada")
    await auditar(
        sesion, usuario_id=actor.id, accion="sesion.cerrar", entidad="sesion", entidad_id=sid, ip=ip
    )


async def cambiar_clave(sesion: AsyncSession, actor: Actor, *, actual: str, nueva: str, ip: str) -> None:
    """La persona cambia SU contraseña. Pide la actual (con el mismo límite de
    intentos que el login) y cierra sus OTRAS sesiones: si alguien más la tenía,
    se queda fuera."""
    usuario = await repo_usuarios.por_id(sesion, actor.id)
    if usuario is None or not usuario.activo:
        raise NoAutenticado("Tu sesión ya no es válida. Vuelve a entrar.")
    await limites.comprobar(ip, usuario.usuario)
    if not (usuario.hash_clave and hasher.verify(actual, usuario.hash_clave)):
        await limites.registrar_fallo(ip, usuario.usuario)
        await auditar(sesion, accion="usuario.cambiar_clave_fallo", entidad="usuario", entidad_id=usuario.id)
        raise ReglaDeNegocio("La contraseña actual no es correcta", codigo="clave_actual", confirmar=True)
    if nueva == actual:
        raise ReglaDeNegocio("La nueva debe ser distinta de la actual", codigo="clave_igual")
    if problema := problema_de_clave(nueva, usuario=usuario.usuario, correo=usuario.correo):
        raise ReglaDeNegocio(problema, codigo="clave_debil")
    usuario.hash_clave, usuario.debe_cambiar_clave = hasher.hash(nueva), False
    otras = await revocar_sesiones(sesion, usuario.id, None, excepto=actor.sid)
    # Nunca la contraseña (ni su hash) en la auditoría: solo que cambió.
    await auditar(
        sesion, accion="usuario.cambiar_clave", entidad="usuario", entidad_id=usuario.id,
        despues={"sesiones_cerradas": len(otras)},
    )  # fmt: skip
