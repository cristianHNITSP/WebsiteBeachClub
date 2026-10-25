"""El bot: dónde aparece el hotel en la web (PLAN-BACKEND §13.1). Síncrono (Celery).

1. Buscar con la API de Brave Search (cobra por consulta: tope mensual del panel).
   Sin `BRAVE_SEARCH_CLAVE` no busca y lo dice; nunca inventa resultados.
2. Antes de leer una página: ¿dominio bloqueado (Booking, Airbnb, Expedia…,
   prohíben el scraping en sus términos)? ¿lo permite su robots.txt (Protego,
   el parser de Scrapy)? Si no, se guarda lo que dijo el buscador y nada más.
3. Leer con cortesía: una petición a la vez, `Crawl-delay` respetado (tope
   10 s), User-Agent que dice quiénes somos y cómo contactarnos (sin contacto
   configurado, no se lee nada).
4. Extraer los datos estructurados (JSON-LD de schema.org: Hotel,
   AggregateRating, Offer) con selectolax. Todo lo de fuera es NO confiable:
   texto plano recortado, nunca HTML.

Desviación del plan: httpx + Protego + selectolax en vez de Scrapy (el reactor
de Twisted no se reinicia dentro de un worker de Celery) y sin trafilatura
(no se guardan textos de reseñas, solo la calificación y cuántas hay).
"""

import json
import logging
import time
from decimal import Decimal, InvalidOperation
from urllib.parse import urlsplit

import httpx
from protego import Protego
from selectolax.lexbor import LexborHTMLParser
from sqlalchemy import func
from sqlalchemy.dialects.postgresql import insert

from app import red
from app.config import obtener_config
from app.modelos import AjustesBot, MencionExterna
from app.servicios.reservas import hoy

log = logging.getLogger(__name__)

BRAVE = "https://api.search.brave.com/res/v1/web/search"  # API pública de un tercero, no un servicio nuestro
RESULTADOS = 20
MAX_PAGINA = 3_000_000
MAX_ESPERA_S = 10
TIPOS_HOTEL = {"Hotel", "LodgingBusiness", "Resort", "BedAndBreakfast", "Hostel", "Motel", "VacationRental"}


def _texto(v, largo: int) -> str | None:
    if v is None:
        return None
    limpio = " ".join("".join(c for c in str(v) if c.isprintable()).split())
    return limpio[:largo] or None


def dominio(url: str) -> str:
    return (urlsplit(url).hostname or "").lower().removeprefix("www.")


def bloqueado(url: str, dominios: list[str]) -> bool:
    d = dominio(url)
    return any(d == b or d.endswith("." + b) for b in dominios)


def agente(contacto: str) -> str:
    return f"HotelesFridaBot/1.0 (busca menciones del hotel; contacto: {contacto})"


# ── Extraer (puro: se prueba sin red) ──


def _objetos(dato):
    """Recorre el JSON-LD (listas, @graph, anidados) y entrega cada objeto."""
    if isinstance(dato, list):
        for x in dato:
            yield from _objetos(x)
    elif isinstance(dato, dict):
        yield dato
        for v in dato.values():
            if isinstance(v, dict | list):
                yield from _objetos(v)


def _tipos(o: dict) -> set[str]:
    t = o.get("@type")
    return set(t) if isinstance(t, list) else {t}


def _calificacion(r: dict) -> tuple[Decimal | None, int | None]:
    try:
        valor = Decimal(str(r.get("ratingValue")))
        mejor = Decimal(str(r.get("bestRating") or 5))
        sobre_5 = (valor * 5 / mejor).quantize(Decimal("0.01")) if mejor > 0 else None
    except InvalidOperation, TypeError:
        sobre_5 = None
    cuantas = r.get("reviewCount") or r.get("ratingCount")
    try:
        cuantas = int(cuantas) if cuantas is not None else None
    except TypeError, ValueError:
        cuantas = None
    if sobre_5 is not None and not 0 <= sobre_5 <= 5:
        sobre_5 = None
    return sobre_5, cuantas


def extraer(html: str) -> dict:
    """Título, precio, calificación (sobre 5) y número de reseñas, si la página los publica."""
    arbol = LexborHTMLParser(html)
    titulo = arbol.css_first("title")
    datos = {
        "titulo": _texto(titulo.text() if titulo else None, 300),
        "precio": None,
        "calificacion": None,
        "resenas": None,
    }
    oferta = rango = None
    for script in arbol.css('script[type="application/ld+json"]'):
        try:
            contenido = json.loads(script.text())
        except ValueError, TypeError:
            continue
        for o in _objetos(contenido):
            tipos = _tipos(o)
            if tipos & TIPOS_HOTEL and o.get("name"):
                datos["titulo"] = _texto(o["name"], 300)
            if "AggregateRating" in tipos or isinstance(o.get("aggregateRating"), dict):
                r = o if "AggregateRating" in tipos else o["aggregateRating"]
                datos["calificacion"], datos["resenas"] = _calificacion(r)
            if "Offer" in tipos and o.get("price") is not None and oferta is None:
                oferta = _texto(f"{o.get('priceCurrency', '')} {o['price']}", 60)
            elif tipos & TIPOS_HOTEL and o.get("priceRange") and rango is None:
                rango = _texto(o["priceRange"], 60)
    datos["precio"] = oferta or rango  # un precio concreto gana al rango ("$$")
    return datos


# ── Con red ──


def buscar(consulta: str, clave: str) -> list[dict]:
    with httpx.Client(timeout=red.TIEMPOS) as c:
        r = c.get(
            BRAVE,
            params={"q": consulta, "count": RESULTADOS, "country": "MX", "search_lang": "es"},
            headers={"Accept": "application/json", "X-Subscription-Token": clave},
        )
    r.raise_for_status()
    return [
        {
            "url": x["url"],
            "titulo": _texto(x.get("title"), 300),
            "descripcion": _texto(x.get("description"), 600),
        }
        for x in (r.json().get("web") or {}).get("results", [])
        if str(x.get("url", "")).startswith(("https://", "http://"))
    ]


class Lector:
    """Lee páginas con cortesía: robots.txt por dominio (una vez por vuelta) y
    su Crawl-delay entre páginas del mismo dominio."""

    def __init__(self, contacto: str):
        self.ua = agente(contacto)
        self.robots: dict[str, Protego | None] = {}
        self.ultima: dict[str, float] = {}

    def _robots(self, url: str) -> Protego | None:
        p = urlsplit(url)
        base = f"{p.scheme}://{p.netloc}"
        if base not in self.robots:
            try:
                _, datos = red.descargar(
                    f"{base}/robots.txt", maximo=500_000, cabeceras={"User-Agent": self.ua}, solo_https=False
                )
                self.robots[base] = Protego.parse(datos.decode("utf-8", "replace"))
            except red.ErrorRed:
                self.robots[base] = None  # sin robots.txt legible: se permite (convención estándar)
        return self.robots[base]

    def permiso(self, url: str) -> bool:
        rp = self._robots(url)
        return rp is None or rp.can_fetch(url, self.ua)

    def leer(self, url: str) -> str:
        rp = self._robots(url)
        espera = min(float((rp.crawl_delay(self.ua) if rp else None) or 1), MAX_ESPERA_S)
        d = dominio(url)
        falta = self.ultima.get(d, 0) + espera - time.monotonic()
        if falta > 0:
            time.sleep(falta)
        try:
            _, datos = red.descargar(
                url, maximo=MAX_PAGINA, cabeceras={"User-Agent": self.ua}, solo_https=False
            )
        finally:
            self.ultima[d] = time.monotonic()
        return datos.decode("utf-8", "replace")


# ── La vuelta completa (la llama la tarea) ──


def _guardar(sesion, consulta: str, encontrado: dict, **leido) -> None:
    valores = {
        "url": encontrado["url"][:2000],
        "dominio": dominio(encontrado["url"])[:255],
        "consulta": consulta[:120],
        "titulo": encontrado.get("titulo"),
        "descripcion": encontrado.get("descripcion"),
        **leido,
    }
    sesion.execute(
        insert(MencionExterna)
        .values(**valores)
        .on_conflict_do_update(index_elements=["url"], set_={k: v for k, v in valores.items() if k != "url"})
    )


def ejecutar(abrir_sesion) -> str:
    """Una vuelta del bot. `abrir_sesion()` da una transacción nueva cada vez:
    ninguna llamada de red ocurre dentro de una transacción."""
    clave = obtener_config().brave_search_clave
    with abrir_sesion() as s:
        a = s.get(AjustesBot, 1, with_for_update=True)
        mes = hoy().replace(day=1)
        if a.mes != mes:
            a.mes, a.consultas_mes = mes, 0
        if clave is None:
            resultado = "Sin BRAVE_SEARCH_CLAVE: el bot no busca (no inventa resultados)."
        elif not a.contacto:
            resultado = "Falta el contacto del bot en el panel: sin él no se lee ninguna página."
        elif a.consultas_mes + len(a.consultas) > a.tope_mensual:
            resultado = f"Tope mensual alcanzado ({a.consultas_mes} de {a.tope_mensual} consultas)."
        else:
            resultado = None
            a.consultas_mes += len(a.consultas)  # se cuentan ANTES: si algo falla, no se pasa del tope
        consultas, bloqueados, contacto = list(a.consultas), list(a.dominios_bloqueados), a.contacto
        a.ultima_ejecucion = func.now()
        a.ultimo_resultado = resultado
    if resultado:
        return resultado

    lector, leidas, encontradas = Lector(contacto), 0, 0
    for consulta in consultas:
        try:
            hallazgos = buscar(consulta, clave.get_secret_value())
        except httpx.HTTPError as e:
            log.warning("Brave Search falló con «%s»: %s", consulta, type(e).__name__)
            continue
        for h in hallazgos:
            encontradas += 1
            if bloqueado(h["url"], bloqueados):
                leido = {
                    "estado": "bloqueada_dominio",
                    "detalle": "Sus términos prohíben leerla: solo lo del buscador",
                }
            elif not lector.permiso(h["url"]):
                leido = {"estado": "bloqueada_robots", "detalle": "Su robots.txt no permite leerla"}
            else:
                try:
                    datos = extraer(lector.leer(h["url"]))
                    leido = {
                        "estado": "leida", "detalle": None, "leida_en": func.now(), "precio": datos["precio"],
                        "calificacion": datos["calificacion"], "resenas": datos["resenas"],
                    }  # fmt: skip
                    if datos["titulo"]:
                        h = {**h, "titulo": datos["titulo"]}
                    leidas += 1
                except red.ErrorRed as e:
                    leido = {"estado": "error", "detalle": str(e)[:300]}
            with abrir_sesion() as s:
                _guardar(s, consulta, h, **leido)
    resultado = f"{len(consultas)} búsquedas, {encontradas} resultados, {leidas} páginas leídas."
    with abrir_sesion() as s:
        s.get(AjustesBot, 1).ultimo_resultado = resultado
    return resultado
