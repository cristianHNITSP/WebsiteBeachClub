"""Tokens y cookies del panel con AuthX (PLAN-BACKEND §11).

- Acceso: JWT de 15 min en cookie HttpOnly (`frida_acceso`, solo para /api).
- Renovación: JWT hasta el fin de la sesión (12 h absolutas) en cookie HttpOnly
  limitada a /api/auth/renovar; rota en cada uso.
- CSRF de doble envío: AuthX deja una cookie legible (`frida_csrf`) que el panel
  reenvía en la cabecera X-CSRF-TOKEN en todo lo que modifica.
- SameSite=Strict: el panel y la API son el mismo sitio; ninguna otra página
  puede hacer que el navegador mande estas cookies.
"""

from datetime import timedelta

from authx import AuthX, AuthXConfig

from app.config import obtener_config

ACCESO = timedelta(minutes=15)
RUTA_RENOVAR = "/api/auth/renovar"
COOKIE_RENOVACION = "frida_renovacion"
EMISOR = "hoteles-frida-panel"

auth = AuthX(
    config=AuthXConfig(
        JWT_SECRET_KEY=obtener_config().jwt_secreto.get_secret_value(),
        JWT_ALGORITHM="HS256",
        JWT_DECODE_ALGORITHMS=["HS256"],
        JWT_ENCODE_ISSUER=EMISOR,
        JWT_DECODE_ISSUER=EMISOR,
        JWT_ACCESS_TOKEN_EXPIRES=ACCESO,
        JWT_TOKEN_LOCATION=["cookies"],
        JWT_ACCESS_COOKIE_NAME="frida_acceso",
        JWT_ACCESS_COOKIE_PATH="/api",
        JWT_REFRESH_COOKIE_NAME=COOKIE_RENOVACION,
        JWT_REFRESH_COOKIE_PATH=RUTA_RENOVAR,
        JWT_COOKIE_SECURE=True,
        JWT_COOKIE_HTTP_ONLY=True,
        JWT_COOKIE_SAMESITE="strict",
        JWT_COOKIE_CSRF_PROTECT=True,
        JWT_ACCESS_CSRF_COOKIE_NAME="frida_csrf",
        JWT_ACCESS_CSRF_COOKIE_PATH="/",
        JWT_REFRESH_CSRF_COOKIE_NAME="frida_csrf_renovacion",
        JWT_REFRESH_CSRF_COOKIE_PATH="/",
        JWT_ACCESS_CSRF_HEADER_NAME="X-CSRF-TOKEN",
        JWT_REFRESH_CSRF_HEADER_NAME="X-CSRF-TOKEN",
    )
)
