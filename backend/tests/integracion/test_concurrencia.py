"""Cero sobreventa con concurrencia REAL (PLAN-BACKEND §6.2): N conexiones
reservan las mismas noches a la vez y exactamente UNA entra. Con conexiones de
verdad (no la sesión revertida de las demás pruebas), así que limpia al final."""

import asyncio
import uuid
from datetime import timedelta

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine

from app.auth.alcance import TODAS, Alcance
from app.auth.dependencias import Actor
from app.config import obtener_config
from app.db import motor
from app.errores import Conflicto
from app.esquemas.reservas import ReservaNueva
from app.servicios import reservas
from app.servicios.reservas import hoy

INTENTOS = 12


async def test_n_reservas_simultaneas_de_la_misma_noche_entra_una():
    duenio = create_async_engine(obtener_config().url_migraciones())  # para preparar y limpiar
    usuario_id = uuid.uuid7()
    try:
        async with duenio.begin() as c:
            prop = await c.scalar(text("SELECT id FROM propiedades WHERE clave = 'chelem'"))
            rol = await c.scalar(text("SELECT id FROM roles WHERE clave = 'gerente'"))
            await c.execute(
                text(
                    "INSERT INTO usuarios (id, usuario, correo, nombre, rol_id)"
                    " VALUES (:i, :u, :c, 'Concurrencia', :r)"
                ),
                {
                    "i": usuario_id,
                    "u": f"conc-{usuario_id.hex[:8]}",
                    "c": f"{usuario_id.hex[:8]}@prueba.mx",
                    "r": rol,
                },
            )
            hab = await c.scalar(
                text(
                    "INSERT INTO habitaciones (propiedad_id, nombre, tipo, capacidad, tarifa_centavos)"
                    " VALUES (:p, :n, 'Suite', 2, 100000) RETURNING id"
                ),
                {"p": prop, "n": f"Concurrencia {usuario_id.hex[:8]}"},
            )
        actor = Actor(
            id=usuario_id,
            sid=uuid.uuid7(),
            rol="gerente",
            permisos=frozenset({"reservas.crear"}),
            propiedades=frozenset(),
            todas_las_propiedades=True,
        )
        datos = ReservaNueva(
            habitacion_id=hab,
            llegada=hoy() + timedelta(days=30),
            salida=hoy() + timedelta(days=33),
            adultos=2,
            huesped_nombre="Carrera",
        )
        salida = asyncio.Event()

        async def intento():
            async with AsyncSession(motor, expire_on_commit=False) as s, s.begin():
                await s.execute(text("SELECT set_config('app.propiedades', :v, true)"), {"v": TODAS})
                await salida.wait()  # todas arrancan juntas
                try:
                    await reservas.crear(s, actor, Alcance(None), datos)
                    return "entró"
                except Conflicto as e:
                    assert e.detalle["codigo"] == "sin_disponibilidad"
                    return "rechazada"

        tareas = [asyncio.create_task(intento()) for _ in range(INTENTOS)]
        await asyncio.sleep(0.2)
        salida.set()
        resultados = await asyncio.gather(*tareas)
        assert resultados.count("entró") == 1 and resultados.count("rechazada") == INTENTOS - 1
    finally:
        async with duenio.begin() as c:  # el dueño no está sujeto a RLS
            for sentencia in (
                "DELETE FROM outbox WHERE agregado_id IN (SELECT id FROM reservas WHERE creada_por = :u)",
                "DELETE FROM reservas_eventos WHERE usuario_id = :u",
                "DELETE FROM reservas WHERE creada_por = :u",
                "DELETE FROM habitaciones WHERE nombre = :n",
                "DELETE FROM usuarios WHERE id = :u",
            ):
                await c.execute(text(sentencia), {"u": usuario_id, "n": f"Concurrencia {usuario_id.hex[:8]}"})
        await duenio.dispose()
