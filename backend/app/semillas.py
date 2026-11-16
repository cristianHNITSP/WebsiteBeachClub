"""Catálogos fijos que siembra la migración 0002. Viven aquí (y no dentro de la
migración) para que las pruebas y el código usen exactamente los mismos.

Un permiso nuevo = una migración NUEVA que lo inserta y se lo da a los roles
que tocan (nunca editar esta lista para una base ya migrada esperando que se
aplique sola)."""

PROPIEDADES = [
    {"clave": "chelem", "nombre": "Cabañas Frida", "lugar": "Chelem, Yucatán"},
    {"clave": "chuburna", "nombre": "Casa Frida", "lugar": "Chuburná, Yucatán"},
]

ROLES = [
    {"id": 1, "clave": "gerente", "nombre": "Gerente", "es_personal": True},
    {"id": 2, "clave": "recepcion", "nombre": "Recepción", "es_personal": True},
    {"id": 3, "clave": "restaurante", "nombre": "Restaurante", "es_personal": True},
    {"id": 4, "clave": "huesped", "nombre": "Huésped", "es_personal": False},
    # 2026-11-15 (migración 0025): ve las dos propiedades y la auditoría, y es el único que
    # gestiona a gerentes y dueños. El gerente ve solo las propiedades que se le asignan.
    {"id": 5, "clave": "dueno", "nombre": "Dueño", "es_personal": True},
]

PERMISOS = [
    {
        "id": 1,
        "clave": "reservas.ver",
        "modulo": "reservas",
        "descripcion": "Ver reservas y la Línea de tiempo",
    },
    {"id": 2, "clave": "reservas.crear", "modulo": "reservas", "descripcion": "Capturar reservas"},
    {
        "id": 3,
        "clave": "reservas.editar",
        "modulo": "reservas",
        "descripcion": "Mover, estirar y cambiar reservas",
    },
    {"id": 4, "clave": "reservas.cancelar", "modulo": "reservas", "descripcion": "Cancelar reservas"},
    {
        "id": 5,
        "clave": "pagos.registrar",
        "modulo": "reservas",
        "descripcion": "Registrar anticipos, saldos y pagos",
    },
    {
        "id": 6,
        "clave": "habitaciones.ver",
        "modulo": "habitaciones",
        "descripcion": "Ver habitaciones y tarifas",
    },
    {
        "id": 7,
        "clave": "habitaciones.editar",
        "modulo": "habitaciones",
        "descripcion": "Crear y editar habitaciones",
    },
    {
        "id": 8,
        "clave": "habitaciones.eliminar",
        "modulo": "habitaciones",
        "descripcion": "Mandar a la papelera",
    },
    {"id": 9, "clave": "usuarios.ver", "modulo": "usuarios", "descripcion": "Ver al personal"},
    {
        "id": 10,
        "clave": "usuarios.gestionar",
        "modulo": "usuarios",
        "descripcion": "Alta, baja, rol y propiedades",
    },
    {"id": 11, "clave": "ajustes.editar", "modulo": "ajustes", "descripcion": "Cambiar ajustes del hotel"},
    {"id": 12, "clave": "ajustes.cobro", "modulo": "ajustes", "descripcion": "Anticipo o pago completo"},
    {"id": 13, "clave": "auditoria.ver", "modulo": "auditoria", "descripcion": "Ver la auditoría"},
    {"id": 14, "clave": "papelera.vaciar", "modulo": "papelera", "descripcion": "Borrado definitivo"},
    {
        "id": 15,
        "clave": "propiedades.todas",
        "modulo": "propiedades",
        "descripcion": "Ver todas las propiedades",
    },
    {"id": 16, "clave": "metricas.ver", "modulo": "metricas", "descripcion": "Ver el tablero y las métricas"},
    {
        "id": 17,
        "clave": "externas.ver",
        "modulo": "externas",
        "descripcion": "Ver reservas y menciones externas",
    },
    {
        "id": 18,
        "clave": "sitios.gestionar",
        "modulo": "sitios",
        "descripcion": "Sitios web, claves y webhooks",
    },
    {
        "id": 19,
        "clave": "personal.gerentes",
        "modulo": "usuarios",
        "descripcion": "Dar de alta y cambiar a gerentes y dueños",
    },
    {
        "id": 20,
        "clave": "propiedades.gestionar",
        "modulo": "propiedades",
        "descripcion": "Dar de alta y editar propiedades",
    },
]

# Lo que solo tiene el dueño: ver todas las propiedades, la auditoría, gestionar a gerentes y
# dueños y dar de alta propiedades.
SOLO_DUENO = ("propiedades.todas", "auditoria.ver", "personal.gerentes", "propiedades.gestionar")

PERMISOS_POR_ROL = {
    "dueno": [p["clave"] for p in PERMISOS],
    "gerente": [p["clave"] for p in PERMISOS if p["clave"] not in SOLO_DUENO],
    "recepcion": [
        "reservas.ver",
        "reservas.crear",
        "reservas.editar",
        "reservas.cancelar",
        "pagos.registrar",
        "habitaciones.ver",
        "metricas.ver",
        "externas.ver",
    ],
    # Módulo apagado (frontend/src/admin/modulos.js): sin permisos hasta que se encienda.
    "restaurante": [],
    "huesped": [],
}
