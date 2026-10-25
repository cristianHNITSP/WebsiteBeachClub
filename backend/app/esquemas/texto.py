"""Texto libre que escribe una persona (PLAN-BACKEND §17.1): Unicode NFC, espacios
recortados y sin caracteres de control. Se guarda como texto plano, nunca HTML."""

import unicodedata
from typing import Annotated

from pydantic import AfterValidator

_PERMITIDOS = {"\n", "\t"}


def texto_plano(v: str) -> str:
    v = unicodedata.normalize("NFC", v).strip()
    if any(unicodedata.category(c) == "Cc" and c not in _PERMITIDOS for c in v):
        raise ValueError("Tiene caracteres no permitidos")
    return v


Texto = Annotated[str, AfterValidator(texto_plano)]
