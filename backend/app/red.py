"""Llamadas a servidores de fuera (webhooks, calendarios iCal, el bot). Síncrono:
lo usa Celery. Nunca dentro de una transacción (PLAN-BACKEND §6.1).

Defensa contra SSRF: solo direcciones públicas (una URL que escribe alguien del
personal, o que sale de un buscador, no puede tocar la red interna: Postgres,
Redis, el metadata del droplet). Cada redirección se vuelve a comprobar.
ponytail: el nombre se resuelve aquí y httpx lo resuelve otra vez al conectar (un
DNS malicioso podría cambiar entre ambas); fijar la IP si se vuelve un riesgo real.
"""

import ipaddress
import socket
from urllib.parse import urljoin, urlsplit

import httpx

TIEMPOS = httpx.Timeout(15.0, connect=5.0)  # PLAN-BACKEND §8
MAX_REDIRECCIONES = 3


class ErrorRed(Exception):
    """Para la persona: por qué no se pudo leer."""


def destino_seguro(url: str, *, solo_https: bool = True) -> str | None:
    """None si se puede llamar; si no, por qué."""
    partes = urlsplit(url)
    esquemas = ("https",) if solo_https else ("https", "http")
    if partes.scheme not in esquemas or not partes.hostname:
        return "La URL debe empezar con https://" if solo_https else "La URL debe empezar con http(s)://"
    try:
        direcciones = {i[4][0] for i in socket.getaddrinfo(partes.hostname, partes.port or 443)}
    except OSError:
        return "No se encontró ese dominio"
    if not all(ipaddress.ip_address(d.split("%")[0]).is_global for d in direcciones):
        return "La URL apunta a una red interna"
    return None


def _pedir(url: str, *, maximo: int, cabeceras: dict | None, solo_https: bool):
    """(URL final, código, cabeceras de la respuesta, contenido o None si 304)."""
    with httpx.Client(timeout=TIEMPOS, follow_redirects=False, headers=cabeceras) as c:
        for _ in range(MAX_REDIRECCIONES + 1):
            if problema := destino_seguro(url, solo_https=solo_https):
                raise ErrorRed(problema)
            try:
                with c.stream("GET", url) as r:
                    if r.is_redirect and "location" in r.headers:
                        url = urljoin(url, r.headers["location"])
                        continue
                    if r.status_code == 304:
                        return url, 304, r.headers, None
                    if not r.is_success:
                        raise ErrorRed(f"Respondió {r.status_code}")
                    datos = b""
                    for trozo in r.iter_bytes():
                        datos += trozo
                        if len(datos) > maximo:
                            raise ErrorRed(f"Pesa más de {maximo // 1_000_000} MB")
                    return url, r.status_code, r.headers, datos
            except httpx.HTTPError as e:
                raise ErrorRed(f"Sin respuesta ({type(e).__name__})") from e
    raise ErrorRed("Demasiadas redirecciones")


def descargar(
    url: str, *, maximo: int, cabeceras: dict | None = None, solo_https: bool = True
) -> tuple[str, bytes]:
    """(URL final, contenido), con tope de tamaño. Lanza ErrorRed."""
    final, _, _, datos = _pedir(url, maximo=maximo, cabeceras=cabeceras, solo_https=solo_https)
    if datos is None:
        raise ErrorRed("Respondió 304 sin haberlo pedido")
    return final, datos


def descargar_si_cambio(
    url: str, *, maximo: int, etag: str | None, modificado: str | None
) -> tuple[bytes | None, str | None, str | None]:
    """Petición condicional (If-None-Match / If-Modified-Since): si nada cambió,
    el servidor responde 304 sin mandar el archivo y esto devuelve None. Así
    leer seguido casi no cuesta. Devuelve (contenido o None, etag, last-modified)."""
    cabeceras = {}
    if etag:
        cabeceras["If-None-Match"] = etag
    if modificado:
        cabeceras["If-Modified-Since"] = modificado
    _, _, resp, datos = _pedir(url, maximo=maximo, cabeceras=cabeceras or None, solo_https=True)
    return datos, resp.get("etag") or etag, resp.get("last-modified") or modificado
