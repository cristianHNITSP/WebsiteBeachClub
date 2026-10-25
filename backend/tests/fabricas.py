"""Datos de prueba: cada prueba crea los suyos (BACKEND-COMO-TRABAJAMOS §4.2)."""

import itertools

from sqlalchemy import select

from app.auth.claves import hasher
from app.modelos import Propiedad, Rol, Usuario

CLAVE = "clave-de-prueba-larga"
_n = itertools.count(1)
_hash_cache: dict[str, str] = {}


def _hash(clave: str) -> str:
    # Argon2 es lento a propósito; en las pruebas se calcula una vez por clave.
    if clave not in _hash_cache:
        _hash_cache[clave] = hasher.hash(clave)
    return _hash_cache[clave]


async def crear_usuario(
    sesion, *, rol="gerente", propiedades=(), clave=CLAVE, activo=True, usuario=None
) -> Usuario:
    n = next(_n)
    rol_obj = (await sesion.execute(select(Rol).where(Rol.clave == rol))).scalar_one()
    props = list((await sesion.execute(select(Propiedad).where(Propiedad.clave.in_(propiedades)))).scalars())
    u = Usuario(
        usuario=usuario or f"persona{n}",
        correo=f"persona{n}@prueba.mx",
        nombre=f"Persona {n}",
        hash_clave=_hash(clave),
        rol_id=rol_obj.id,
        activo=activo,
    )
    u.propiedades = props
    sesion.add(u)
    await sesion.flush()
    return u


async def propiedad(sesion, clave: str) -> Propiedad:
    return (await sesion.execute(select(Propiedad).where(Propiedad.clave == clave))).scalar_one()


async def abrir_alcance(sesion) -> None:
    """Las fábricas escriben directo en tablas con RLS: ven todas las propiedades."""
    from sqlalchemy import func

    await sesion.execute(select(func.set_config("app.propiedades", "*", True)))


async def crear_habitacion(sesion, propiedad_clave="chelem", **campos):
    from app.modelos import Habitacion

    await abrir_alcance(sesion)
    p = await propiedad(sesion, propiedad_clave)
    h = Habitacion(
        **(
            {
                "propiedad_id": p.id,
                "nombre": f"Hab {next(_n)}",
                "tipo": "Suite",
                "capacidad": 2,
                "tarifa_centavos": 100_000,
            }
            | campos
        )
    )
    sesion.add(h)
    await sesion.flush()
    return h
