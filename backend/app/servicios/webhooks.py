"""Webhooks salientes: avisarle a la website que una reserva suya cambió
(PLAN-BACKEND §4.4). Síncrono: lo usa Celery.

1. El despachador del outbox crea una `entrega` por evento y sitio (idempotente).
2. `entregar_pendientes` (cada 15 s) las aparta, las manda FUERA de toda
   transacción (una transacción nunca espera a un servicio externo) y guarda el
   resultado. Si falla, reintenta con espera creciente durante ~24 h; al agotar,
   la marca `fallida` y avisa al panel.

Firma: `X-Frida-Firma: t=<unix>,v1=<HMAC-SHA256 de "<t>.<cuerpo>">` con el
secreto del sitio, que se deriva de CLAVE_WEBHOOKS (no se guarda en la base).
"""

import hashlib
import hmac
import json
import logging
import time
from datetime import timedelta
from uuid import UUID

import httpx
from sqlalchemy import func, select, update
from sqlalchemy.dialects.postgresql import insert

from app import red
from app.config import obtener_config
from app.modelos import Aviso, EntregaWebhook, Outbox, Sitio
from app.servicios.auth import ahora

log = logging.getLogger(__name__)

# Evento del outbox → evento que recibe el sitio. `reserva.confirmada` llegará con
# los pagos (paso 8); la retención la creó el propio sitio, no se le avisa.
EVENTOS = {
    "reserva.confirmada": "reserva.confirmada",
    "reserva.expirada": "reserva.expirada",
    "reserva.cancelada": "reserva.cancelada",
    "reserva.movida": "reserva.modificada",
}
CAMPOS = (
    "codigo", "estado", "llegada", "salida", "noches", "habitacion_id", "habitacion_nombre", "propiedad_id",
    "total_centavos", "anticipo_centavos", "pagado_centavos",
)  # fmt: skip
ESPERAS = [timedelta(minutes=m) for m in (1, 5, 30, 120, 360, 900)]  # ~24 h en total
LOTE = 20
APARTADO = timedelta(minutes=2)  # lo que un worker tiene una entrega para sí mientras la manda


def secreto(sitio_id: UUID, version: int) -> str:
    clave = obtener_config().clave_webhooks.get_secret_value().encode()
    return "whsec_" + hmac.new(clave, f"{sitio_id}:{version}".encode(), hashlib.sha256).hexdigest()


def firma(secreto_sitio: str, cuerpo: bytes, t: int) -> str:
    v1 = hmac.new(secreto_sitio.encode(), f"{t}.".encode() + cuerpo, hashlib.sha256).hexdigest()
    return f"t={t},v1={v1}"


def _cuerpo(e: Outbox, tipo: str) -> dict:
    """Lo que el sitio necesita para actualizar su página. Sin datos personales del
    huésped (los tiene el sitio desde que retuvo) ni el token."""
    d = e.datos or {}
    return {
        "id": str(e.id),  # el sitio ignora duplicados por este id
        "tipo": tipo,
        "creado": e.momento.isoformat(),
        "reserva": {k: d.get(k) for k in CAMPOS},
    }


def encolar(sesion, e: Outbox) -> bool:
    """Desde el despachador del outbox, en su transacción."""
    tipo = EVENTOS.get(e.tipo)
    sitio_id = (e.datos or {}).get("sitio_id")
    if e.agregado != "reserva" or tipo is None or not sitio_id:
        return False
    sitio = sesion.get(Sitio, UUID(sitio_id))
    if sitio is None or sitio.revocado_en or not sitio.webhook_url:
        return False
    r = sesion.execute(
        insert(EntregaWebhook)
        .values(sitio_id=sitio.id, evento_id=e.id, tipo=tipo, cuerpo=_cuerpo(e, tipo))
        .on_conflict_do_nothing(index_elements=["sitio_id", "evento_id"])
    )
    return r.rowcount > 0


def enviar(url: str, secreto_sitio: str, cuerpo: dict) -> tuple[int | None, str | None]:
    """(código HTTP, error). Sin redirecciones: una 3xx cuenta como fallo."""
    problema = red.destino_seguro(url)
    if problema:
        return None, problema
    datos = json.dumps(cuerpo, ensure_ascii=False, separators=(",", ":")).encode()
    cabeceras = {
        "Content-Type": "application/json",
        "User-Agent": "Frida-Webhooks/1",
        "X-Frida-Evento": cuerpo["id"],
        "X-Frida-Firma": firma(secreto_sitio, datos, int(time.time())),
    }
    try:
        with httpx.Client(timeout=red.TIEMPOS, follow_redirects=False) as c:
            r = c.post(url, content=datos, headers=cabeceras)
    except httpx.HTTPError as e:
        return None, f"{type(e).__name__}: sin respuesta"[:300]
    return r.status_code, None if r.is_success else f"Respondió {r.status_code}"


def apartar(sesion) -> list[tuple[UUID, str, str, dict]]:
    """Las que tocan ahora: (id, url, secreto, cuerpo). Se apartan moviendo su
    `proximo_intento` (SKIP LOCKED: dos workers nunca toman la misma)."""
    cuales = (
        select(EntregaWebhook.id)
        .where(EntregaWebhook.estado == "pendiente", EntregaWebhook.proximo_intento <= func.now())
        .order_by(EntregaWebhook.proximo_intento)
        .limit(LOTE)
        .with_for_update(skip_locked=True)
    )
    filas = sesion.execute(
        update(EntregaWebhook)
        .where(EntregaWebhook.id.in_(cuales.scalar_subquery()))
        .values(proximo_intento=func.now() + APARTADO)
        .returning(EntregaWebhook.id, EntregaWebhook.sitio_id, EntregaWebhook.cuerpo)
    ).all()
    sitios = {s.id: s for s in sesion.scalars(select(Sitio).where(Sitio.id.in_({f.sitio_id for f in filas})))}
    listas = []
    for f in filas:
        s = sitios[f.sitio_id]
        if s.revocado_en or not s.webhook_url:
            sesion.get(EntregaWebhook, f.id).estado = "fallida"  # el sitio ya no quiere avisos
            continue
        listas.append((f.id, s.webhook_url, secreto(s.id, s.webhook_version), f.cuerpo))
    return listas


def resultado(sesion, entrega_id: UUID, codigo: int | None, error: str | None) -> None:
    e = sesion.get(EntregaWebhook, entrega_id, with_for_update=True)
    e.intentos += 1
    e.ultimo_http, e.ultimo_error = codigo, error
    if error is None:
        e.estado, e.entregada_en = "entregada", ahora()
    elif e.intentos > len(ESPERAS):
        e.estado = "fallida"
        sitio = sesion.get(Sitio, e.sitio_id)
        sesion.execute(
            insert(Aviso)
            .values(
                evento_id=e.id,
                propiedad_id=None,
                permiso="sitios.gestionar",
                tipo="sistema",
                titulo="Un sitio web no recibe avisos",
                texto=f"«{sitio.nombre}» no respondió en 24 h al aviso {e.tipo}. Revisa su URL de webhooks."[
                    :300
                ],
                destino="/admin/configuracion?pestana=sitios",
            )
            .on_conflict_do_nothing(index_elements=["evento_id"])
        )
    else:
        e.proximo_intento = ahora() + ESPERAS[e.intentos - 1]
    sesion.flush()
