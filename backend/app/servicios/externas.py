"""Reservas de otras plataformas (PLAN-BACKEND §13). Sin FastAPI.

- `leer_ical` / `leer_csv`: puros, del texto a eventos. Se prueban sin base.
- `guardar`: síncrono (Celery; la ruta del CSV lo llama con `run_sync`).
  UNIQUE (canal, uid): releer actualiza. Del iCal, lo que desaparece del
  calendario (y aún no pasa) se marca cancelada.
- Choques: si una externa nueva o movida cae sobre una reserva propia activa de
  la misma habitación (o al revés, `choque_con_propia` desde el outbox), aviso
  al panel. No bloquea la venta: avisa.
"""

import csv
import hashlib
import io
import uuid
from dataclasses import dataclass
from datetime import date, datetime
from urllib.parse import urlsplit

from icalendar import Calendar
from sqlalchemy import exists, func, select, update
from sqlalchemy.dialects.postgresql import Range, insert
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.alcance import Alcance
from app.errores import Conflicto, NoEncontrado, ReglaDeNegocio
from app.modelos import Aviso, CalendarioExterno, Habitacion, Outbox, Reserva, ReservaExterna
from app.modelos.base import INCLUIR_ELIMINADOS
from app.modelos.reservas import ACTIVOS
from app.repositorios import habitaciones as repo_habitaciones
from app.servicios.auditoria import auditar
from app.servicios.reservas import hoy

MAX_BYTES = 2_000_000
# Desde cuántas reservas nuevas de fuera (en una lectura) se avisa al panel.
MINIMO_PARA_AVISAR = 1
MAX_EVENTOS = 5000


class ArchivoInvalido(ValueError):
    """Para la persona: qué tiene mal el archivo."""


@dataclass(frozen=True, slots=True)
class Evento:
    uid: str
    llegada: date
    salida: date
    titulo: str | None
    cancelada: bool = False


def _texto(v, largo: int) -> str | None:
    """Dato de fuera: texto plano, sin controles, recortado (§17.1)."""
    if v is None:
        return None
    limpio = "".join(c for c in str(v) if c.isprintable()).strip()
    return limpio[:largo] or None


def _fecha(v) -> date:
    return v.date() if isinstance(v, datetime) else v


def leer_ical(contenido: bytes) -> list[Evento]:
    try:
        cal = Calendar.from_ical(contenido)
    except ValueError as e:
        raise ArchivoInvalido("No es un calendario iCal válido") from e
    eventos = []
    for ev in cal.walk("VEVENT"):
        uid, inicio, fin = ev.get("UID"), ev.get("DTSTART"), ev.get("DTEND")
        if not uid or not inicio:
            continue
        llegada = _fecha(inicio.dt)
        salida = _fecha(fin.dt) if fin else llegada
        if salida <= llegada:  # un evento de un solo día ocupa esa noche
            salida = date.fromordinal(llegada.toordinal() + 1)
        cancelada = str(ev.get("STATUS", "")).upper() == "CANCELLED"
        eventos.append(Evento(_texto(uid, 255), llegada, salida, _texto(ev.get("SUMMARY"), 200), cancelada))
        if len(eventos) > MAX_EVENTOS:
            raise ArchivoInvalido(f"Más de {MAX_EVENTOS} eventos: no parece el calendario de una habitación")
    return eventos


# Columnas del CSV del Extranet de Booking.com (inglés o español; se compara en minúsculas).
_COLUMNAS = {
    "uid": ("book number", "reservation number", "número de reserva", "numero de reserva"),
    "llegada": ("check-in", "arrival", "entrada", "llegada"),
    "salida": ("check-out", "departure", "salida"),
    "titulo": ("guest name(s)", "guest name", "booked by", "nombre del cliente", "huésped", "reservado por"),
    "estado": ("status", "estado"),
}


def _dia(v: str) -> date:
    v = v.strip()[:10]
    for formato in ("%Y-%m-%d", "%d/%m/%Y", "%d-%m-%Y", "%m/%d/%Y"):
        try:
            return datetime.strptime(v, formato).date()
        except ValueError:
            continue
    raise ArchivoInvalido(f"Fecha que no se entiende: «{v}»")


def leer_csv(contenido: bytes) -> list[Evento]:
    try:
        texto = contenido.decode("utf-8-sig")
    except UnicodeDecodeError:
        texto = contenido.decode("latin-1")
    try:
        dialecto = csv.Sniffer().sniff(texto[:4096], delimiters=",;\t")
    except csv.Error:
        dialecto = csv.excel
    filas = csv.DictReader(io.StringIO(texto), dialect=dialecto)
    cabeceras = {(c or "").strip().lower(): c for c in filas.fieldnames or []}
    columna = {
        k: next((cabeceras[n] for n in nombres if n in cabeceras), None) for k, nombres in _COLUMNAS.items()
    }
    faltan = [k for k in ("uid", "llegada", "salida") if columna[k] is None]
    if faltan:
        raise ArchivoInvalido(
            "No encontramos las columnas de número de reserva, entrada y salida:"
            " ¿es el CSV de reservas de Booking?"
        )
    eventos = []
    for fila in filas:
        uid = _texto(fila.get(columna["uid"]), 255)
        if not uid:
            continue
        llegada, salida = _dia(fila[columna["llegada"]]), _dia(fila[columna["salida"]])
        if salida <= llegada:
            raise ArchivoInvalido(f"La reserva {uid} sale antes de llegar")
        estado = (fila.get(columna["estado"]) or "").lower() if columna["estado"] else ""
        titulo = _texto(fila.get(columna["titulo"]), 200) if columna["titulo"] else None
        eventos.append(Evento(uid, llegada, salida, titulo, "cancel" in estado))
        if len(eventos) > MAX_EVENTOS:
            raise ArchivoInvalido(f"Más de {MAX_EVENTOS} reservas en un archivo")
    return eventos


def _avisar_choque(sesion, propia: Reserva, canal: str, llegada: date, salida: date) -> None:
    sesion.execute(
        insert(Aviso)
        .values(
            evento_id=uuid.uuid7(),
            propiedad_id=propia.propiedad_id,
            permiso="reservas.ver",
            tipo="reserva",
            titulo="Posible doble venta",
            texto=(
                f"Una reserva de {canal.capitalize()} ({llegada:%d/%m} → {salida:%d/%m}) cae sobre "
                f"{propia.codigo} de {propia.huesped_nombre or 'un bloqueo'}. Revisa las dos plataformas."
            )[:300],
            destino=f"/admin/calendario?vista=linea&reserva={propia.id}",
        )
        .on_conflict_do_nothing(index_elements=["evento_id"])
    )


def _propias_que_chocan(sesion, habitacion_id, llegada: date, salida: date) -> list[Reserva]:
    return list(
        sesion.scalars(
            select(Reserva).where(
                Reserva.habitacion_id == habitacion_id,
                Reserva.estado.in_(ACTIVOS),
                Reserva.estancia.overlaps(Range(llegada, salida)),
            )
        )
    )


def huella(eventos: list[Evento]) -> str:
    """SHA-256 de las reservas (sin importar el orden): igual = nada que procesar."""
    filas = sorted(f"{e.uid}|{e.llegada}|{e.salida}|{e.titulo}|{e.cancelada}" for e in eventos)
    return hashlib.sha256("\n".join(filas).encode()).hexdigest()


def guardar(
    sesion, *, propiedad_id, habitacion_id, canal: str, origen: str, eventos: list[Evento], calendario_id=None
) -> dict:
    """Guarda los eventos y devuelve cuántos son nuevos, cambiaron o se cancelaron."""
    cuenta = {"nuevas": 0, "cambiadas": 0, "canceladas": 0, "choques": 0}
    vistos, para_avisar = [], []
    for ev in eventos:
        vistos.append(ev.uid)
        antes = sesion.scalar(
            select(ReservaExterna).where(ReservaExterna.canal == canal, ReservaExterna.uid_externo == ev.uid)
        )
        estado = "cancelada" if ev.cancelada else "vigente"
        rango = Range(ev.llegada, ev.salida)
        if antes is None:
            sesion.add(
                ReservaExterna(
                    propiedad_id=propiedad_id, habitacion_id=habitacion_id, canal=canal, uid_externo=ev.uid,
                    estancia=rango, titulo=ev.titulo, estado=estado, origen=origen,
                    calendario_id=calendario_id,
                )
            )  # fmt: skip
            cuenta["nuevas" if estado == "vigente" else "canceladas"] += 1
            cambio_de_fechas = estado == "vigente"
            if estado == "vigente" and ev.salida > hoy():
                para_avisar.append(ev)
        else:
            cambio_de_fechas = antes.estancia != rango or (antes.estado != estado and estado == "vigente")
            if cambio_de_fechas or antes.estado != estado or antes.titulo != ev.titulo:
                cuenta["canceladas" if estado == "cancelada" and antes.estado != estado else "cambiadas"] += 1
            antes.estancia, antes.titulo, antes.estado = rango, ev.titulo, estado
            antes.habitacion_id = habitacion_id or antes.habitacion_id
            antes.leida_en = func.now()
        if cambio_de_fechas and estado == "vigente" and habitacion_id:
            for propia in _propias_que_chocan(sesion, habitacion_id, ev.llegada, ev.salida):
                _avisar_choque(sesion, propia, canal, ev.llegada, ev.salida)
                cuenta["choques"] += 1
    if calendario_id is not None:
        # Lo que el iCal ya no trae (y aún no pasó) se canceló en esa plataforma.
        filtros = [
            ReservaExterna.calendario_id == calendario_id,
            ReservaExterna.estado == "vigente",
            func.upper(ReservaExterna.estancia) > hoy(),
        ]
        if vistos:
            filtros.append(ReservaExterna.uid_externo.not_in(vistos))
        r = sesion.execute(
            update(ReservaExterna).where(*filtros).values(estado="cancelada", leida_en=func.now())
        )
        cuenta["canceladas"] += r.rowcount
    if len(para_avisar) >= MINIMO_PARA_AVISAR:
        _avisar_nuevas(sesion, propiedad_id, habitacion_id, canal, origen, calendario_id, para_avisar)
    sesion.flush()
    return cuenta


def _avisar_nuevas(
    sesion, propiedad_id, habitacion_id, canal, origen, calendario_id, nuevas: list[Evento]
) -> None:
    """Reservas que llegaron de fuera de la app: un evento del outbox (el
    despachador lo vuelve aviso y lo empuja en vivo al panel). Uno por lectura,
    con todas las nuevas juntas."""
    nombre = (
        sesion.scalar(select(Habitacion.nombre).where(Habitacion.id == habitacion_id))
        if habitacion_id
        else None
    )
    nuevas = sorted(nuevas, key=lambda e: e.llegada)
    sesion.add(
        Outbox(
            tipo="externas.nuevas", agregado="externas", agregado_id=calendario_id or propiedad_id,
            propiedad_id=propiedad_id,
            datos={
                "canal": canal, "origen": origen, "habitacion_nombre": nombre, "nuevas": len(nuevas),
                "rangos": [[str(e.llegada), str(e.salida)] for e in nuevas[:5]],
            },
        )
    )  # fmt: skip


def choque_con_propia(sesion, e: Outbox) -> int:
    """Desde el despachador: una reserva propia nueva o movida que cae sobre una
    externa vigente de la misma habitación."""
    d = e.datos or {}
    if e.agregado != "reserva" or e.tipo not in ("reserva.creada", "reserva.movida"):
        return 0
    if d.get("estado") not in ACTIVOS or not d.get("habitacion_id"):
        return 0
    llegada, salida = date.fromisoformat(d["llegada"]), date.fromisoformat(d["salida"])
    externas = list(
        sesion.scalars(
            select(ReservaExterna).where(
                ReservaExterna.habitacion_id == uuid.UUID(d["habitacion_id"]),
                ReservaExterna.estado == "vigente",
                ReservaExterna.estancia.overlaps(Range(llegada, salida)),
            )
        )
    )
    if externas:
        propia = sesion.get(Reserva, e.agregado_id)
        for x in externas:
            _avisar_choque(sesion, propia, x.canal, x.llegada, x.salida)
    return len(externas)


# ── Panel (async). Alcance + RLS como todo lo que tiene propiedad. ──


def url_oculta(url: str) -> str:
    """La URL del iCal lleva el token de la plataforma: en el panel y en la
    auditoría solo el dominio y el final."""
    partes = urlsplit(url)
    return f"{partes.scheme}://{partes.hostname}/…{url[-6:]}"


def calendario_salida(c: CalendarioExterno) -> dict:
    return {
        "id": c.id, "propiedad_id": c.propiedad_id, "habitacion_id": c.habitacion_id, "canal": c.canal,
        "url": url_oculta(c.url), "activo": c.activo, "ultima_lectura": c.ultima_lectura,
        "ultimo_error": c.ultimo_error, "eventos": c.eventos, "creado": c.creado,
    }  # fmt: skip


def _externa(x: ReservaExterna, habitacion_nombre: str | None, choca: bool) -> dict:
    campos = ("id", "propiedad_id", "habitacion_id", "canal", "uid_externo", "llegada", "salida", "titulo")
    return {
        **{k: getattr(x, k) for k in campos},
        "habitacion_nombre": habitacion_nombre,
        "estado": x.estado,
        "origen": x.origen,
        "leida_en": x.leida_en,
        "choca": choca and x.estado == "vigente",
    }


async def listar_reservas(sesion: AsyncSession, alcance: Alcance, desde: date, hasta: date) -> list[dict]:
    """Las que tocan [desde, hasta), con su habitación y si chocan con una propia."""
    choca = exists().where(
        Reserva.habitacion_id == ReservaExterna.habitacion_id,
        Reserva.estado.in_(ACTIVOS),
        Reserva.estancia.overlaps(ReservaExterna.estancia),
    )
    filas = await sesion.execute(
        select(ReservaExterna, Habitacion.nombre, choca.label("choca"))
        .outerjoin(Habitacion, Habitacion.id == ReservaExterna.habitacion_id)
        .where(
            alcance.filtro(ReservaExterna.propiedad_id), ReservaExterna.estancia.overlaps(Range(desde, hasta))
        )
        .order_by(func.lower(ReservaExterna.estancia), ReservaExterna.id)
        .limit(2000)
        .execution_options(**{INCLUIR_ELIMINADOS: True})
    )
    return [_externa(x, nombre, bool(choca)) for x, nombre, choca in filas.all()]


async def listar_calendarios(sesion: AsyncSession, alcance: Alcance) -> list[CalendarioExterno]:
    consulta = (
        select(CalendarioExterno)
        .where(alcance.filtro(CalendarioExterno.propiedad_id))
        .order_by(CalendarioExterno.creado, CalendarioExterno.id)
    )
    return list(await sesion.scalars(consulta))


async def crear_calendario(sesion: AsyncSession, actor, alcance: Alcance, datos) -> CalendarioExterno:
    h = await repo_habitaciones.por_id(sesion, alcance, datos.habitacion_id)
    if h is None:
        raise NoEncontrado("Esa habitación no existe")
    c = CalendarioExterno(
        propiedad_id=h.propiedad_id, habitacion_id=h.id, canal=datos.canal, url=datos.url, creado_por=actor.id
    )
    try:
        async with sesion.begin_nested():
            sesion.add(c)
            await sesion.flush()
    except IntegrityError as e:
        raise Conflicto(
            f"«{h.nombre}» ya tiene un calendario de {datos.canal.capitalize()}", codigo="duplicado"
        ) from e
    await auditar(
        sesion, accion="calendario_externo.crear", entidad="calendario_externo", entidad_id=c.id,
        despues={"habitacion_id": str(h.id), "canal": c.canal, "url": url_oculta(c.url)},
    )  # fmt: skip
    return c


async def borrar_calendario(sesion: AsyncSession, actor, alcance: Alcance, calendario_id) -> None:
    """Se deja de leer; las reservas que trajo se quedan (sin calendario) como historia."""
    c = await sesion.scalar(
        select(CalendarioExterno).where(
            CalendarioExterno.id == calendario_id, alcance.filtro(CalendarioExterno.propiedad_id)
        )
    )
    if c is None:
        raise NoEncontrado("Ese calendario no existe")
    antes = {"habitacion_id": str(c.habitacion_id), "canal": c.canal, "url": url_oculta(c.url)}
    await sesion.delete(c)
    await sesion.flush()
    await auditar(
        sesion, accion="calendario_externo.borrar", entidad="calendario_externo", entidad_id=calendario_id,
        antes=antes,
    )  # fmt: skip


async def importar_csv(
    sesion: AsyncSession, actor, alcance: Alcance, propiedad_id, canal: str, contenido: bytes
):
    if not alcance.permite(propiedad_id):
        raise NoEncontrado("Esa propiedad no existe")
    if len(contenido) > MAX_BYTES:
        raise ReglaDeNegocio("El archivo pesa más de 2 MB", codigo="archivo")
    try:
        eventos = leer_csv(contenido)
    except ArchivoInvalido as e:
        raise ReglaDeNegocio(str(e), codigo="archivo") from e
    cuenta = await sesion.run_sync(
        lambda s: guardar(
            s, propiedad_id=propiedad_id, habitacion_id=None, canal=canal, origen="csv", eventos=eventos
        )
    )
    await auditar(
        sesion, accion="externas.importar_csv", entidad="propiedad", entidad_id=propiedad_id,
        despues={"canal": canal, "filas": len(eventos), "bytes": len(contenido), **cuenta},
    )  # fmt: skip
    return {"filas": len(eventos), **cuenta}
