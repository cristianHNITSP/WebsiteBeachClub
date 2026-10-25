"""Analítica: cómo pagan los huéspedes (estancias terminadas)."""

import secrets
from datetime import datetime, time, timedelta
from zoneinfo import ZoneInfo

from sqlalchemy.dialects.postgresql import Range

from app.modelos import Pago, Reserva
from app.servicios.reservas import hoy
from tests.conftest import entrar_como
from tests.fabricas import crear_habitacion

MERIDA = ZoneInfo("America/Merida")


async def _estancia(sesion, h, llegada, noches, pagos_por_dia: list[tuple[int, int]]):
    """Una estancia ya terminada con sus pagos: (día relativo a la llegada, monto)."""
    total = 100_000 * noches
    r = Reserva(
        codigo="FRD-" + secrets.token_hex(3).upper(), propiedad_id=h.propiedad_id, habitacion_id=h.id,
        estado="completada", estancia=Range(llegada, llegada + timedelta(days=noches)), adultos=1,
        huesped_nombre="Forma", modalidad="completo", tarifa_noche_centavos=100_000, total_centavos=total,
        anticipo_centavos=total, pagado_centavos=sum(m for _, m in pagos_por_dia),
    )  # fmt: skip
    sesion.add(r)
    await sesion.flush()
    for dia, monto in pagos_por_dia:
        momento = datetime.combine(llegada + timedelta(days=dia), time(12), tzinfo=MERIDA)
        sesion.add(
            Pago(reserva_id=r.id, propiedad_id=r.propiedad_id, concepto="abono", metodo="efectivo",
                 estado="cobrado", monto_centavos=monto, creado=momento)
        )  # fmt: skip
    await sesion.flush()


async def test_formas_de_pago(cliente, sesion):
    await entrar_como(cliente, sesion)
    h = await crear_habitacion(sesion, "chelem", nombre="Formas de pago")
    llegada = hoy() - timedelta(days=20)
    antes = (await cliente.get("/api/admin/metricas/pagos?dias=60")).json()

    await _estancia(sesion, h, llegada, 3, [(-5, 300_000)])  # de una vez, antes de llegar
    await _estancia(
        sesion, h, llegada - timedelta(days=4), 3, [(-3, 100_000), (0, 200_000)]
    )  # todo al llegar
    await _estancia(
        sesion, h, llegada - timedelta(days=8), 4, [(-2, 100_000), (3, 300_000)]
    )  # liquidó al salir
    await _estancia(
        sesion, h, llegada - timedelta(days=14), 5, [(0, 100_000), (1, 100_000), (2, 300_000)]
    )  # abonos

    d = (await cliente.get("/api/admin/metricas/pagos?dias=60")).json()
    cuantas = {f["forma"]: f["estancias"] for f in d["formas"]}
    previas = {f["forma"]: f["estancias"] for f in antes["formas"]}
    for forma in ("de_una_vez", "al_llegar", "al_salir", "en_abonos"):
        assert cuantas[forma] - previas[forma] == 1, (forma, cuantas, previas)
    assert d["estancias"] - antes["estancias"] == 4
    assert abs(sum(f["porcentaje"] for f in d["formas"]) - 100) < 0.5
