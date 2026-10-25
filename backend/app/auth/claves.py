"""Contraseñas: Argon2id con pwdlib (BACKEND-USUARIOS-Y-PERMISOS §5)."""

import secrets

from pwdlib import PasswordHash

hasher = PasswordHash.recommended()  # Argon2id con los parámetros recomendados

# Si el usuario no existe, se verifica igual contra este hash: así la respuesta
# tarda lo mismo exista o no, y el tiempo no revela qué cuentas existen.
HASH_DE_RELLENO = hasher.hash(secrets.token_urlsafe(32))

CLAVE_MINIMO = 12
CLAVE_MAXIMO = 256  # tope: Argon2 con una "contraseña" de megas sería un ataque de agotamiento
_COMUNES = {"contraseña123", "password1234", "123456789012", "qwertyuiop12", "hotelesfrida", "cabanasfrida"}


def problema_de_clave(clave: str, *, usuario: str, correo: str) -> str | None:
    """Política de contraseñas (longitud antes que "símbolos raros", como pide NIST).
    Devuelve el problema para la persona o None si está bien."""
    if len(clave) < CLAVE_MINIMO:
        return f"La contraseña debe tener al menos {CLAVE_MINIMO} caracteres"
    if len(clave) > CLAVE_MAXIMO:
        return f"La contraseña no puede pasar de {CLAVE_MAXIMO} caracteres"
    baja = clave.lower()
    if baja in _COMUNES or baja in {usuario.lower(), correo.lower()} or len(set(clave)) < 5:
        return "Esa contraseña es demasiado fácil de adivinar"
    return None
