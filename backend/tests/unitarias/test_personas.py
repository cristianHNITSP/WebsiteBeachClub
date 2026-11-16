"""Regla de personas (decisión del usuario, 2026-11-15): la tarifa incluye unos adultos y unos
menores; los adultos de más pagan su extra; cada lugar de adulto libre lo ocupan hasta 2 menores
sin costo; los menores que ya no caben pagan el suyo (más barato). Todo por noche."""

from app.servicios.tarifas import extra_por_noche

# La habitación del ejemplo: incluye 2 adultos + 1 menor; adulto extra $300, menor extra $150.
HAB = {"adultos_incluidos": 2, "menores_incluidos": 1, "extra_adulto": 30_000, "extra_menor": 15_000}


def test_los_ejemplos_del_hotel():
    assert extra_por_noche(2, 1, **HAB) == 0  # justo lo incluido
    assert extra_por_noche(3, 0, **HAB) == 30_000  # 3 adultos: 1 adulto extra
    assert extra_por_noche(1, 3, **HAB) == 0  # el lugar de adulto libre lo ocupan 2 menores
    assert extra_por_noche(1, 4, **HAB) == 15_000  # el cuarto menor ya no cabe
    assert extra_por_noche(2, 2, **HAB) == 15_000  # sin lugar de adulto libre: 1 menor extra


def test_adultos_y_menores_extra_se_suman():
    assert extra_por_noche(3, 3, **HAB) == 30_000 + 2 * 15_000


def test_sin_precios_extra_nunca_cobra():
    sin = HAB | {"extra_adulto": 0, "extra_menor": 0}
    assert extra_por_noche(6, 6, **sin) == 0
