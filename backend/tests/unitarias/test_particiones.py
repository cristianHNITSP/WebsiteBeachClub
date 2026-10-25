"""Nombres y meses de las particiones (PLAN-BACKEND §9)."""

from datetime import date

from app.migraciones import _meses, es_particion


def test_es_particion():
    assert es_particion("reservas_eventos_2026_10") and es_particion("outbox_por_defecto")
    assert not es_particion("reservas_eventos") and not es_particion("claves_idempotencia_2026_10")
    assert not es_particion("outbox_vieja")


def test_meses_cruza_el_anio():
    assert list(_meses(date(2026, 11, 15), date(2027, 2, 1))) == [
        (2026, 11),
        (2026, 12),
        (2027, 1),
        (2027, 2),
    ]
