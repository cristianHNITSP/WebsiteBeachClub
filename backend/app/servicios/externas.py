"""Reservas de otras plataformas (PLAN-BACKEND §13). Sin FastAPI.

- `leer_ical` / `leer_csv`: puros, del texto a eventos. Se prueban sin base.
- `guardar`: síncrono (Celery; la ruta del CSV lo llama con `run_sync`).
  UNIQUE (canal, uid): releer actualiza. Del iCal, lo que desaparece del
  calendario (y aún no pasa) se marca cancelada.
- Cuelgan de una PUBLICACIÓN de una ficha (lo que la plataforma muestra, a su manera),
  no de una habitación del motor: plataformas y motor van separados, no son espejo.
"""

import csv
import hashlib
import io
from dataclasses import dataclass
from datetime import date, datetime
from urllib.parse import urlsplit

from icalendar import Calendar
from sqlalchemy import func, select, update
from sqlalchemy.dialects.postgresql import Range
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.auth.alcance import Alcance
from app.errores import Conflicto, NoEncontrado, ReglaDeNegocio
from app.modelos import (
    CalendarioExterno,
    FichaExterna,
    Habitacion,
    Outbox,
    Reserva,
    ReservaEvento,
    ReservaExterna,
)
from app.modelos.base import INCLUIR_ELIMINADOS
from app.modelos.reservas import ACTIVOS
from app.servicios.auditoria import auditar
from app.servicios.auditoria import nueva as nueva_auditoria
from app.servicios.reservas import _codigo, _foto, hoy

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


def huella(eventos: list[Evento]) -> str:
    """SHA-256 de las reservas (sin importar el orden): igual = nada que procesar."""
    filas = sorted(f"{e.uid}|{e.llegada}|{e.salida}|{e.titulo}|{e.cancelada}" for e in eventos)
    return hashlib.sha256("\n".join(filas).encode()).hexdigest()


def guardar(
    sesion,
    *,
    propiedad_id,
    canal: str,
    origen: str,
    eventos: list[Evento],
    calendario_id=None,
    publicacion=None,
) -> dict:
    """Guarda los eventos y devuelve cuántos son nuevos, cambiaron o se cancelaron."""
    cuenta = {"nuevas": 0, "cambiadas": 0, "canceladas": 0}
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
                    propiedad_id=propiedad_id, canal=canal, uid_externo=ev.uid,
                    estancia=rango, titulo=ev.titulo, estado=estado, origen=origen,
                    calendario_id=calendario_id,
                )
            )  # fmt: skip
            cuenta["nuevas" if estado == "vigente" else "canceladas"] += 1
            if estado == "vigente" and ev.salida > hoy():
                para_avisar.append(ev)
        else:
            if antes.estancia != rango or antes.estado != estado or antes.titulo != ev.titulo:
                cuenta["canceladas" if estado == "cancelada" and antes.estado != estado else "cambiadas"] += 1
            antes.estancia, antes.titulo, antes.estado = rango, ev.titulo, estado
            antes.leida_en = func.now()
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
        _avisar_nuevas(sesion, propiedad_id, publicacion, canal, origen, calendario_id, para_avisar)
    sesion.flush()
    reflejar_en_calendario(sesion, propiedad_id)
    return cuenta


# ── Lo de fuera, dentro del calendario del motor (migración 0024) ──
# La Línea de tiempo muestra estas reservas con su fuente. La plataforma es la dueña del dato:
# aquí no se editan, no se mueven ni se cobran; solo se marca su llegada y su salida, o se
# cancelan (y entonces ya no vuelven a salir, aunque el iCal las siga trayendo).


def _cuarto_libre(sesion, propiedad_id, rango: Range) -> Habitacion | None:
    """La primera habitación VENDIDA EN LÍNEA sin reservas activas en esas noches."""
    ocupadas = select(Reserva.habitacion_id).where(
        Reserva.estado.in_(ACTIVOS), Reserva.estancia.overlaps(rango)
    )
    return sesion.scalars(
        select(Habitacion)
        .where(
            Habitacion.propiedad_id == propiedad_id, Habitacion.venta_en_linea, Habitacion.estado == "activa",
            Habitacion.id.not_in(ocupadas),
        )
        .order_by(Habitacion.nombre)
        .limit(1)
    ).first()  # fmt: skip


def _historial(
    sesion, r: Reserva, tipo: str, de: str | None, antes: dict | None, aviso: str, motivo: str
) -> None:
    """Historial + auditoría + outbox, como cualquier cambio (sin persona: `por` es None)."""
    despues = _foto(r)
    sesion.add(
        ReservaEvento(
            reserva_id=r.id, propiedad_id=r.propiedad_id, tipo=tipo, de_estado=de, a_estado=r.estado,
            detalle={"motivo": motivo},
        )
    )  # fmt: skip
    sesion.add(
        nueva_auditoria(
            accion=f"reserva.{tipo}", entidad="reserva", entidad_id=r.id, antes=antes,
            despues={**despues, "fuente": r.fuente},
        )
    )  # fmt: skip
    sesion.add(
        Outbox(
            tipo=aviso, agregado="reserva", agregado_id=r.id, propiedad_id=r.propiedad_id,
            datos={**despues, "detalle": {"motivo": motivo}, "de": de, "por": None},
        )
    )  # fmt: skip


def reflejar_en_calendario(sesion, propiedad_id) -> dict:
    """Pone en `reservas` lo que las plataformas ya vendieron y lo mantiene al día.

    - Nueva y vigente: se le asigna una habitación vendida en línea y libre. Sin cuarto libre
      queda sin asignar y se avisa (es doble venta o falta marcar habitaciones en línea).
    - Cancelada en la plataforma: se cancela aquí (si aún no hay llegada).
    - Cambió de fechas: se sigue; si ya no cabe en su cuarto, se avisa y queda como estaba.
    - Ya cancelada por la recepción: no se toca ni se vuelve a crear.
    Idempotente: se llama tras cada lectura."""
    cuenta = {"creadas": 0, "movidas": 0, "canceladas": 0, "sin_cuarto": 0}
    problemas: list[dict] = []
    externas = sesion.scalars(
        select(ReservaExterna)
        .where(ReservaExterna.propiedad_id == propiedad_id, func.upper(ReservaExterna.estancia) > hoy())
        .order_by(func.lower(ReservaExterna.estancia), ReservaExterna.id)
    ).all()
    for x in externas:
        r = sesion.scalars(
            select(Reserva)
            .where(Reserva.externa_id == x.id)
            .options(selectinload(Reserva.habitacion))
            .execution_options(**{INCLUIR_ELIMINADOS: True})
        ).first()
        if r is None:
            if x.estado != "vigente":
                continue
            h = _cuarto_libre(sesion, propiedad_id, x.estancia)
            nueva = None
            if h is not None:
                nueva = Reserva(
                    codigo=_codigo(), propiedad_id=propiedad_id, habitacion_id=h.id, tipo="reserva",
                    estado="confirmada", estancia=x.estancia, adultos=1, modalidad="completo",
                    huesped_nombre=x.titulo or f"Reserva de {x.canal}", fuente=x.canal, externa_id=x.id,
                    notas=f"Viene de {x.canal}. Los cambios y los cobros se hacen en esa plataforma.",
                )  # fmt: skip
                try:
                    with sesion.begin_nested():  # una carrera por el cuarto no tumba la lectura
                        sesion.add(nueva)
                        sesion.flush()
                except IntegrityError:
                    nueva = None
            if nueva is None:
                cuenta["sin_cuarto"] += 1
                problemas.append({"canal": x.canal, "llegada": str(x.llegada), "salida": str(x.salida)})
                continue
            nueva.habitacion = h  # viewonly: solo para la foto del historial
            _historial(sesion, nueva, "crear", None, None, "reserva.creada", f"Detectada en {x.canal}")
            cuenta["creadas"] += 1
        elif r.estado == "confirmada":
            antes, de = _foto(r), r.estado
            if x.estado == "cancelada":
                r.estado, r.motivo_cancelacion = "cancelada", f"Cancelada en {x.canal}"
                sesion.flush()
                _historial(sesion, r, "cancelar", de, antes, "reserva.cancelada", r.motivo_cancelacion)
                cuenta["canceladas"] += 1
            elif r.estancia != x.estancia:
                try:
                    with sesion.begin_nested():
                        r.estancia = x.estancia
                        sesion.flush()
                except IntegrityError:
                    sesion.refresh(r)  # no cabe en su cuarto: se queda y se avisa
                    problemas.append({"canal": x.canal, "llegada": str(x.llegada), "salida": str(x.salida)})
                    cuenta["sin_cuarto"] += 1
                    continue
                _historial(sesion, r, "mover", de, antes, "reserva.movida", f"Cambió en {x.canal}")
                cuenta["movidas"] += 1
    if problemas:
        sesion.add(
            Outbox(
                tipo="externas.sin_cuarto", agregado="externas", agregado_id=propiedad_id,
                propiedad_id=propiedad_id, datos={"n": len(problemas), "rangos": problemas[:5]},
            )
        )  # fmt: skip
    sesion.flush()
    return cuenta


def _avisar_nuevas(
    sesion, propiedad_id, publicacion, canal, origen, calendario_id, nuevas: list[Evento]
) -> None:
    """Reservas que llegaron de fuera de la app: un evento del outbox (el
    despachador lo vuelve aviso y lo empuja en vivo al panel). Uno por lectura,
    con todas las nuevas juntas."""
    nuevas = sorted(nuevas, key=lambda e: e.llegada)
    sesion.add(
        Outbox(
            tipo="externas.nuevas", agregado="externas", agregado_id=calendario_id or propiedad_id,
            propiedad_id=propiedad_id,
            datos={
                "canal": canal, "origen": origen, "publicacion": publicacion, "nuevas": len(nuevas),
                "rangos": [[str(e.llegada), str(e.salida)] for e in nuevas[:5]],
            },
        )
    )  # fmt: skip


# ── Panel (async). Alcance + RLS como todo lo que tiene propiedad. ──


def url_oculta(url: str) -> str:
    """La URL del iCal lleva el token de la plataforma: en el panel y en la
    auditoría solo el dominio y el final."""
    partes = urlsplit(url)
    return f"{partes.scheme}://{partes.hostname}/…{url[-6:]}"


def calendario_salida(c: CalendarioExterno) -> dict:
    return {
        "id": c.id, "propiedad_id": c.propiedad_id, "ficha_id": c.ficha_id, "publicacion": c.publicacion,
        "canal": c.canal,
        "url": url_oculta(c.url), "activo": c.activo, "ultima_lectura": c.ultima_lectura,
        "ultimo_error": c.ultimo_error, "eventos": c.eventos, "creado": c.creado,
    }  # fmt: skip


def _externa(x: ReservaExterna, ficha_id, publicacion: str | None) -> dict:
    campos = ("id", "propiedad_id", "canal", "uid_externo", "llegada", "salida", "titulo")
    return {
        **{k: getattr(x, k) for k in campos},
        "ficha_id": ficha_id,
        "publicacion": publicacion,
        "estado": x.estado,
        "origen": x.origen,
        "leida_en": x.leida_en,
    }


async def listar_reservas(sesion: AsyncSession, alcance: Alcance, desde: date, hasta: date) -> list[dict]:
    """Las que tocan [desde, hasta), con la publicación de la plataforma a la que pertenecen."""
    filas = await sesion.execute(
        select(ReservaExterna, CalendarioExterno.ficha_id, CalendarioExterno.publicacion)
        .outerjoin(CalendarioExterno, CalendarioExterno.id == ReservaExterna.calendario_id)
        .where(
            alcance.filtro(ReservaExterna.propiedad_id), ReservaExterna.estancia.overlaps(Range(desde, hasta))
        )
        .order_by(func.lower(ReservaExterna.estancia), ReservaExterna.id)
        .limit(2000)
    )
    return [_externa(x, ficha_id, publicacion) for x, ficha_id, publicacion in filas.all()]


async def listar_calendarios(sesion: AsyncSession, alcance: Alcance) -> list[CalendarioExterno]:
    consulta = (
        select(CalendarioExterno)
        .where(alcance.filtro(CalendarioExterno.propiedad_id))
        .order_by(CalendarioExterno.creado, CalendarioExterno.id)
    )
    return list(await sesion.scalars(consulta))


def etiqueta_de_publicacion(c: dict) -> str:
    """Cómo se llama un tipo publicado: su nombre y sus datos, tal como la plataforma lo muestra."""
    datos = [
        c.get("m2") and f"{c['m2']} m²",
        c.get("camas"),
        c.get("capacidad_maxima") and f"hasta {c['capacidad_maxima']} personas",
    ]
    texto = ", ".join(str(d) for d in datos if d)
    return (f"{c['nombre']}, {texto}" if texto else c["nombre"])[:200]


async def crear_calendario(sesion: AsyncSession, actor, alcance: Alcance, datos) -> CalendarioExterno:
    f = await sesion.get(FichaExterna, datos.ficha_id)
    if f is None or not alcance.permite(f.propiedad_id):
        raise NoEncontrado("Esa ficha no existe")
    if not 0 <= datos.indice < len(f.cuartos):
        raise ReglaDeNegocio("Esa publicación ya no está en la ficha: vuelve a leerla", codigo="publicacion")
    publicacion = etiqueta_de_publicacion(f.cuartos[datos.indice])
    c = CalendarioExterno(
        propiedad_id=f.propiedad_id, ficha_id=f.id, publicacion=publicacion, canal=f.canal, url=datos.url,
        creado_por=actor.id,
    )  # fmt: skip
    try:
        async with sesion.begin_nested():
            sesion.add(c)
            await sesion.flush()
    except IntegrityError as e:
        raise Conflicto(f"«{publicacion}» ya tiene un calendario conectado", codigo="duplicado") from e
    await auditar(
        sesion, accion="calendario_externo.crear", entidad="calendario_externo", entidad_id=c.id,
        despues={
            "ficha_id": str(f.id), "publicacion": publicacion, "canal": c.canal, "url": url_oculta(c.url),
        },
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
    antes = {"publicacion": c.publicacion, "canal": c.canal, "url": url_oculta(c.url)}
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
        lambda s: guardar(s, propiedad_id=propiedad_id, canal=canal, origen="csv", eventos=eventos)
    )
    await auditar(
        sesion, accion="externas.importar_csv", entidad="propiedad", entidad_id=propiedad_id,
        despues={"canal": canal, "filas": len(eventos), "bytes": len(contenido), **cuenta},
    )  # fmt: skip
    return {"filas": len(eventos), **cuenta}
