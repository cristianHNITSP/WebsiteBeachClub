"""Sitios web en el panel (PLAN-BACKEND §4.2), permiso `sitios.gestionar`. Sin FastAPI.

Las claves secretas y el secreto de webhooks se muestran UNA vez (al crear o
rotar) y nunca entran a la auditoría: ahí queda quién, cuándo y la pista.
"""

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.auth.dependencias import Actor
from app.auth.sitio import huella, nuevas_claves
from app.errores import NoEncontrado, ReglaDeNegocio
from app.esquemas.sitios import SitioEntrada
from app.modelos import EntregaWebhook, Propiedad, Sitio
from app.servicios.auditoria import auditar
from app.servicios.auth import ahora
from app.servicios.webhooks import secreto


def a_salida(s: Sitio, **secretos) -> dict:
    return {
        "id": s.id,
        "nombre": s.nombre,
        "clave_publica": s.clave_publica,
        "clave_secreta_pista": s.clave_secreta_pista,
        "origenes": s.origenes,
        "webhook_url": s.webhook_url,
        "propiedades": sorted(p.id for p in s.propiedades),
        "revocado_en": s.revocado_en,
        "creado": s.creado,
        **secretos,
    }


def _foto(s: Sitio) -> dict:
    """Para la auditoría: nunca secretos."""
    d = a_salida(s)
    return {
        **{k: d[k] for k in ("nombre", "clave_publica", "clave_secreta_pista", "origenes", "webhook_url")},
        "propiedades": [str(p) for p in d["propiedades"]],
        "revocado_en": str(s.revocado_en) if s.revocado_en else None,
    }


async def _cargar(sesion: AsyncSession, sitio_id: UUID, *, bloquear: bool = False) -> Sitio:
    consulta = select(Sitio).options(selectinload(Sitio.propiedades)).where(Sitio.id == sitio_id)
    if bloquear:
        consulta = consulta.with_for_update(of=Sitio)
    s = await sesion.scalar(consulta.execution_options(populate_existing=True))
    if s is None:
        raise NoEncontrado("Ese sitio no existe")
    return s


async def _propiedades(sesion: AsyncSession, ids: list[UUID]) -> list[Propiedad]:
    filas = list(await sesion.scalars(select(Propiedad).where(Propiedad.id.in_(ids))))
    if len(filas) != len(ids):
        raise ReglaDeNegocio("Alguna de esas propiedades no existe", codigo="propiedad")
    return filas


async def listar(sesion: AsyncSession) -> list[Sitio]:
    consulta = select(Sitio).options(selectinload(Sitio.propiedades)).order_by(Sitio.creado, Sitio.id)
    return list(await sesion.scalars(consulta))


def _aplicar(s: Sitio, datos: SitioEntrada, propiedades: list[Propiedad]) -> None:
    s.nombre, s.origenes, s.webhook_url = datos.nombre, datos.origenes, datos.webhook_url
    s.propiedades = propiedades


async def crear(sesion: AsyncSession, actor: Actor, datos: SitioEntrada) -> dict:
    publica, secreta = nuevas_claves()
    s = Sitio(clave_publica=publica, clave_secreta_hash=huella(secreta), clave_secreta_pista=secreta[-4:])
    s.creado_por = actor.id
    _aplicar(s, datos, await _propiedades(sesion, datos.propiedades))
    sesion.add(s)
    await sesion.flush()
    s = await _cargar(sesion, s.id)
    await auditar(sesion, accion="sitio.crear", entidad="sitio", entidad_id=s.id, despues=_foto(s))
    return a_salida(s, clave_secreta=secreta, secreto_webhooks=secreto(s.id, s.webhook_version))


async def editar(sesion: AsyncSession, actor: Actor, sitio_id: UUID, datos: SitioEntrada) -> dict:
    s = await _cargar(sesion, sitio_id, bloquear=True)
    antes = _foto(s)
    _aplicar(s, datos, await _propiedades(sesion, datos.propiedades))
    await sesion.flush()
    await auditar(
        sesion, accion="sitio.editar", entidad="sitio", entidad_id=s.id, antes=antes, despues=_foto(s)
    )
    return a_salida(s)


async def rotar_claves(sesion: AsyncSession, actor: Actor, sitio_id: UUID) -> dict:
    """Claves nuevas; las viejas dejan de servir YA (el sitio debe cambiarlas)."""
    s = await _cargar(sesion, sitio_id, bloquear=True)
    _vigente(s)
    antes = _foto(s)
    publica, secreta = nuevas_claves()
    s.clave_publica, s.clave_secreta_hash, s.clave_secreta_pista = publica, huella(secreta), secreta[-4:]
    await sesion.flush()
    await auditar(
        sesion, accion="sitio.rotar_claves", entidad="sitio", entidad_id=s.id, antes=antes, despues=_foto(s)
    )
    return a_salida(s, clave_secreta=secreta)


async def rotar_webhook(sesion: AsyncSession, actor: Actor, sitio_id: UUID) -> dict:
    s = await _cargar(sesion, sitio_id, bloquear=True)
    _vigente(s)
    s.webhook_version += 1
    await sesion.flush()
    await auditar(
        sesion,
        accion="sitio.rotar_webhook",
        entidad="sitio",
        entidad_id=s.id,
        despues={"webhook_version": s.webhook_version},
    )
    return a_salida(s, secreto_webhooks=secreto(s.id, s.webhook_version))


async def revocar(sesion: AsyncSession, actor: Actor, sitio_id: UUID) -> dict:
    """Sus claves dejan de servir y no recibe más avisos. No se deshace: si el
    sitio vuelve, se da de alta otro (con claves nuevas)."""
    s = await _cargar(sesion, sitio_id, bloquear=True)
    _vigente(s)
    antes = _foto(s)
    s.revocado_en, s.revocado_por = ahora(), actor.id
    await sesion.flush()
    await auditar(
        sesion, accion="sitio.revocar", entidad="sitio", entidad_id=s.id, antes=antes, despues=_foto(s)
    )
    return a_salida(s)


def _vigente(s: Sitio) -> None:
    if s.revocado_en:
        raise ReglaDeNegocio("Ese sitio está revocado", codigo="revocado")


async def entregas(sesion: AsyncSession, sitio_id: UUID, limite: int = 50) -> list[EntregaWebhook]:
    await _cargar(sesion, sitio_id)
    consulta = (
        select(EntregaWebhook)
        .where(EntregaWebhook.sitio_id == sitio_id)
        .order_by(EntregaWebhook.creada.desc(), EntregaWebhook.id.desc())
        .limit(limite)
    )
    return list(await sesion.scalars(consulta))


async def reintentar(sesion: AsyncSession, actor: Actor, sitio_id: UUID, entrega_id: UUID) -> EntregaWebhook:
    """Una fallida vuelve a la cola con sus reintentos completos."""
    s = await _cargar(sesion, sitio_id)
    _vigente(s)
    e = await sesion.get(EntregaWebhook, entrega_id, with_for_update=True)
    if e is None or e.sitio_id != sitio_id:
        raise NoEncontrado("Esa entrega no existe")
    if e.estado != "fallida":
        raise ReglaDeNegocio("Solo se reintenta una entrega fallida", codigo="transicion")
    e.estado, e.intentos, e.proximo_intento = "pendiente", 0, ahora()
    await sesion.flush()
    await auditar(
        sesion, accion="sitio.reintentar_entrega", entidad="entrega_webhook", entidad_id=e.id,
        despues={"sitio_id": str(sitio_id), "tipo": e.tipo},
    )  # fmt: skip
    return e
