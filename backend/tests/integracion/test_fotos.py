"""Fotos (PLAN-BACKEND §18): se valida el contenido (no el nombre), se vuelve a
codificar sin metadatos, rutas a prueba de "../", tope de píxeles, orden y
portada, papelera y lápida con sus archivos borrados después."""

import io
from pathlib import Path

from PIL import Image

from app.config import obtener_config
from app.tareas.fotos import limpiar
from tests.conftest import csrf, entrar_como
from tests.fabricas import crear_habitacion

BASE = Path(obtener_config().fotos_dir)


def jpeg(color=(200, 80, 40), tam=(2400, 1600), gps=True) -> bytes:
    im = Image.new("RGB", tam, color)
    exif = Image.Exif()
    if gps:
        exif[0x8825] = {1: "N", 2: (21.0, 16.0, 0.0)}  # GPSInfo: dónde se tomó
        exif[0x0110] = "Teléfono de alguien"  # modelo de cámara
    salida = io.BytesIO()
    im.save(salida, "JPEG", exif=exif)
    return salida.getvalue()


def url_de(hab):
    return f"/api/admin/habitaciones/{hab.id}/fotos"


async def subir(cliente, hab, datos, nombre="foto.jpg", tipo="image/jpeg"):
    return await cliente.post(url_de(hab), files={"archivo": (nombre, datos, tipo)}, headers=csrf(cliente))


def archivo(f, ancho) -> Path:
    return BASE / f["urls"][str(ancho)].removeprefix("/media/fotos/")


async def test_subir_reencodea_a_webp_sin_metadatos(cliente, sesion):
    await entrar_como(cliente, sesion)
    hab = await crear_habitacion(sesion)
    r = await subir(cliente, hab, jpeg(), nombre="../../../etc/passwd")
    assert r.status_code == 201, r.text
    f = r.json()
    assert (f["ancho"], f["alto"], f["orden"]) == (2400, 1600, 0)
    for ancho in (480, 1080, 1920):
        ruta = archivo(f, ancho)
        assert ruta.resolve().is_relative_to(BASE.resolve()) and ruta.name == f"{f['id']}-{ancho}.webp"
        with Image.open(ruta) as im:
            assert im.format == "WEBP" and im.width == ancho
            assert not im.getexif() and "exif" not in im.info  # sin GPS ni cámara
    assert not (BASE.parent / "etc").exists()  # el nombre del navegador no llegó a ningún lado


async def test_rechaza_lo_que_no_es_foto(cliente, sesion):
    await entrar_como(cliente, sesion)
    hab = await crear_habitacion(sesion)
    gif = io.BytesIO()
    Image.new("RGB", (10, 10)).save(gif, "GIF")
    for datos, nombre in (
        (b"<?php echo 1; ?>", "foto.jpg"),
        (gif.getvalue(), "foto.gif"),
        (b"", "vacia.jpg"),
    ):
        r = await subir(cliente, hab, datos, nombre=nombre)
        assert r.status_code == 422 and r.json()["codigo"] == "imagen_invalida", (nombre, r.text)


async def test_bomba_de_descompresion(cliente, sesion):
    await entrar_como(cliente, sesion)
    hab = await crear_habitacion(sesion)
    png = io.BytesIO()
    Image.new("1", (10_000, 6_000)).save(png, "PNG", optimize=True)  # 60 Mpx en unos KB
    assert len(png.getvalue()) < 200_000
    r = await subir(cliente, hab, png.getvalue(), nombre="inocente.png", tipo="image/png")
    assert r.status_code == 422 and "píxeles" in r.json()["error"]


async def test_misma_foto_dos_veces(cliente, sesion):
    await entrar_como(cliente, sesion)
    hab = await crear_habitacion(sesion)
    datos = jpeg()
    assert (await subir(cliente, hab, datos)).status_code == 201
    r = await subir(cliente, hab, datos)
    assert r.status_code == 409 and r.json()["codigo"] == "foto_repetida"


async def test_orden_y_portada_en_la_lista_de_habitaciones(cliente, sesion):
    await entrar_como(cliente, sesion)
    hab = await crear_habitacion(sesion)
    ids = [
        (await subir(cliente, hab, jpeg(color=(i * 60, 10, 10), tam=(800, 600)))).json()["id"]
        for i in range(3)
    ]
    r = await cliente.put(f"{url_de(hab)}/orden", json={"ids": list(reversed(ids))}, headers=csrf(cliente))
    assert [f["id"] for f in r.json()] == list(reversed(ids))
    portada = (await cliente.get(f"/api/admin/habitaciones/{hab.id}")).json()["foto"]
    assert portada.endswith(f"{ids[-1]}-1080.webp")
    mal = await cliente.put(f"{url_de(hab)}/orden", json={"ids": ids[:2]}, headers=csrf(cliente))
    assert mal.status_code == 422


async def test_papelera_lapida_y_archivos_borrados_despues(cliente, sesion):
    await entrar_como(cliente, sesion)
    hab = await crear_habitacion(sesion)
    f = (await subir(cliente, hab, jpeg(tam=(600, 400)))).json()
    u = f"{url_de(hab)}/{f['id']}"
    assert (await cliente.delete(u, headers=csrf(cliente))).status_code == 204
    assert (await cliente.get(url_de(hab))).json() == []
    assert (await cliente.post(f"{u}/restaurar", headers=csrf(cliente))).status_code == 200
    await cliente.delete(u, headers=csrf(cliente))
    assert (await cliente.delete(u, params={"definitivo": "true"}, headers=csrf(cliente))).status_code == 204
    assert archivo(f, 1080).exists()  # en la transacción NO se borra nada del disco
    assert await sesion.run_sync(limpiar) == 1  # la tarea, después
    assert not any(archivo(f, a).exists() for a in (480, 1080, 1920))
    assert await sesion.run_sync(limpiar) == 0  # idempotente


async def test_permisos_y_propiedad(cliente, sesion):
    await entrar_como(cliente, sesion, rol="recepcion", propiedades=["chelem"])
    propia = await crear_habitacion(sesion, "chelem")
    ajena = await crear_habitacion(sesion, "chuburna")
    assert (await subir(cliente, propia, jpeg())).status_code == 403  # recepción no edita habitaciones
    assert (await cliente.get(url_de(propia))).status_code == 200
    assert (await cliente.get(url_de(ajena))).status_code == 404


async def test_acepta_heic_de_iphone(cliente, sesion):
    await entrar_como(cliente, sesion)
    hab = await crear_habitacion(sesion)
    heic = io.BytesIO()
    Image.new("RGB", (1200, 900), (30, 140, 160)).save(heic, "HEIF")
    r = await subir(cliente, hab, heic.getvalue(), nombre="IMG_0001.HEIC", tipo="image/heic")
    assert r.status_code == 201, r.text
    with Image.open(archivo(r.json(), 1080)) as im:
        assert im.format == "WEBP"
