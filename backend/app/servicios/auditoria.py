"""Auditoría: se escribe en la MISMA transacción del cambio (BACKEND-USUARIOS-Y-PERMISOS §6).

Quién, desde dónde, con qué sesión y en qué solicitud salen del `Contexto`
(app/contexto.py): ningún evento queda sin ellos aunque el servicio no los pase.
"""

import hashlib
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app import contexto
from app.esquemas.auditoria import AuditoriaSalida
from app.modelos import Auditoria
from app.repositorios import auditoria as repo


def nueva(
    *,
    accion: str,
    entidad: str,
    entidad_id: UUID | str | None = None,
    antes: dict | None = None,
    despues: dict | None = None,
    usuario_id: UUID | None = None,
    sesion_id: UUID | None = None,
    ip: str | None = None,
) -> Auditoria:
    """La fila, con el contexto de la solicitud. La usan la API (async), Celery y la CLI (síncronas)."""
    ctx = contexto.actual()
    return Auditoria(
        usuario_id=usuario_id or (ctx and ctx.usuario_id),
        accion=accion,
        entidad=entidad,
        entidad_id=str(entidad_id) if entidad_id is not None else None,
        antes=antes,
        despues=despues,
        ip=ip or (ctx and ctx.ip),
        agente=(ctx and (ctx.agente if ctx.origen == "http" else ctx.origen)) or None,
        sesion_id=sesion_id or (ctx and ctx.sesion_id),
        solicitud_id=ctx and ctx.solicitud_id,
    )


async def auditar(sesion: AsyncSession, **datos) -> None:
    sesion.add(nueva(**datos))
    # flush: el trigger encadena la fila YA, dentro de esta transacción.
    await sesion.flush()


# ── Herramientas forenses (permiso `auditoria.ver`). Mirar la auditoría también
#    queda auditado: quién consultó, verificó o exportó qué, y cuándo. ──

TOPE_VERIFICAR_MS = 120_000
TOPE_EXPORTAR = 100_000


async def consultar(sesion: AsyncSession, *, antes_de: int | None, limite: int, **filtros):
    filas = await repo.listar(sesion, antes_de=antes_de, limite=limite + 1, **filtros)
    hay_mas = len(filas) > limite
    filas = filas[:limite]
    await auditar(sesion, accion="auditoria.consultar", entidad="auditoria", despues=_texto(filtros))
    return filas, (str(filas[-1].secuencia) if hay_mas else None)


async def verificar(sesion: AsyncSession, *, desde: int) -> dict:
    revisadas, rota, ultimo = await repo.verificar(sesion, desde, TOPE_VERIFICAR_MS)
    resultado = {
        "integra": rota is None,
        "desde": desde,
        "revisadas": revisadas,
        "primera_rota": rota,
        "ultimo_hash": ultimo,
    }
    await auditar(sesion, accion="auditoria.verificar", entidad="auditoria", despues=resultado)
    return resultado


async def exportar(sesion: AsyncSession, **filtros) -> tuple[bytes, str, int]:
    """NDJSON en orden de la cadena + su SHA-256. La huella del archivo queda en
    la auditoría: cadena de custodia (quién lo sacó, cuándo y qué contenía)."""
    filas = await repo.para_exportar(sesion, limite=TOPE_EXPORTAR, **filtros)
    cuerpo = "".join(AuditoriaSalida.model_validate(f).model_dump_json() + "\n" for f in filas).encode()
    huella = hashlib.sha256(cuerpo).hexdigest()
    await auditar(
        sesion,
        accion="auditoria.exportar",
        entidad="auditoria",
        despues={"filtros": _texto(filtros), "filas": len(filas), "sha256": huella},
    )
    return cuerpo, huella, len(filas)


def _texto(filtros: dict) -> dict:
    return {k: str(v) for k, v in filtros.items() if v is not None}
