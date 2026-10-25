"""Todos los modelos se importan aquí: Alembic los descubre desde este paquete."""

from app.modelos.auditoria import Auditoria
from app.modelos.avisos import Aviso, AvisoUsuario
from app.modelos.base import Base, ConBorradoLogico
from app.modelos.externas import AjustesBot, CalendarioExterno, MencionExterna, ReservaExterna
from app.modelos.fotos import Foto
from app.modelos.habitaciones import Habitacion
from app.modelos.metricas import MetricaDiaria
from app.modelos.reservas import AjusteCobro, Outbox, Pago, Reserva, ReservaEvento
from app.modelos.sesiones import SesionUsuario
from app.modelos.sitios import ClaveIdempotencia, EntregaWebhook, Sitio, sitios_propiedades
from app.modelos.tarifas import Tarifa
from app.modelos.usuarios import Permiso, Propiedad, Rol, Usuario, roles_permisos, usuarios_propiedades

__all__ = [
    "AjusteCobro",
    "AjustesBot",
    "Auditoria",
    "Aviso",
    "AvisoUsuario",
    "Base",
    "CalendarioExterno",
    "ClaveIdempotencia",
    "ConBorradoLogico",
    "EntregaWebhook",
    "Foto",
    "Habitacion",
    "MencionExterna",
    "MetricaDiaria",
    "Outbox",
    "Pago",
    "Permiso",
    "Propiedad",
    "Reserva",
    "ReservaEvento",
    "ReservaExterna",
    "Rol",
    "SesionUsuario",
    "Sitio",
    "Tarifa",
    "Usuario",
    "roles_permisos",
    "sitios_propiedades",
    "usuarios_propiedades",
]
