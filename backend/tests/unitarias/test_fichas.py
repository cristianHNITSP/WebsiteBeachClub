# ruff: noqa: E501  (el texto de la ficha es una línea larga, tal cual la publica la plataforma)
"""Fichas de otras plataformas: el lector se prueba con el texto REAL de una ficha
de Booking (Casa Frida, pegado por el hotel), sin tocar la red."""

from app.servicios import fichas

# Tal cual lo copió el hotel de su propia ficha, envuelto como líneas de una página.
FICHA = """Habitación Doble - 2 camas
22 m²Cocineta privadaBaño privadoVista a la albercaAire acondicionadoTV de pantalla planaTerrazaCafetera
Tamaño de la habitación 22 m²
2 camas matrimoniales
Camas comodas, 6.8 – Basado en 31 comentarios
Guests can make meals in the fully equipped kitchenette that has a refrigerator, kitchenware and a microwave. The twin room features air conditioning, a coffee machine, a terrace with pool views as well as a private bathroom boasting a shower. The unit has 2 beds.
En tu cocineta privada:
Refrigerador
Cafetera
Microondas
Utensilios de cocina
En tu baño privado:
Artículos de aseo gratuitos
Regadera
Vista:
Vista a la alberca
Servicios:
Terraza
Aire acondicionado
Caja de seguridad
TV de pantalla plana
Mosquitero
Habitaciones comunicadas disponibles
Política de fumadores:  no se puede fumar
"""


def pagina(texto: str) -> str:
    return (
        "<html><body>"
        + "".join(f"<div>{ln}</div>" for ln in texto.splitlines())
        + "<script>x=1</script></body></html>"
    )


def test_lee_la_habitacion_real_de_casa_frida():
    [c] = fichas.extraer_cuartos(pagina(FICHA))
    assert c["nombre"] == "Habitación Doble - 2 camas"
    assert c["m2"] == 22
    assert c["camas"] == "2 camas matrimoniales"
    assert c["descripcion"].startswith("Guests can make meals")
    assert c["vistas"] == ["Vista a la alberca"]
    assert "Aire acondicionado" in c["servicios"] and "Caja de seguridad" in c["servicios"]
    assert "Refrigerador" not in c["servicios"]  # eso es de la cocineta, no de "Servicios"


def test_varias_habitaciones_no_se_mezclan():
    dos = (
        FICHA
        + "\nSuite Familiar\n40 m²Cocina\nTamaño de la habitación 40 m²\n1 cama king\nServicios:\nJacuzzi\n"
    )
    a, b = fichas.extraer_cuartos(pagina(dos))
    assert (a["nombre"], b["nombre"]) == ("Habitación Doble - 2 camas", "Suite Familiar")
    assert b["servicios"] == ["Jacuzzi"] and "Jacuzzi" not in a["servicios"]


def test_una_pagina_sin_habitaciones_no_inventa_nada():
    assert fichas.extraer_cuartos("<html><body><p>Hola</p></body></html>") == []


def test_reconoce_la_verificacion_anti_robot_y_no_la_confunde_con_una_ficha():
    reto = "<html><script src='https://x.awswaf.com/challenge.js'></script><body>Verify you are human</body></html>"
    assert fichas.pide_verificacion(reto) and fichas.extraer_cuartos(reto) == []
    assert not fichas.pide_verificacion(pagina(FICHA))


def test_limpia_el_rastreo_y_el_desafio_del_enlace():
    sucio = "https://www.booking.com/hotel/mx/cabanas-frida.es-mx.html?chal_t=1793881895624&force_referer=https%3A%2F%2Fwww.google.com%2F"
    assert fichas.limpiar_url(sucio) == "https://www.booking.com/hotel/mx/cabanas-frida.es-mx.html"
