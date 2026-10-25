# syntax=docker/dockerfile:1
# ============================================================================
# Backend de Hoteles Frida: UNA imagen para `api` (uvicorn) y `celery`.
#   dev  → código montado por volumen, recarga en caliente, con herramientas de prueba
#   prod → solo dependencias de ejecución y el código, usuario sin privilegios
# Python 3.14 hoy; cambiar a python:3.15-slim-trixie en cuanto se publique
# (PLAN-BACKEND §3). En producción, fijar además por digest (@sha256:…).
# ============================================================================
FROM python:3.14.8-slim-trixie AS base
COPY --from=ghcr.io/astral-sh/uv:0.13.0 /uv /uvx /bin/
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    UV_PYTHON_DOWNLOADS=never \
    UV_PROJECT_ENVIRONMENT=/opt/venv \
    PATH=/opt/venv/bin:$PATH
# uid 1000: lo que genere en el volumen de desarrollo queda del usuario del host.
RUN groupadd --gid 1000 app && useradd --uid 1000 --gid app --create-home app \
    && mkdir -p /datos/fotos && chown app:app /datos/fotos
# /datos/fotos: las fotos de las habitaciones (PLAN-BACKEND §18). Es un volumen; al
# crearlo, Docker copia este dueño (uid 1000), así la API puede escribir en él.
WORKDIR /app

FROM base AS dev
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-install-project && chown -R app:app /opt/venv
USER app
EXPOSE 8000
# Detrás del proxy de Vite: la IP real del cliente (auditoría y límite de intentos).
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload", "--proxy-headers", "--forwarded-allow-ips", "*"]

FROM base AS prod
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev --no-install-project
COPY alembic.ini ./
COPY alembic ./alembic
COPY app ./app
USER app
EXPOSE 8000
# Detrás de Nginx: confía en sus cabeceras X-Forwarded-* (red interna).
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2", "--proxy-headers", "--forwarded-allow-ips", "*"]
