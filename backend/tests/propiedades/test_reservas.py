"""Pruebas de propiedades (PLAN-BACKEND §17.3): Hypothesis genera secuencias
aleatorias de acciones sobre reservas reales (Postgres, mismos servicios que la
API) y, tras CADA acción, se comprueba lo que nunca debe romperse:

- nunca dos reservas activas que se crucen en la misma habitación;
- lo pagado siempre entre 0 y el total, y lo que falta por cobrar nunca negativo;
- la máquina de estados no deja reservas en estados imposibles.

Que una acción sea rechazada (choque, regla, estado) está bien: es la API
defendiéndose. Lo que NO puede pasar es otro tipo de error ni un estado roto.
"""

from contextlib import suppress
from datetime import timedelta

from hypothesis import HealthCheck, given, settings
from hypothesis import strategies as st
from sqlalchemy import text

from app.auth.alcance import Alcance
from app.auth.dependencias import Actor
from app.errores import ErrorDeDominio
from app.esquemas.reservas import Devolucion, Mover, PagoNuevo, ReservaNueva
from app.servicios import reservas
from app.servicios.reservas import anticipo_de, hoy, proporcional
from app.servicios.tarifas import precios_por_noche
from tests.fabricas import crear_habitacion, crear_usuario

TODO = Alcance(None)

# ── Funciones puras ──


@given(total=st.integers(0, 10**9), pct=st.integers(1, 99))
def test_anticipo_entre_cero_y_total(total, pct):
    assert anticipo_de(total, "completo", None) == total
    assert 0 <= anticipo_de(total, "anticipo", pct) <= total


@given(total=st.integers(0, 10**9), n=st.integers(1, 60), m=st.integers(1, 60))
def test_proporcional_respeta_lo_pactado(total, n, m):
    assert proporcional(total, n, n) == total  # mismas noches, mismo total exacto
    assert proporcional(total, n, m) >= 0


@given(base=st.integers(1, 10**6), noches=st.integers(1, 60))
def test_precio_por_cada_noche(base, noches):
    llegada = hoy()
    assert precios_por_noche(base, [], llegada, llegada + timedelta(days=noches)) == [base] * noches


# ── Secuencias de acciones sobre la base ──

accion = st.one_of(
    st.tuples(st.just("crear"), st.integers(0, 1), st.integers(1, 20), st.integers(1, 5)),
    st.tuples(st.just("mover"), st.integers(0, 30), st.integers(-3, 3), st.integers(-1, 2)),
    st.tuples(st.just("cancelar"), st.integers(0, 30)),
    st.tuples(st.just("pagar"), st.integers(0, 30), st.floats(0.01, 1.0)),
    st.tuples(st.just("devolver"), st.integers(0, 30), st.floats(0.01, 1.0)),
)

INVARIANTES = text(
    "SELECT"
    " (SELECT count(*) FROM reservas a JOIN reservas b"
    "   ON a.habitacion_id = b.habitacion_id AND a.id < b.id AND a.estancia && b.estancia"
    "  WHERE a.estado IN ('retenida', 'confirmada', 'en_curso')"
    "    AND b.estado IN ('retenida', 'confirmada', 'en_curso')) AS cruces,"
    " (SELECT count(*) FROM reservas"
    "   WHERE pagado_centavos < 0 OR pagado_centavos > total_centavos) AS dinero,"
    " (SELECT count(*) FROM reservas WHERE estado NOT IN"
    "   ('retenida', 'confirmada', 'en_curso', 'completada', 'expirada', 'cancelada')) AS estados"
)


@settings(max_examples=40, deadline=None, suppress_health_check=[HealthCheck.function_scoped_fixture])
@given(acciones=st.lists(accion, min_size=1, max_size=15))
async def test_ninguna_secuencia_rompe_las_invariantes(sesion, acciones):
    punto = await sesion.begin_nested()  # cada ejemplo empieza limpio
    try:
        u = await crear_usuario(sesion, rol="gerente")
        actor = Actor(
            id=u.id,
            sid=u.id,
            rol="gerente",
            permisos=frozenset(),
            propiedades=frozenset(),
            todas_las_propiedades=True,
        )
        habs = [await crear_habitacion(sesion, tarifa_centavos=100_000, capacidad=4) for _ in range(2)]
        creadas = []
        for a in acciones:
            with suppress(ErrorDeDominio):  # rechazada: la API se defendió
                await _aplicar(sesion, actor, habs, creadas, a)
            cruces, dinero_roto, estados_rotos = (await sesion.execute(INVARIANTES)).one()
            assert (cruces, dinero_roto, estados_rotos) == (0, 0, 0), (a, acciones)
            for rid in creadas:
                r = await reservas.repo.por_id(sesion, TODO, rid)
                assert r.por_cobrar_centavos >= 0
    finally:
        await punto.rollback()


async def _aplicar(sesion, actor, habs, creadas, a):
    base = hoy()
    if a[0] == "crear":
        _, h, inicio, noches = a
        r = await reservas.crear(
            sesion,
            actor,
            TODO,
            ReservaNueva(
                habitacion_id=habs[h].id,
                llegada=base + timedelta(days=inicio),
                salida=base + timedelta(days=inicio + noches),
                adultos=1,
                huesped_nombre="Propiedad",
            ),
        )
        creadas.append(r.id)
        return
    if not creadas:
        return
    r = await reservas.repo.por_id(sesion, TODO, creadas[a[1] % len(creadas)])
    if a[0] == "mover":
        _, _, delta, estira = a
        llegada = r.llegada + timedelta(days=delta)
        salida = max(r.salida + timedelta(days=delta + estira), llegada + timedelta(days=1))
        await reservas.mover(
            sesion,
            actor,
            TODO,
            r.id,
            Mover(habitacion_id=r.habitacion_id, llegada=llegada, salida=salida, version=r.version),
        )
    elif a[0] == "cancelar":
        await reservas.cancelar(sesion, actor, TODO, r.id, r.version, "propiedad")
    elif a[0] == "pagar" and r.por_cobrar_centavos > 0:
        monto = max(1, int(r.por_cobrar_centavos * a[2]))
        await reservas.registrar_pago(
            sesion, actor, TODO, r.id, PagoNuevo(concepto="abono", metodo="efectivo", monto_centavos=monto)
        )
    elif a[0] == "devolver" and r.pagado_centavos > 0:
        monto = max(1, int(r.pagado_centavos * a[2]))
        await reservas.devolver(
            sesion, actor, TODO, r.id, Devolucion(metodo="efectivo", monto_centavos=monto, motivo="propiedad")
        )
