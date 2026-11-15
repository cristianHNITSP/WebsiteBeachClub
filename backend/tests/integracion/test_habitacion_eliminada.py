"""Habitación eliminada que aún tiene reservas: sin llegada ni salida hasta restaurarla; cuando pasa
la noche de la última, sus reservas se cierran solas SIN cancelarse y la habitación se elimina sola."""

from contextlib import contextmanager
from datetime import timedelta

from sqlalchemy import select
from sqlalchemy.dialects.postgresql import Range

from app.modelos import Habitacion, Reserva, ReservaEvento
from app.modelos.base import INCLUIR_ELIMINADOS
from app.servicios.reservas import hoy
from app.tareas import sistema
from tests.conftest import csrf, entrar_como
from tests.fabricas import abrir_alcance, crear_habitacion, propiedad
from tests.integracion.test_reservas import URL, reservar

HAB = "/api/admin/habitaciones"


async def test_crear_una_habitacion_avisa_en_vivo(cliente, sesion):
    from app.modelos import Outbox

    await entrar_como(cliente, sesion)
    p = await propiedad(sesion, "chelem")
    cuerpo = {
        "propiedad_id": str(p.id),
        "nombre": "Habitación Aviso",
        "tipo": "Habitación",
        "capacidad": 2,
        "tarifa_centavos": 100_000,
    }
    r = await cliente.post(HAB, json=cuerpo, headers=csrf(cliente))
    assert r.status_code == 201, r.text
    eventos = list(await sesion.scalars(select(Outbox).where(Outbox.tipo == "habitacion.creada")))
    assert (
        len(eventos) == 1 and str(eventos[0].agregado_id) == r.json()["id"]
    )  # los paneles abiertos se refrescan


async def test_sin_llegada_ni_salida_hasta_restaurar_la_habitacion(cliente, sesion):
    await entrar_como(cliente, sesion)
    hab = await crear_habitacion(sesion)
    r = await reservar(cliente, hab, llegada=0, noches=2)  # llega hoy
    assert (await cliente.delete(f"{HAB}/{hab.id}", headers=csrf(cliente))).status_code == 204
    # La reserva NO se cancela: sigue confirmada y dice que su habitación está en la papelera.
    d = (await cliente.get(f"{URL}/{r['id']}")).json()
    assert d["estado"] == "confirmada" and d["habitacion_situacion"] == "en_papelera"

    accion = {"version": r["version"]}
    x = await cliente.post(f"{URL}/{r['id']}/llegada", json=accion, headers=csrf(cliente))
    assert x.status_code == 422 and x.json()["codigo"] == "habitacion_eliminada"

    assert (await cliente.post(f"{HAB}/{hab.id}/restaurar", headers=csrf(cliente))).status_code == 200
    x = await cliente.post(f"{URL}/{r['id']}/llegada", json=accion, headers=csrf(cliente))
    assert x.status_code == 200 and x.json()["estado"] == "en_curso"


def _noche(s, monkeypatch):
    @contextmanager
    def sesion_de_prueba():
        yield s
        s.flush()

    monkeypatch.setattr(sistema, "SesionSincrona", type("F", (), {"begin": staticmethod(sesion_de_prueba)}))
    return sistema.cerrar_habitaciones_eliminadas()


async def test_pasada_la_ultima_noche_se_cierra_sola_sin_cancelar_y_la_habitacion_se_elimina(
    cliente, sesion, monkeypatch
):
    await entrar_como(cliente, sesion)
    vive = await crear_habitacion(sesion)  # eliminada, con una reserva que aún no termina
    termino = await crear_habitacion(sesion)  # eliminada, su única reserva ya terminó
    sin_reservas = await crear_habitacion(sesion)  # eliminada, nunca tuvo reservas
    futura = await reservar(cliente, vive, llegada=2, noches=3)
    await abrir_alcance(sesion)
    p = await propiedad(sesion, "chelem")
    pasada = Reserva(
        codigo="FRD-PASADA1",
        propiedad_id=p.id,
        habitacion_id=termino.id,
        estado="confirmada",
        estancia=Range(hoy() - timedelta(days=4), hoy() - timedelta(days=1)),
        adultos=2,
        huesped_nombre="Ana",
        modalidad="completo",
        tarifa_noche_centavos=100_000,
        total_centavos=300_000,
        anticipo_centavos=300_000,
        pagado_centavos=300_000,
    )
    sesion.add(pasada)
    await sesion.flush()
    for h in (vive, termino, sin_reservas):
        assert (await cliente.delete(f"{HAB}/{h.id}", headers=csrf(cliente))).status_code == 204

    resultado = await sesion.run_sync(lambda s: _noche(s, monkeypatch))
    assert resultado == {"reservas_cerradas": 1, "habitaciones_eliminadas": 1}

    # La que ya terminó: cerrada (no cancelada), con su historial, y su habitación eliminada para siempre.
    await sesion.refresh(pasada)
    assert pasada.estado == "completada" and pasada.motivo_cancelacion is None
    ev = await sesion.scalar(
        select(ReservaEvento).where(ReservaEvento.reserva_id == pasada.id, ReservaEvento.tipo == "cierre")
    )
    assert ev.de_estado == "confirmada" and ev.detalle == {"motivo": "habitacion_eliminada"}
    habs = {
        h.id: h
        for h in await sesion.scalars(select(Habitacion).execution_options(**{INCLUIR_ELIMINADOS: True}))
    }
    assert habs[termino.id].purgado_en is not None
    # La que aún tiene una reserva en camino: nada cambia (ni la reserva ni la habitación).
    assert habs[vive.id].purgado_en is None
    assert (await cliente.get(f"{URL}/{futura['id']}")).json()["estado"] == "confirmada"
    # La que nunca tuvo reservas sigue el camino de siempre: la vacía quien tiene permiso.
    assert habs[sin_reservas.id].purgado_en is None
