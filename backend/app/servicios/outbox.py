"""Outbox (PLAN-BACKEND §6.4): todo efecto hacia fuera se escribe en la MISMA
transacción del cambio. Si la transacción no se guarda, el aviso tampoco existe;
si se guarda, el aviso no se pierde. Celery lo despacha (SSE en la fase 4)."""

from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.modelos import Outbox


async def encolar(
    sesion: AsyncSession,
    tipo: str,
    *,
    agregado: str,
    agregado_id: UUID,
    propiedad_id: UUID | None,
    datos: dict,
) -> None:
    sesion.add(
        Outbox(tipo=tipo, agregado=agregado, agregado_id=agregado_id, propiedad_id=propiedad_id, datos=datos)
    )
