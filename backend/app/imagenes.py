"""Fotos subidas por el personal: validar el CONTENIDO y volver a codificar
(PLAN-BACKEND §18). Funciones puras, sin base ni HTTP.

- El nombre y la extensión que manda el navegador se ignoran: Pillow abre el
  archivo y decide qué es. Solo JPEG, PNG, WebP y HEIC (iPhone).
- Tope de píxeles contra las "bombas de descompresión" (un PNG diminuto que al
  abrirse ocupa gigas): el aviso de Pillow se vuelve error.
- Siempre se vuelve a codificar a WebP en 3 anchos: eso quita los metadatos (EXIF
  con GPS, cámara…) y cualquier contenido escondido en el original (archivos
  "políglota"). El original nunca se guarda ni se sirve.
- Las rutas se arman con pathlib desde la carpeta base y se verifica que el
  resultado siga DENTRO de ella antes de leer o escribir (doble cerrojo).
"""

import hashlib
import io
import os
import warnings
from dataclasses import dataclass
from pathlib import Path
from uuid import UUID

from PIL import Image, ImageOps, UnidentifiedImageError
from pillow_heif import register_heif_opener

register_heif_opener()  # Pillow abre HEIC/HEIF (fotos de iPhone)

FORMATOS = frozenset({"JPEG", "PNG", "WEBP", "HEIF"})  # HEIF = las HEIC de iPhone
ANCHOS = (480, 1080, 1920)
MAX_BYTES = 15 * 1024 * 1024
MAX_PIXELES = 50_000_000  # ~ 8660 × 5770: más que cualquier cámara de teléfono
CALIDAD = 82
# Segundo cerrojo, global y fijo (seguro entre hilos): Pillow se niega a
# decodificar más del doble aunque la comprobación de arriba fallara.
Image.MAX_IMAGE_PIXELS = MAX_PIXELES
# El aviso de Pillow al abrir una imagen grande sobra: `procesar` la rechaza
# justo después con un mensaje claro (y el error duro de arriba sigue activo).
warnings.filterwarnings("ignore", category=Image.DecompressionBombWarning)


class ImagenInvalida(ValueError):
    """El archivo no es una foto aceptable; el mensaje es para la persona."""


@dataclass(frozen=True, slots=True)
class Procesada:
    formato: str
    ancho: int
    alto: int
    bytes_original: int
    huella_sha256: str
    variantes: dict[int, bytes]  # ancho nominal → WebP


def procesar(datos: bytes) -> Procesada:
    if not datos:
        raise ImagenInvalida("El archivo está vacío")
    if len(datos) > MAX_BYTES:
        raise ImagenInvalida("La foto pesa más de 15 MB")
    try:
        with Image.open(io.BytesIO(datos)) as im:  # perezoso: solo lee la cabecera
            formato = im.format
            if formato not in FORMATOS:
                raise ImagenInvalida("Solo fotos JPEG, PNG, WebP o HEIC")
            # Antes de decodificar un solo píxel: una bomba no llega a ocupar memoria.
            if im.width * im.height > MAX_PIXELES:
                raise ImagenInvalida("La imagen es demasiado grande (en píxeles)")
            im.verify()  # estructura íntegra
        with Image.open(io.BytesIO(datos)) as im:
            im.load()
            im = ImageOps.exif_transpose(im)  # la orientación de la cámara, aplicada
            im = im.convert("RGBA" if _tiene_alfa(im) else "RGB")
            ancho, alto = im.size
            variantes = {a: _webp(im, a) for a in ANCHOS}
    except ImagenInvalida:
        raise
    except Image.DecompressionBombError as e:
        raise ImagenInvalida("La imagen es demasiado grande (en píxeles)") from e
    except (UnidentifiedImageError, OSError, SyntaxError, ValueError) as e:
        raise ImagenInvalida("El archivo no es una imagen válida") from e
    return Procesada(formato, ancho, alto, len(datos), hashlib.sha256(datos).hexdigest(), variantes)


def _tiene_alfa(im: Image.Image) -> bool:
    return im.mode in ("RGBA", "LA") or (im.mode == "P" and "transparency" in im.info)


def _webp(im: Image.Image, ancho: int) -> bytes:
    copia = im.copy()
    copia.thumbnail((ancho, ancho * 4), Image.Resampling.LANCZOS)  # nunca agranda
    salida = io.BytesIO()
    # Sin `exif=` ni `icc_profile=`: el WebP sale sin metadatos.
    copia.save(salida, "WEBP", quality=CALIDAD, method=4)
    return salida.getvalue()


# ── Archivos ──


def ruta(base: Path, propiedad_id: UUID, habitacion_id: UUID, foto_id: UUID, ancho: int) -> Path:
    """<base>/<propiedad>/<habitación>/<foto>-<ancho>.webp, solo con uuids y un
    entero. Aun así se comprueba que quede dentro de la base."""
    if ancho not in ANCHOS:
        raise ValueError("ancho no permitido")
    p = (
        base
        / str(UUID(str(propiedad_id)))
        / str(UUID(str(habitacion_id)))
        / f"{UUID(str(foto_id))}-{ancho}.webp"
    )
    if not p.resolve().is_relative_to(base.resolve()):
        raise ValueError("ruta fuera de la carpeta de fotos")
    return p


def url(propiedad_id: UUID, habitacion_id: UUID, foto_id: UUID, ancho: int) -> str:
    return f"/media/fotos/{propiedad_id}/{habitacion_id}/{foto_id}-{ancho}.webp"


def guardar(
    base: Path, propiedad_id: UUID, habitacion_id: UUID, foto_id: UUID, variantes: dict[int, bytes]
) -> None:
    """Escribe cada variante de forma atómica (archivo temporal + rename): nunca
    queda a medias. Si algo falla, borra lo que alcanzó a escribir."""
    escritas: list[Path] = []
    try:
        for ancho, contenido in variantes.items():
            destino = ruta(base, propiedad_id, habitacion_id, foto_id, ancho)
            destino.parent.mkdir(parents=True, exist_ok=True)
            temporal = destino.with_suffix(".tmp")
            temporal.write_bytes(contenido)
            os.replace(temporal, destino)
            escritas.append(destino)
    except BaseException:
        borrar_rutas(escritas)
        raise


def borrar(base: Path, propiedad_id: UUID, habitacion_id: UUID, foto_id: UUID) -> None:
    borrar_rutas(ruta(base, propiedad_id, habitacion_id, foto_id, a) for a in ANCHOS)


def borrar_rutas(rutas) -> None:
    for r in rutas:
        r.unlink(missing_ok=True)
