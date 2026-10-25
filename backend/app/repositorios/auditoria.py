"""Consultas de la auditoría (solo lectura: la tabla solo admite inserciones)."""

from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.modelos import Auditoria


def _filtrada(*, entidad, entidad_id, usuario_id, accion, desde, hasta):
    consulta = select(Auditoria)
    if entidad:
        consulta = consulta.where(Auditoria.entidad == entidad)
    if entidad_id:
        consulta = consulta.where(Auditoria.entidad_id == entidad_id)
    if usuario_id:
        consulta = consulta.where(Auditoria.usuario_id == usuario_id)
    if accion:
        consulta = consulta.where(Auditoria.accion.startswith(accion, autoescape=True))
    if desde:
        consulta = consulta.where(Auditoria.momento >= desde)
    if hasta:
        consulta = consulta.where(Auditoria.momento < hasta)
    return consulta


async def listar(sesion: AsyncSession, *, antes_de: int | None, limite: int, **filtros) -> list[Auditoria]:
    """Lo más reciente primero, por cursor (secuencia)."""
    consulta = _filtrada(**filtros).order_by(Auditoria.secuencia.desc()).limit(limite)
    if antes_de:
        consulta = consulta.where(Auditoria.secuencia < antes_de)
    return list((await sesion.execute(consulta)).scalars())


async def para_exportar(sesion: AsyncSession, *, limite: int, **filtros) -> list[Auditoria]:
    """En orden de la cadena (secuencia ascendente), para poder verificarla fuera."""
    return list(
        (await sesion.execute(_filtrada(**filtros).order_by(Auditoria.secuencia).limit(limite))).scalars()
    )


async def verificar(sesion: AsyncSession, desde: int, tope_ms: int) -> tuple[int, int | None, str]:
    # Recorrer la cadena entera puede pasar del tope general de 5 s: se amplía
    # solo para esta transacción (SET LOCAL).
    await sesion.execute(select(func.set_config("statement_timeout", f"{tope_ms}ms", True)))
    fila = (await sesion.execute(text("SELECT * FROM auditoria_verificar(:desde)"), {"desde": desde})).one()
    return fila.revisadas, fila.primera_rota, fila.ultimo_hash


async def cabeza(sesion: AsyncSession) -> tuple[int, str] | None:
    fila = (
        await sesion.execute(
            select(Auditoria.secuencia, Auditoria.hash).order_by(Auditoria.secuencia.desc()).limit(1)
        )
    ).first()
    return (fila.secuencia, fila.hash) if fila else None
