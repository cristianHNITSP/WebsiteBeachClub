"""La API pública con concurrencia REAL (PLAN-BACKEND §6.2, §7): peticiones HTTP
simultáneas, cada una con su conexión y su transacción (sin la sesión revertida
de las demás pruebas). Limpia al final con el dueño de las tablas."""

import asyncio
import uuid
from datetime import timedelta

from httpx import ASGITransport, AsyncClient
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

from app.auth.sitio import huella, nuevas_claves
from app.config import obtener_config
from app.main import app
from app.servicios.reservas import hoy

SIMULTANEAS = 10
MISMA_CLAVE = 8


async def test_retenciones_simultaneas_entra_una_y_la_misma_clave_crea_una():
    duenio = create_async_engine(obtener_config().url_migraciones())
    marca = uuid.uuid4().hex[:8]
    publica, secreta = nuevas_claves()
    sitio = None
    try:
        async with duenio.begin() as c:
            prop = await c.scalar(text("SELECT id FROM propiedades WHERE clave = 'chelem'"))
            sitio = await c.scalar(
                text(
                    "INSERT INTO sitios (nombre, clave_publica, clave_secreta_hash, clave_secreta_pista)"
                    " VALUES (:n, :p, :h, 'xxxx') RETURNING id"
                ),
                {"n": f"Concurrencia {marca}", "p": publica, "h": huella(secreta)},
            )
            await c.execute(text("INSERT INTO sitios_propiedades VALUES (:s, :p)"), {"s": sitio, "p": prop})
            habs = [
                await c.scalar(
                    text(
                        "INSERT INTO habitaciones (propiedad_id, nombre, tipo, capacidad, tarifa_centavos)"
                        " VALUES (:p, :n, 'Suite', 2, 100000) RETURNING id"
                    ),
                    {"p": prop, "n": f"Concurrencia web {marca} {i}"},
                )
                for i in range(2)
            ]
        llegada = hoy() + timedelta(days=40)

        def retener(cl, h, clave):
            cab = {"X-Frida-Clave": publica, "Idempotency-Key": clave}
            return cl.post("/api/v1/reservas", json=cuerpo(h), headers=cab)

        def cuerpo(h):
            return {
                "habitacion_id": str(h), "llegada": str(llegada), "salida": str(llegada + timedelta(days=2)),
                "huesped_nombre": "Carrera Web", "huesped_correo": "carrera@correo.mx",
            }  # fmt: skip

        async with AsyncClient(transport=ASGITransport(app=app), base_url="https://prueba") as cl:
            # 1) Muchas personas, mismas noches, claves distintas: entra UNA.
            r = await asyncio.gather(*(retener(cl, habs[0], str(uuid.uuid4())) for _ in range(SIMULTANEAS)))
            codigos = sorted(x.status_code for x in r)
            assert codigos == [201] + [409] * (SIMULTANEAS - 1), [x.text for x in r]

            # 2) Un reintento nervioso: la MISMA clave a la vez crea UNA reserva y
            #    todas reciben la misma respuesta (o "en proceso", reintentable).
            clave = str(uuid.uuid4())
            r = await asyncio.gather(*(retener(cl, habs[1], clave) for _ in range(MISMA_CLAVE)))
            buenas = [x.json() for x in r if x.status_code == 201]
            assert all(x.status_code in (201, 409) for x in r), [x.text for x in r]
            assert all(x.json()["codigo"] == "en_proceso" for x in r if x.status_code == 409)
            assert buenas and all(b == buenas[0] for b in buenas)

        async with duenio.begin() as c:
            n = await c.scalar(text("SELECT count(*) FROM reservas WHERE habitacion_id = :h"), {"h": habs[1]})
            assert n == 1
    finally:
        async with duenio.begin() as c:
            for sentencia in (
                "DELETE FROM outbox WHERE agregado_id IN (SELECT id FROM reservas WHERE sitio_id = :s)",
                "DELETE FROM reservas_eventos WHERE reserva_id IN"
                " (SELECT id FROM reservas WHERE sitio_id = :s)",
                "DELETE FROM reservas WHERE sitio_id = :s",
                "DELETE FROM claves_idempotencia WHERE sitio_id = :s",
                "DELETE FROM sitios WHERE nombre = :n",
                "DELETE FROM habitaciones WHERE nombre LIKE :h",
            ):
                await c.execute(
                    text(sentencia),
                    {"s": sitio, "n": f"Concurrencia {marca}", "h": f"Concurrencia web {marca}%"},
                )
        await duenio.dispose()
