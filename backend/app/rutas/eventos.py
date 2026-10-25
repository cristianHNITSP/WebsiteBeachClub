"""SSE del panel: GET /api/eventos (PLAN-BACKEND §10). Solo personal con sesión."""

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Header, Query, Request
from fastapi.responses import StreamingResponse

from app import tiempo_real
from app.auth.dependencias import ActorActual
from app.db import SesionAsync

router = APIRouter(tags=["tiempo real"])


@router.get("/api/eventos")
async def eventos(
    request: Request,
    actor: ActorActual,
    last_event_id: Annotated[str | None, Header(alias="Last-Event-ID")] = None,
    desde: Annotated[str | None, Query(max_length=36)] = None,
):
    """`Last-Event-ID` lo manda el navegador al reconectar solo; `?desde=` lo usa
    el panel cuando abre una conexión nueva (tras renovar la sesión)."""
    try:
        marca = last_event_id or desde
        ultimo = UUID(marca) if marca else None
    except ValueError:
        ultimo = None  # un id raro no rompe: solo no se reenvía nada
    return StreamingResponse(
        tiempo_real.flujo(actor, ultimo, request.is_disconnected, SesionAsync),
        media_type="text/event-stream",
        # Sin caché ni búfer en el camino (Nginx también lo apaga en su location).
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
