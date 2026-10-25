"""Piezas HTTP que comparten varias rutas."""

from fastapi import Request


def ip(request: Request) -> str:
    # Detrás de Nginx, uvicorn ya la toma de X-Forwarded-For (--proxy-headers).
    return request.client.host if request.client else "desconocida"
