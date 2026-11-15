# ruff: noqa: E501
"""Las fichas del hotel en otras plataformas (PLAN-BACKEND §13.1).

El personal no sincroniza nada: el hotel da UNA vez la URL de su propia ficha y el
bot la lee cada día con cortesía (robots.txt, un pedido a la vez, User-Agent con
contacto; si la plataforma pide verificación anti-robot, se detiene y lo dice:
NO se salta). De la ficha sale el catálogo de habitaciones que publica; el
panel las muestra TAL COMO cada plataforma las publica (cada una a su manera y solo lo que vende en línea:
no son espejo del inventario del motor, no se importan). Todo lo de fuera es dato NO confiable: texto
plano recortado, nunca HTML.

`extraer_cuartos` trabaja sobre el TEXTO de la página (no sobre selectores CSS que
la plataforma cambia sin avisar) y se prueba con el texto real de una ficha.
"""

import re
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

from selectolax.lexbor import LexborHTMLParser
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.alcance import Alcance
from app.errores import Conflicto, NoEncontrado
from app.modelos import FichaExterna
from app.servicios.auditoria import auditar

# Las que el hotel dio (2026-11-05). `fichas-iniciales` las da de alta por nombre de propiedad.
ENLACES_INICIALES: dict[str, list[tuple[str, str]]] = {
    "Cabañas Frida": [
        ("booking", "https://www.booking.com/hotel/mx/cabanas-frida.es-mx.html"),
        ("expedia", "https://www.hoteles.com/ho1426878560/cabanas-frida-merida-mexico/"),
        ("expedia", "https://www.expedia.mx/Merida-Hoteles-CABANAS-FRIDA.h44558705.Informacion-Hotel"),
        ("otro", "https://www.facebook.com/cabanasfridachelem/"),
        (
            "otro",
            "https://www.google.com/maps/dir/21.2981975,-89.6335872/Caba%C3%B1as+%22Frida%22,+Calle+19,+C.+100+%26,+97336+Chelem,+Yuc./@21.2828602,-89.7640586,12z/data=!3m1!4b1!4m9!4m8!1m1!4e1!1m5!1m1!1s0x8f55e730724e4343:0xf4700fef73f7d3ea!2m2!1d-89.7312971!2d21.2723605",
        ),
    ],
    "Casa Frida": [
        ("booking", "https://www.booking.com/hotel/mx/casa-frida-chelem.es-mx.html"),
        ("expedia", "https://www.hoteles.com/ho2906913664/casa-frida-merida-mexico/"),
        ("otro", "https://www.kayak.com.mx/Chelem-Hoteles-Casa-Frida.9551093.ksp"),
        (
            "otro",
            "https://www.google.com/maps/dir/21.2981975,-89.6335872/Casa+Frida,+Calle+21+S%2FN+entre+152+y+154+frente+calle+Maeva+Entre+Chelem+y+Chuburna,+97336+Chelem,+Yuc./@21.2808102,-89.7797564,12z/data=!3m1!4b1!4m9!4m8!1m1!4e1!1m5!1m1!1s0x8f55e7572cb02641:0x1b3dd022242dec7f!2m2!1d-89.7627841!2d21.263463",
        ),
    ],
}

# Lo que el hotel copió a mano de cada ficha (2026-11-05), con el nombre y el formato de CADA plataforma
# (no son las habitaciones del motor). Cuando el bot lee la ficha, su lectura lo reemplaza; si la plataforma lo bloquea, esto se queda.
CUARTOS_COPIADOS: dict[str, list[dict]] = {
    # Cabañas Frida no numera sus habitaciones: vende DOS tipos (Booking los llama "Estándar - Cama
    # extragrande" y "Doble - 2 camas"; Hoteles.com y Expedia, "Cabaña estándar" de 20 m² con 1 cama King
    # y con 2 camas Queen). Máximos de personas y m² de esas fichas; el resto no se inventa.
    # Hoteles.com y Expedia (mismo grupo) lo muestran a su manera: "Cabaña estándar" ×2 (20 m², 4 personas
    # con 2 camas Queen; 2 personas con 1 cama King).
    "https://www.hoteles.com/ho1426878560/cabanas-frida-merida-mexico/": [
        {
            "nombre": "Cabaña estándar", "m2": 20, "camas": "2 camas Queen", "capacidad_maxima": 4,
            "descripcion": None, "servicios": [], "vistas": [],
        },
        {
            "nombre": "Cabaña estándar", "m2": 20, "camas": "1 cama King", "capacidad_maxima": 2,
            "descripcion": None, "servicios": [], "vistas": [],
        },
    ],
    # Casa Frida en Hoteles.com: dos publicaciones de 40 m² y 4 personas con 2 camas Queen. (Booking
    # dice 22 m² para su Habitación Doble: cada plataforma describe a su manera.)
    "https://www.hoteles.com/ho2906913664/casa-frida-merida-mexico/": [
        {
            "nombre": "Habitación doble estándar", "m2": 40, "camas": "2 camas Queen", "capacidad_maxima": 4,
            "descripcion": None, "servicios": [], "vistas": [],
        },
        {
            "nombre": "Cabaña estándar", "m2": 40, "camas": "2 camas Queen", "capacidad_maxima": 4,
            "descripcion": None, "servicios": [], "vistas": [],
        },
    ],
    "https://www.booking.com/hotel/mx/cabanas-frida.es-mx.html": [
        {
            "nombre": "Habitación Estándar - Cama extragrande", "m2": 20, "camas": "1 cama King size",
            "capacidad_maxima": 3, "descripcion": None, "servicios": [], "vistas": [],
        },
        {
            "nombre": "Habitación Doble - 2 camas", "m2": 20, "camas": "2 camas matrimoniales",
            "capacidad_maxima": 4, "descripcion": None, "servicios": [], "vistas": [],
        },
    ],
    "https://www.booking.com/hotel/mx/casa-frida-chelem.es-mx.html": [
        {
            "nombre": "Habitación Doble - 2 camas", "m2": 22, "camas": "2 camas matrimoniales", "capacidad_maxima": 4,
            "descripcion": "Guests can make meals in the fully equipped kitchenette that has a refrigerator, kitchenware and a microwave. The twin room features air conditioning, a coffee machine, a terrace with pool views as well as a private bathroom boasting a shower. The unit has 2 beds.",
            "servicios": [
                "Terraza", "Aire acondicionado", "Caja de seguridad", "TV", "Refrigerador", "Mosquitero", "Cafetera",
                "Habitaciones comunicadas disponibles", "Microondas", "TV de pantalla plana", "Utensilios de cocina",
                "Cocineta", "Ventilador", "Perchero",
            ],
            "vistas": ["Vista a la alberca"],
        }
    ],
}  # fmt: skip

# Parámetros que solo rastrean o traen el desafío anti-robot de quien copió el enlace.
_RASTREO = {"chal_t", "force_referer", "challengereferer", "g_ep", "entry", "aid", "label", "sid", "src"}


def limpiar_url(url: str) -> str:
    p = urlsplit(url.strip())
    q = [(k, v) for k, v in parse_qsl(p.query, keep_blank_values=True) if k.lower() not in _RASTREO]
    return urlunsplit((p.scheme, p.netloc, p.path, urlencode(q), ""))


# ── Extraer (puro: se prueba sin red) ──

_PISTAS_VERIFICACION = (
    "awswaf", "aws waf", "captcha", "verify you are human", "unusual traffic", "are you a robot",
    "verificación de seguridad", "verifica que eres humano",
)  # fmt: skip
_TAMANO = re.compile(r"^Tamaño de la habitación\b", re.I)
_M2 = re.compile(r"(\d{1,4})\s*m²")
_CAMAS = re.compile(r"^(\d+)\s+(?:cama|camas|sof[aá])\b", re.I)
_MAXIMO = re.compile(r"Máximo\s+(\d+)\s+personas?", re.I)
_ENCABEZADO = re.compile(r"^(?P<t>[^.]{2,60}):$")
MAX_CUARTOS = 40


def pide_verificacion(html: str) -> bool:
    bajo = html.lower()
    return any(p in bajo for p in _PISTAS_VERIFICACION)


def _limpio(v: str, largo: int) -> str:
    return " ".join("".join(c for c in v if c.isprintable()).split())[:largo]


def _lineas(html: str) -> list[str]:
    arbol = LexborHTMLParser(html)
    for n in arbol.css("script, style, noscript, template"):
        n.decompose()
    cuerpo = arbol.body or arbol.root
    texto = cuerpo.text(separator="\n") if cuerpo else ""
    return [x for x in (_limpio(ln, 600) for ln in texto.splitlines()) if x]


def extraer_cuartos(html: str) -> list[dict]:
    """Habitaciones que publica la ficha: nombre, m², camas, máximo de personas,
    descripción, servicios y vistas. Lo que la ficha no diga queda en None."""
    lineas = _lineas(html)
    anclas = [i for i, ln in enumerate(lineas) if _TAMANO.match(ln)]
    cuartos = []
    for n, i in enumerate(anclas[:MAX_CUARTOS]):
        fin = anclas[n + 1] - 1 if n + 1 < len(anclas) else len(lineas)
        previas = lineas[max(0, i - 12) : i]
        nombre = next(
            (
                previas[j]
                for j in range(len(previas) - 1, -1, -1)
                if j + 1 < len(previas) and _M2.match(previas[j + 1]) and len(previas[j]) <= 120
            ),
            None,
        )
        nombre = nombre or next(
            (ln for ln in reversed(previas) if 3 <= len(ln) <= 80 and not _M2.match(ln)), None
        )
        if not nombre:
            continue
        bloque = lineas[i:fin]
        m2 = next((int(m.group(1)) for ln in bloque[:3] if (m := _M2.search(ln))), None)
        camas = next((ln for ln in bloque[1:6] if _CAMAS.match(ln)), None)
        maximo = next((int(m.group(1)) for ln in bloque if (m := _MAXIMO.search(ln))), None)
        descripcion = next(
            (
                ln
                for ln in bloque[1:12]
                if len(ln) >= 60 and not ln.endswith(":") and not _ENCABEZADO.match(ln)
            ),
            None,
        )
        listas: dict[str, list[str]] = {}
        actual = None
        for ln in bloque[1:]:
            if e := _ENCABEZADO.match(ln):
                actual = e.group("t").strip().lower()
                listas.setdefault(actual, [])
            elif actual and len(ln) <= 80 and ln != descripcion and not _CAMAS.match(ln):
                listas[actual].append(ln)
            elif actual:
                actual = None
        servicios = list(dict.fromkeys(listas.get("servicios", [])))
        vistas = list(dict.fromkeys(listas.get("vista", [])))
        cuartos.append({
            "nombre": _limpio(nombre, 120), "m2": m2, "camas": camas, "capacidad_maxima": maximo,
            "descripcion": descripcion, "servicios": servicios[:40], "vistas": vistas[:5],
        })  # fmt: skip
    return cuartos


# ── Con base de datos (las rutas y la CLI) ──


def canal_de(url: str) -> str:
    host = (urlsplit(url).hostname or "").lower()
    for pista, canal in (("booking.", "booking"), ("airbnb.", "airbnb"), ("vrbo.", "vrbo"),
                         ("expedia.", "expedia"), ("hoteles.com", "expedia"), ("hotels.com", "expedia")):  # fmt: skip
        if pista in host:
            return canal
    return "otro"


async def listar(sesion: AsyncSession) -> list[FichaExterna]:
    return list(
        (await sesion.execute(select(FichaExterna).order_by(FichaExterna.creado, FichaExterna.id))).scalars()
    )


async def crear(sesion: AsyncSession, actor, alcance: Alcance, propiedad_id, url: str) -> FichaExterna:
    if not alcance.permite(propiedad_id):
        raise NoEncontrado("Esa propiedad no existe")
    url = limpiar_url(url)
    ficha = FichaExterna(propiedad_id=propiedad_id, canal=canal_de(url), url=url, creado_por=actor.id)
    try:
        async with sesion.begin_nested():
            sesion.add(ficha)
            await sesion.flush()
    except IntegrityError as e:
        raise Conflicto("Esa ficha ya está registrada", codigo="duplicado") from e
    await auditar(
        sesion,
        accion="ficha_externa.crear",
        entidad="ficha_externa",
        entidad_id=ficha.id,
        despues={"url": url},
    )
    return ficha


async def borrar(sesion: AsyncSession, actor, alcance: Alcance, ficha_id) -> None:
    ficha = await sesion.get(FichaExterna, ficha_id)
    if ficha is None or not alcance.permite(ficha.propiedad_id):
        raise NoEncontrado("Esa ficha no existe")
    await sesion.delete(ficha)
    await auditar(
        sesion,
        accion="ficha_externa.borrar",
        entidad="ficha_externa",
        entidad_id=ficha_id,
        antes={"url": ficha.url},
    )
