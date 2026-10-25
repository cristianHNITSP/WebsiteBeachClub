"""Toda ruta del panel (/api/admin/*) declara su permiso (BACKEND-COMO-TRABAJAMOS §4.1).
Una ruta nueva sin `requiere_permiso` hace fallar esta prueba."""

from fastapi.routing import APIRoute

from app.main import app


def _dependencias(ruta: APIRoute):
    pendientes, vistas = list(ruta.dependant.dependencies), []
    while pendientes:
        d = pendientes.pop()
        vistas.append(d.call)
        pendientes.extend(d.dependencies)
    return vistas


def test_rutas_del_panel_declaran_permiso():
    sin_permiso = [
        r.path
        for r in app.routes
        if isinstance(r, APIRoute)
        and r.path.startswith("/api/admin")
        and not any(hasattr(c, "permisos_requeridos") for c in _dependencias(r))
    ]
    assert sin_permiso == []
