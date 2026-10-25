"""Métricas (fase 5, PLAN-BACKEND §9). Sin FastAPI.

- `recalcular(sesion, propiedad, desde, hasta)`: UNA sentencia que recalcula las
  filas de `metricas_diarias` de esos días DESDE las reservas (no suma ni resta):
  idempotente, la usan el despachador del outbox (los días que tocó un evento) y
  la verificación nocturna (toda la ventana).
- Ingreso por noche: el total de la reserva repartido entre sus noches; el resto
  de la división va a la primera noche, así la suma de las noches es EXACTA.
- `tablero` y `habitacion_mes` leen: el tablero solo `metricas_diarias` (cientos
  de filas), con caché de 60 s en Redis que el despachador invalida.
"""

import json
import logging
from datetime import date, timedelta
from uuid import UUID

from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.alcance import Alcance
from app.conexion_redis import redis
from app.errores import NoEncontrado
from app.modelos import Habitacion, MetricaDiaria, Propiedad
from app.servicios.reservas import hoy

log = logging.getLogger(__name__)
CACHE_S = 60
CACHE_PREFIJO = "cache:tablero:"
VENTANA_NOCTURNA = 400  # días hacia atrás y hacia delante que se verifican cada noche
OCUPAN = ("retenida", "confirmada", "en_curso", "completada")

RECALCULO = text("""
WITH dias AS (
    SELECT generate_series(CAST(:desde AS date), CAST(:hasta AS date) - 1, interval '1 day')::date AS dia
),
noches AS (
    -- Cada reserva que toca la ventana se expande en SUS noches dentro de ella y se
    -- agrupa por día: una sola pasada por el índice (propiedad, estancia). Antes se
    -- buscaba día por día: con 1 millón de reservas el recálculo tardaba 3 min.
    SELECT g.dia,
           count(*) FILTER (WHERE r.tipo = 'reserva') AS vendidas,
           count(*) FILTER (WHERE r.tipo = 'bloqueo') AS bloqueadas,
           coalesce(sum(
               r.total_centavos / (upper(r.estancia) - lower(r.estancia))
               + CASE WHEN lower(r.estancia) = g.dia
                      THEN r.total_centavos % (upper(r.estancia) - lower(r.estancia)) ELSE 0 END
           ) FILTER (WHERE r.tipo = 'reserva'), 0) AS ingreso
    FROM reservas r
    CROSS JOIN LATERAL generate_series(
        greatest(lower(r.estancia), CAST(:desde AS date)),
        least(upper(r.estancia), CAST(:hasta AS date)) - 1,
        interval '1 day'
    ) AS n(momento)
    CROSS JOIN LATERAL (SELECT n.momento::date AS dia) AS g
    WHERE r.propiedad_id = :propiedad
      AND r.estancia && daterange(CAST(:desde AS date), CAST(:hasta AS date))
      AND r.estado IN ('retenida', 'confirmada', 'en_curso', 'completada')
    GROUP BY g.dia
),
llegan AS (
    SELECT lower(estancia) AS dia, count(*) AS n FROM reservas
    WHERE propiedad_id = :propiedad AND tipo = 'reserva'
      AND estado IN ('retenida', 'confirmada', 'en_curso', 'completada')
      AND lower(estancia) >= :desde AND lower(estancia) < :hasta
    GROUP BY 1
),
salen AS (
    SELECT upper(estancia) AS dia, count(*) AS n FROM reservas
    WHERE propiedad_id = :propiedad AND tipo = 'reserva'
      AND estado IN ('retenida', 'confirmada', 'en_curso', 'completada')
      AND upper(estancia) >= :desde AND upper(estancia) < :hasta
    GROUP BY 1
),
cancelan AS (
    SELECT lower(estancia) AS dia, count(*) AS n FROM reservas
    WHERE propiedad_id = :propiedad AND tipo = 'reserva' AND estado = 'cancelada'
      AND lower(estancia) >= :desde AND lower(estancia) < :hasta
    GROUP BY 1
),
pendiente AS (
    SELECT lower(estancia) AS dia, sum(total_centavos - pagado_centavos) AS n FROM reservas
    WHERE propiedad_id = :propiedad AND tipo = 'reserva' AND estado IN ('confirmada', 'en_curso')
      AND lower(estancia) >= :desde AND lower(estancia) < :hasta
    GROUP BY 1
)
INSERT INTO metricas_diarias
    (propiedad_id, dia, habitaciones, noches_vendidas, bloqueadas, ingreso_centavos,
     llegadas, salidas, canceladas, por_cobrar_centavos, calculado)
SELECT :propiedad, d.dia, :habitaciones,
       coalesce(n.vendidas, 0), coalesce(n.bloqueadas, 0), coalesce(n.ingreso, 0),
       coalesce(l.n, 0), coalesce(s.n, 0), coalesce(c.n, 0), coalesce(p.n, 0), now()
FROM dias d
LEFT JOIN noches n ON n.dia = d.dia
LEFT JOIN llegan l ON l.dia = d.dia
LEFT JOIN salen s ON s.dia = d.dia
LEFT JOIN cancelan c ON c.dia = d.dia
LEFT JOIN pendiente p ON p.dia = d.dia
ON CONFLICT (propiedad_id, dia) DO UPDATE SET
    habitaciones = EXCLUDED.habitaciones, noches_vendidas = EXCLUDED.noches_vendidas,
    bloqueadas = EXCLUDED.bloqueadas, ingreso_centavos = EXCLUDED.ingreso_centavos,
    llegadas = EXCLUDED.llegadas, salidas = EXCLUDED.salidas, canceladas = EXCLUDED.canceladas,
    por_cobrar_centavos = EXCLUDED.por_cobrar_centavos, calculado = EXCLUDED.calculado
""")


def _reservables(sesion, propiedad_id: UUID) -> int:
    consulta = select(func.count()).where(
        Habitacion.propiedad_id == propiedad_id, Habitacion.estado != "inactiva"
    )
    return sesion.execute(consulta).scalar_one()


def recalcular(sesion, propiedad_id: UUID, desde: date, hasta: date) -> None:
    """Sesión SÍNCRONA (Celery, CLI). [desde, hasta)."""
    if hasta <= desde:
        return
    sesion.execute(
        RECALCULO,
        {
            "propiedad": propiedad_id,
            "desde": desde,
            "hasta": hasta,
            "habitaciones": _reservables(sesion, propiedad_id),
        },
    )


def recalcular_evento(sesion, datos: dict, propiedad_id: UUID) -> None:
    """Los días que tocó un evento de reserva: los de ahora y, si se movió, los de antes."""
    rangos = [(datos.get("llegada"), datos.get("salida"))]
    antes = (datos.get("detalle") or {}).get("antes") or {}
    rangos.append((antes.get("llegada"), antes.get("salida")))
    for llegada, salida in rangos:
        if llegada and salida:
            recalcular(sesion, propiedad_id, date.fromisoformat(llegada), date.fromisoformat(salida))


def recalcular_todo(sesion, dias: int = VENTANA_NOCTURNA) -> int:
    """Verificación nocturna: toda la ventana de todas las propiedades."""
    base = hoy()
    propiedades = sesion.execute(select(Propiedad.id)).scalars().all()
    for p in propiedades:
        recalcular(sesion, p, base - timedelta(days=dias), base + timedelta(days=dias))
    return len(propiedades)


def invalidar_cache(r) -> None:
    """Tras recalcular: el próximo tablero se vuelve a calcular. `r`: Redis
    síncrono de la tarea. Si falla, la caché vence sola en 60 s."""
    try:
        claves = list(r.scan_iter(f"{CACHE_PREFIJO}*", count=500))
        if claves:
            r.delete(*claves)
    except Exception:
        log.exception("No se pudo invalidar la caché del tablero")


# ── Lecturas ──


def _resumen(filas: list[MetricaDiaria]) -> dict:
    noches = sum(f.noches_vendidas for f in filas)
    capacidad = sum(f.habitaciones for f in filas)
    ingreso = sum(f.ingreso_centavos for f in filas)
    return {
        "noches_vendidas": noches,
        "ingreso_centavos": ingreso,
        # Ocupación, ADR y RevPAR, las tres de la industria hotelera.
        "ocupacion": round(100 * noches / capacidad, 1) if capacidad else None,
        "adr_centavos": round(ingreso / noches) if noches else None,
        "revpar_centavos": round(ingreso / capacidad) if capacidad else None,
        "canceladas": sum(f.canceladas for f in filas),
    }


def _mes(d: date) -> date:
    return d.replace(day=1)


def _mes_siguiente(d: date) -> date:
    return (d.replace(day=28) + timedelta(days=4)).replace(day=1)


async def tablero(sesion: AsyncSession, alcance: Alcance) -> dict:
    clave = f"{CACHE_PREFIJO}{alcance.valor_rls()}:{hoy()}"
    try:
        if guardado := await redis.get(clave):
            return json.loads(guardado)
    except Exception:
        log.warning("Caché del tablero no disponible: se calcula")  # Redis caído no tumba el tablero
    datos = await _calcular_tablero(sesion, alcance)
    try:
        await redis.set(clave, json.dumps(datos, default=str), ex=CACHE_S)
    except Exception:
        log.warning("No se pudo guardar el tablero en caché")  # se calcula de nuevo la próxima vez
    return datos


async def _calcular_tablero(sesion: AsyncSession, alcance: Alcance) -> dict:
    base = hoy()
    inicio = _mes(base) - timedelta(days=366)
    inicio = _mes(inicio)
    fin = base + timedelta(days=15)
    filas = (
        (
            await sesion.execute(
                select(MetricaDiaria)
                .where(
                    MetricaDiaria.dia >= inicio,
                    MetricaDiaria.dia < fin,
                    alcance.filtro(MetricaDiaria.propiedad_id),
                )
                .order_by(MetricaDiaria.dia)
            )
        )
        .scalars()
        .all()
    )
    por_dia: dict[date, list[MetricaDiaria]] = {}
    for f in filas:
        por_dia.setdefault(f.dia, []).append(f)

    def entre(a: date, b: date) -> list[MetricaDiaria]:
        return [f for f in filas if a <= f.dia < b]

    hoy_filas = por_dia.get(base, [])
    mes, mes_ant = _mes(base), _mes(_mes(base) - timedelta(days=1))
    # El mes en curso hasta hoy, contra el mismo tramo del mes anterior (comparar justo).
    dias_mes = (base - mes).days + 1
    meses = []
    m = _mes(base)
    for _ in range(12):
        meses.append({"mes": m.strftime("%Y-%m"), **_resumen(entre(m, _mes_siguiente(m)))})
        m = _mes(m - timedelta(days=1))
    en_mantenimiento = (
        await sesion.execute(
            select(func.count()).where(
                Habitacion.estado == "mantenimiento", alcance.filtro(Habitacion.propiedad_id)
            )
        )
    ).scalar_one()
    # Lo pendiente de cobro también sale de las métricas (no de `reservas`): con
    # un millón de reservas, sumarlo en vivo hacía que el tablero tardara 348 ms
    # (lo encontró la prueba de carga). Una estancia dura 60 noches como máximo.
    por_cobrar = (
        await sesion.execute(
            select(func.coalesce(func.sum(MetricaDiaria.por_cobrar_centavos), 0)).where(
                MetricaDiaria.dia >= base - timedelta(days=60), alcance.filtro(MetricaDiaria.propiedad_id)
            )
        )
    ).scalar_one()
    return {
        "fecha": str(base),
        "hoy": {
            "habitaciones": sum(f.habitaciones for f in hoy_filas),
            "ocupadas": sum(f.noches_vendidas for f in hoy_filas),
            "bloqueadas": sum(f.bloqueadas for f in hoy_filas),
            "llegadas": sum(f.llegadas for f in hoy_filas),
            "salidas": sum(f.salidas for f in hoy_filas),
            "en_mantenimiento": en_mantenimiento,
            "por_cobrar_centavos": int(por_cobrar),
            **{k: v for k, v in _resumen(hoy_filas).items() if k == "ocupacion"},
        },
        "ultimos_7_dias": _resumen(entre(base - timedelta(days=7), base)),
        "mes": _resumen(entre(mes, base + timedelta(days=1))),
        "mes_anterior": _resumen(entre(mes_ant, mes_ant + timedelta(days=dias_mes))),
        "meses": list(reversed(meses)),
        "proximos": [
            {"dia": str(base + timedelta(days=i)), **_resumen(por_dia.get(base + timedelta(days=i), []))}
            for i in range(14)
        ],
        "calculado": max((f.calculado for f in filas), default=None),
    }


async def habitacion_mes(sesion: AsyncSession, alcance: Alcance, habitacion_id: UUID, mes: date) -> dict:
    """Ocupación, ingreso y RevPAR de UNA habitación en un mes, en vivo: son unas
    pocas reservas y el índice gist de la habitación las encuentra al instante."""
    h = (
        await sesion.execute(
            select(Habitacion).where(Habitacion.id == habitacion_id, alcance.filtro(Habitacion.propiedad_id))
        )
    ).scalar_one_or_none()
    if h is None:
        raise NoEncontrado("Esa habitación no existe")
    inicio, fin = _mes(mes), _mes_siguiente(mes)
    fila = (
        await sesion.execute(
            text("""
            -- Las noches de cada reserva que caen dentro del mes (intersección de rangos)
            -- y su parte proporcional del total.
            SELECT coalesce(sum(upper(estancia * daterange(:a, :b))
                                - lower(estancia * daterange(:a, :b))), 0) AS noches,
                   coalesce(sum(total_centavos::numeric
                                * (upper(estancia * daterange(:a, :b)) - lower(estancia * daterange(:a, :b)))
                                / (upper(estancia) - lower(estancia))), 0) AS ingreso
            FROM reservas
            WHERE habitacion_id = :h AND tipo = 'reserva' AND estancia && daterange(:a, :b)
              AND estado IN ('retenida', 'confirmada', 'en_curso', 'completada')
            """),
            {"h": habitacion_id, "a": inicio, "b": fin},
        )
    ).one()
    dias = (fin - inicio).days
    ingreso = round(fila.ingreso)
    return {
        "mes": inicio.strftime("%Y-%m"),
        "noches_vendidas": int(fila.noches),
        "ocupacion": round(100 * int(fila.noches) / dias, 1),
        "ingreso_centavos": ingreso,
        "revpar_centavos": round(ingreso / dias),
    }


# ── Cómo pagan los huéspedes (estancias TERMINADAS en el periodo) ──
# Una categoría por estancia, en este orden (la primera que cumpla):
#   de_una_vez: un solo pago cubrió toda la estancia;
#   al_llegar:  todo pagado a más tardar el día del check-in (en uno o varios pagos);
#   al_salir:   la mitad o más se pagó la última noche o el día del check-out;
#   en_abonos:  pagos en dos o más días distintos durante la estancia;
#   otra:       el resto.
# Las fechas de pago, de Mérida. Las devoluciones no cuentan.
FORMAS_DE_PAGO = ("de_una_vez", "al_llegar", "al_salir", "en_abonos", "otra")
_FORMAS = text("""
WITH estancias AS (
    SELECT r.id, r.total_centavos AS total, lower(r.estancia) AS llegada, upper(r.estancia) AS salida
    FROM reservas r
    WHERE r.tipo = 'reserva' AND r.estado = 'completada' AND r.total_centavos > 0
      AND upper(r.estancia) >= :desde AND upper(r.estancia) < :hasta
      AND (CAST(:propiedades AS uuid[]) IS NULL OR r.propiedad_id = ANY(CAST(:propiedades AS uuid[])))
),
pagos_dia AS (
    SELECT p.reserva_id, p.monto_centavos AS monto, (p.creado AT TIME ZONE 'America/Merida')::date AS dia
    FROM pagos p JOIN estancias e ON e.id = p.reserva_id
    WHERE p.concepto <> 'devolucion'
),
por_estancia AS (
    SELECT e.total,
           count(pd.monto) AS pagos,
           coalesce(max(pd.monto), 0) AS mayor,
           coalesce(sum(pd.monto) FILTER (WHERE pd.dia <= e.llegada), 0) AS hasta_llegar,
           coalesce(sum(pd.monto) FILTER (WHERE pd.dia >= e.salida - 1), 0) AS al_final,
           count(DISTINCT pd.dia) FILTER (WHERE pd.dia BETWEEN e.llegada AND e.salida) AS dias_durante
    FROM estancias e LEFT JOIN pagos_dia pd ON pd.reserva_id = e.id
    GROUP BY e.id, e.total
)
SELECT CASE
           WHEN pagos = 1 AND mayor >= total THEN 'de_una_vez'
           WHEN hasta_llegar >= total THEN 'al_llegar'
           WHEN al_final * 2 >= total THEN 'al_salir'
           WHEN dias_durante >= 2 THEN 'en_abonos'
           ELSE 'otra'
       END AS forma,
       count(*) AS estancias,
       sum(pagos) AS pagos
FROM por_estancia
GROUP BY 1
""")


async def formas_de_pago(sesion: AsyncSession, alcance: Alcance, desde: date, hasta: date) -> dict:
    """Cuántas estancias terminadas en [desde, hasta) pagaron de cada forma."""
    filas = (
        await sesion.execute(
            _FORMAS,
            {
                "desde": desde,
                "hasta": hasta,
                "propiedades": None if alcance.propiedades is None else [str(p) for p in alcance.propiedades],
            },
        )
    ).all()
    cuenta = {f.forma: (f.estancias, f.pagos) for f in filas}
    estancias = sum(e for e, _ in cuenta.values())
    pagos = sum(p for _, p in cuenta.values())
    return {
        "desde": desde,
        "hasta": hasta,
        "estancias": estancias,
        "pagos_por_estancia": round(pagos / estancias, 1) if estancias else 0,
        "formas": [
            {
                "forma": f,
                "estancias": cuenta.get(f, (0, 0))[0],
                "porcentaje": round(100 * cuenta.get(f, (0, 0))[0] / estancias, 1) if estancias else 0,
            }
            for f in FORMAS_DE_PAGO
        ],
    }
