"""Comandos de administración. Desde la raíz del repo:

    $DEV api uv run python -m app.cli crear-usuario --usuario ana --correo ana@hotel.mx \\
        --nombre "Ana Pech" --rol recepcion --propiedades chelem
    $DEV api uv run python -m app.cli sembrar-desarrollo      # solo con ENTORNO=desarrollo

La contraseña se pide por teclado (dos veces) o, en scripts, por la variable
CLAVE_NUEVA. Nunca va como argumento: quedaría en el historial de la terminal.
"""

import argparse
import getpass
import os
import re
import sys

from email_validator import EmailNotValidError, validate_email
from sqlalchemy import func, select, text

from app import contexto
from app.auth.alcance import Alcance, fijar_en_base_sincrona
from app.auth.claves import hasher, problema_de_clave
from app.config import obtener_config
from app.db import SesionSincrona
from app.modelos import Habitacion, Propiedad, Rol, Usuario
from app.servicios.auditoria import nueva

_USUARIO = re.compile(r"[a-z0-9][a-z0-9._-]{2,39}")


def _salir(mensaje: str) -> None:
    print(f"✗ {mensaje}", file=sys.stderr)
    raise SystemExit(1)


def crear_usuario(
    usuario: str, correo: str, nombre: str, rol: str, propiedades: list[str], clave: str
) -> None:
    usuario = usuario.strip().lower()
    if not _USUARIO.fullmatch(usuario):
        _salir("Usuario: 3 a 40 caracteres, minúsculas, números, punto, guion o guion bajo")
    try:
        correo = validate_email(correo.strip(), check_deliverability=False).normalized
    except EmailNotValidError as e:
        _salir(f"Correo inválido: {e}")
    nombre = " ".join(nombre.split())
    if not 2 <= len(nombre) <= 120:
        _salir("Nombre: de 2 a 120 caracteres")
    if problema := problema_de_clave(clave, usuario=usuario, correo=correo):
        _salir(problema)
    with SesionSincrona.begin() as s:
        rol_obj = s.execute(select(Rol).where(Rol.clave == rol)).scalar_one_or_none()
        if rol_obj is None or not rol_obj.es_personal:
            _salir(f"Rol inválido: {rol}")
        props = list(s.execute(select(Propiedad).where(Propiedad.clave.in_(propiedades))).scalars())
        if len(props) != len(set(propiedades)):
            _salir(f"Propiedad desconocida en: {', '.join(propiedades)}")
        existe = s.execute(
            select(Usuario.id).where((Usuario.usuario == usuario) | (Usuario.correo == correo))
        )
        if existe.first():
            _salir("Ya existe un usuario con ese usuario o correo")
        nuevo = Usuario(
            usuario=usuario, correo=correo, nombre=nombre, hash_clave=hasher.hash(clave), rol_id=rol_obj.id
        )
        nuevo.propiedades = props
        s.add(nuevo)
        s.flush()
        s.add(
            nueva(
                accion="usuario.alta",
                entidad="usuario",
                entidad_id=nuevo.id,
                despues={"usuario": usuario, "rol": rol, "propiedades": sorted(propiedades)},
            )
        )
    print(f"✓ {usuario} ({rol}) creado")


def _pedir_clave() -> str:
    if clave := os.environ.get("CLAVE_NUEVA"):
        return clave
    clave = getpass.getpass("Contraseña: ")
    if clave != getpass.getpass("Repítela: "):
        _salir("Las contraseñas no coinciden")
    return clave


# Solo desarrollo: cuentas para probar el panel (una con las dos propiedades y
# otra con una sola). El login las muestra solo en desarrollo.
CLAVE_DESARROLLO = "frida-panel-2026"


def sembrar_desarrollo() -> None:
    if not obtener_config().es_desarrollo:
        _salir("sembrar-desarrollo solo corre con ENTORNO=desarrollo")
    for usuario, correo, nombre, rol, props in [
        ("gerente", "gerente@hotelesfrida.mx", "Gerente General", "gerente", []),
        ("recepcion", "recepcion@hotelesfrida.mx", "Lucía Pech", "recepcion", ["chelem"]),
    ]:
        with SesionSincrona() as s:
            if s.execute(select(Usuario.id).where(Usuario.usuario == usuario)).first():
                print(f"· {usuario} ya existe")
                continue
        crear_usuario(usuario, correo, nombre, rol, props, CLAVE_DESARROLLO)
    _sembrar_habitaciones()
    _sembrar_reservas()
    _sembrar_pagos()


# Las del mock del panel (frontend/src/data/admin.js), repartidas entre las dos propiedades.
HABITACIONES_DESARROLLO = [
    ("chelem", "Suite Coral Grande", "Suite", 2, 320_000, "activa"),
    ("chelem", "Cabaña del Manglar", "Cabaña", 2, 210_000, "activa"),
    ("chuburna", "Suite Horizonte Azul", "Suite Premium", 2, 480_000, "mantenimiento"),
    ("chuburna", "Villa Chuburná Sunset", "Villa", 6, 390_000, "activa"),
    ("chelem", "Cabaña Brisa Marina", "Cabaña", 3, 240_000, "activa"),
    ("chuburna", "Suite Frida Clásica", "Suite", 2, 290_000, "activa"),
    ("chelem", "Estudio Palapa Norte", "Estudio", 2, 160_000, "activa"),
    ("chuburna", "Villa Flamingo Rosado", "Villa", 6, 420_000, "activa"),
    ("chelem", "Habitación Familiar Arena", "Familiar", 5, 260_000, "activa"),
    ("chuburna", "Suite Cenote Esmeralda", "Suite Premium", 2, 520_000, "mantenimiento"),
    ("chelem", "Cabaña Selva Profunda", "Cabaña", 3, 190_000, "activa"),
    ("chuburna", "Estudio Frida Clásico", "Estudio", 2, 145_000, "activa"),
]


def _sembrar_habitaciones() -> None:
    """Idempotente: solo crea las que faltan (por nombre); nunca borra ni pisa."""
    with SesionSincrona.begin() as s:
        fijar_en_base_sincrona(s, Alcance(None))  # la CLI ve todas las propiedades (RLS)
        props = {p.clave: p.id for p in s.execute(select(Propiedad)).scalars()}
        existentes = set(s.execute(select(Habitacion.nombre)).scalars())
        nuevas = [
            Habitacion(propiedad_id=props[c], nombre=n, tipo=t, capacidad=cap, tarifa_centavos=tar, estado=e)
            for c, n, t, cap, tar, e in HABITACIONES_DESARROLLO
            if n not in existentes
        ]
        s.add_all(nuevas)
    print(f"✓ {len(nuevas)} habitaciones de prueba creadas")


HUESPEDES_DESARROLLO = [
    "Ana Martínez",
    "Elena Castro",
    "Carlos Rodríguez",
    "Sofía Hernández",
    "Laura Jiménez",
    "Patricia López",
    "Miguel Torres",
    "Fernando Díaz",
    "Valeria Montoya",
    "Andrés Morales",
    "Isabella Reyes",
    "Roberto Sánchez",
    "Lucía Pech",
    "Diego Canul",
    "Mariana Chan",
    "Jorge Uc",
    "Paola Cetina",
    "Ricardo May",
    "Camila Poot",
]


def _sembrar_reservas() -> None:
    """Solo si no hay ninguna: reservas deterministas alrededor de hoy (pasadas,
    en curso y futuras), sin cruces, para ver la Línea de tiempo con datos."""
    import random
    from datetime import timedelta

    from sqlalchemy.dialects.postgresql import Range

    from app.modelos import Reserva
    from app.servicios.reservas import _codigo, hoy

    with SesionSincrona.begin() as s:
        fijar_en_base_sincrona(s, Alcance(None))
        if s.execute(select(Reserva.id).limit(1)).first():
            print("· ya hay reservas")
            return
        # Semilla fija: mismos datos de prueba en cada máquina (no es criptografía).
        azar, base, n = random.Random(20260925), hoy(), 0  # noqa: S311
        for h in s.execute(select(Habitacion).order_by(Habitacion.nombre)).scalars():
            if h.estado == "mantenimiento":
                s.add(
                    Reserva(
                        codigo=_codigo(),
                        propiedad_id=h.propiedad_id,
                        habitacion_id=h.id,
                        tipo="bloqueo",
                        estado="confirmada",
                        estancia=Range(base - timedelta(days=1), base + timedelta(days=2)),
                        notas="Mantenimiento",
                    )
                )
                continue
            dia = base - timedelta(days=21 + azar.randint(0, 3))
            while dia < base + timedelta(days=45):
                dia += timedelta(days=azar.randint(0, 2))
                noches = azar.randint(1, 5)
                salida = dia + timedelta(days=noches)
                estado = "completada" if salida <= base else "en_curso" if dia <= base else "confirmada"
                total = h.tarifa_centavos * noches
                pagado = total if estado != "confirmada" or azar.random() < 0.4 else 0
                s.add(
                    Reserva(
                        codigo=_codigo(),
                        propiedad_id=h.propiedad_id,
                        habitacion_id=h.id,
                        estado=estado,
                        estancia=Range(dia, salida),
                        adultos=min(2, h.capacidad),
                        huesped_nombre=azar.choice(HUESPEDES_DESARROLLO),
                        modalidad="completo",
                        tarifa_noche_centavos=h.tarifa_centavos,
                        total_centavos=total,
                        anticipo_centavos=total,
                        pagado_centavos=pagado,
                    )
                )
                n += 1
                dia = salida
        s.add(nueva(accion="desarrollo.sembrar_reservas", entidad="reserva", despues={"reservas": n}))
    print(f"✓ {n} reservas de prueba creadas")


def _sembrar_pagos() -> None:
    """Las reservas de prueba que dicen estar pagadas pero no tienen filas en
    `pagos` (la siembra vieja solo ponía `pagado_centavos`) reciben sus pagos:
    suman exactamente lo pagado, con fechas que nunca son futuras y formas
    variadas (de una vez, al llegar, al salir, en abonos) para que el detalle y
    la analítica de cobro tengan datos de verdad. Idempotente y determinista."""
    import random
    from datetime import UTC, datetime, time, timedelta
    from types import SimpleNamespace
    from zoneinfo import ZoneInfo

    from sqlalchemy import exists

    from app.modelos import Pago, Reserva
    from app.servicios.reservas import concepto_de, hoy, repartir

    merida, base = ZoneInfo("America/Merida"), hoy()
    ahora = datetime.now(UTC)
    with SesionSincrona.begin() as s:
        fijar_en_base_sincrona(s, Alcance(None))
        sin_pagos = s.scalars(
            select(Reserva)
            .where(
                Reserva.tipo == "reserva",
                Reserva.pagado_centavos > 0,
                ~exists().where(Pago.reserva_id == Reserva.id),
            )
            .order_by(Reserva.codigo)
        ).all()
        azar, n = random.Random(20261012), 0  # noqa: S311  # datos de prueba, no criptografía
        for r in sin_pagos:
            llegada, salida, pagado = r.llegada, r.salida, r.pagado_centavos
            dia = lambda d: datetime.combine(d, time(azar.randint(9, 19), azar.randint(0, 59)), tzinfo=merida)  # noqa: E731
            formas = ["de_una_vez", "al_llegar", "en_abonos"] + (["al_salir"] if salida <= base else [])
            forma = azar.choice(formas)
            if forma == "de_una_vez":
                pagos = [(dia(llegada - timedelta(days=azar.randint(0, 20))), pagado)]
            elif forma == "al_llegar":
                a, b = repartir(pagado, [3, 7])
                pagos = [(dia(llegada - timedelta(days=azar.randint(3, 15))), a), (dia(llegada), b)]
            elif forma == "al_salir":
                a, b = repartir(pagado, [3, 7])
                pagos = [(dia(llegada - timedelta(days=azar.randint(1, 10))), a), (dia(salida), b)]
            else:  # en abonos: uno por noche ya vivida
                noches = [
                    llegada + timedelta(days=i)
                    for i in range(r.noches)
                    if llegada + timedelta(days=i) <= base
                ]
                noches = noches or [llegada]
                pagos = list(zip([dia(d) for d in noches], repartir(pagado, [1] * len(noches)), strict=True))
            acumulado = 0
            for momento, monto in pagos:
                momento = min(momento, ahora - timedelta(minutes=5))  # nunca en el futuro
                if monto <= 0:
                    continue
                # La reserva tal como estaba en ese momento (para el concepto: anticipo, abono, saldo…).
                entonces = SimpleNamespace(
                    por_cobrar_centavos=r.total_centavos - acumulado,
                    pagado_centavos=acumulado,
                    modalidad=r.modalidad,
                    anticipo_centavos=r.anticipo_centavos,
                )
                s.add(
                    Pago(
                        reserva_id=r.id, propiedad_id=r.propiedad_id, concepto=concepto_de(entonces, monto),
                        metodo=azar.choice(["efectivo", "tarjeta", "transferencia"]), estado="cobrado",
                        monto_centavos=monto, creado=momento,
                    )
                )  # fmt: skip
                acumulado += monto
            n += 1
        if n:
            s.add(nueva(accion="desarrollo.sembrar_pagos", entidad="pago", despues={"reservas": n}))
    print(f"✓ pagos de prueba para {n} reservas" if n else "· todas las reservas pagadas ya tienen sus pagos")


def verificar_auditoria(desde: int) -> None:
    """Recorre TODA la cadena (sin el tope de 5 s de la API) y dice si está íntegra."""
    with SesionSincrona.begin() as s:
        s.execute(select(func.set_config("statement_timeout", "0", True)))
        fila = s.execute(text("SELECT * FROM auditoria_verificar(:d)"), {"d": desde}).one()
        resultado = {"desde": desde, "revisadas": fila.revisadas, "primera_rota": fila.primera_rota}
        s.add(nueva(accion="auditoria.verificar", entidad="auditoria", despues=resultado))
    if fila.primera_rota is None:
        print(f"✓ Cadena íntegra: {fila.revisadas} eslabones. Último hash: {fila.ultimo_hash}")
    else:
        _salir(f"Cadena ROTA en la secuencia {fila.primera_rota} (último hash bueno: {fila.ultimo_hash})")


def recalcular_metricas() -> None:
    """Llena o corrige `metricas_diarias` de toda la ventana (lo mismo que la tarea nocturna)."""
    from app.servicios import metricas

    with SesionSincrona.begin() as s:
        fijar_en_base_sincrona(s, Alcance(None))
        s.execute(select(func.set_config("statement_timeout", "0", True)))
        n = metricas.recalcular_todo(s)
        s.add(nueva(accion="metricas.recalcular", entidad="metricas", despues={"propiedades": n}))
    print(f"✓ Métricas recalculadas ({n} propiedades)")


def particiones() -> None:
    """Asegura las particiones mensuales de los próximos 24 meses (PLAN-BACKEND §9).
    Con el usuario de MIGRACIONES (la API no puede crear tablas). Idempotente:
    `deploy.sh` lo corre en cada despliegue, después de las migraciones."""
    from sqlalchemy import create_engine

    from app.config import obtener_config
    from app.migraciones import MESES_ADELANTE, PARTICIONADAS, crear_particiones
    from app.servicios.reservas import hoy

    c = obtener_config()
    motor = create_engine(c.url_migraciones())
    inicio = hoy().replace(day=1)
    meses = inicio.month - 1 + MESES_ADELANTE
    hasta = inicio.replace(year=inicio.year + meses // 12, month=meses % 12 + 1)
    try:
        crudo = motor.raw_connection()
        try:
            total = sum(
                crear_particiones(crudo.driver_connection, t, inicio, hasta, c.api_db_usuario)
                for t in PARTICIONADAS
            )
            crudo.commit()
        finally:
            crudo.close()
    finally:
        motor.dispose()
    print(f"✓ Particiones al día hasta {hasta:%Y-%m} ({total} nuevas)")


def main() -> None:
    contexto.abrir("cli")  # la auditoría de lo que haga la CLI dice que vino de aquí
    p = argparse.ArgumentParser(prog="python -m app.cli", description="Administración de Hoteles Frida")
    sub = p.add_subparsers(dest="comando", required=True)
    c = sub.add_parser("crear-usuario", help="Alta de una persona del personal")
    c.add_argument("--usuario", required=True)
    c.add_argument("--correo", required=True)
    c.add_argument("--nombre", required=True)
    c.add_argument("--rol", required=True, choices=["gerente", "recepcion", "restaurante"])
    c.add_argument(
        "--propiedades", default="", help="claves separadas por coma (chelem,chuburna); el gerente ve todas"
    )
    sub.add_parser("sembrar-desarrollo", help="Cuentas de prueba (solo desarrollo)")
    sub.add_parser("recalcular-metricas", help="Recalcula las métricas del tablero desde las reservas")
    sub.add_parser("particiones", help="Crea las particiones mensuales de los próximos 24 meses")
    v = sub.add_parser("verificar-auditoria", help="Comprueba la cadena de hashes de la auditoría")
    v.add_argument("--desde", type=int, default=1, help="secuencia desde la que verificar")
    args = p.parse_args()
    if args.comando == "crear-usuario":
        props = [x.strip() for x in args.propiedades.split(",") if x.strip()]
        crear_usuario(args.usuario, args.correo, args.nombre, args.rol, props, _pedir_clave())
    elif args.comando == "recalcular-metricas":
        recalcular_metricas()
    elif args.comando == "particiones":
        particiones()
    elif args.comando == "verificar-auditoria":
        verificar_auditoria(args.desde)
    else:
        sembrar_desarrollo()


if __name__ == "__main__":
    main()
