# Backend de Hoteles Frida

API (FastAPI) y tareas (Celery) del motor de reservas. Qué se construye y por qué: `docs/PLAN-BACKEND.md`. Cómo se escribe: `docs/BACKEND-ARQUITECTURA.md`, `docs/BACKEND-USUARIOS-Y-PERMISOS.md` y `docs/BACKEND-COMO-TRABAJAMOS.md`.

## Arrancar (desarrollo)

Todo corre en contenedores, desde la raíz del repo:

```bash
cp backend/.env.example backend/.env       # una vez; cambia TODAS las contraseñas ("cambiame" no arranca)
docker compose -f docker-compose.dev.yml up -d --build
DEV="docker compose -f docker-compose.dev.yml exec"
$DEV api uv run alembic upgrade head
```

- API: <http://localhost:8000/api/docs> (el contrato OpenAPI, solo en desarrollo).
- Salud: `/api/health` (el proceso vive) y `/api/health/listo` (base, Redis y latido de Celery).

### Cuentas de prueba (solo desarrollo)

`$DEV api python -m app.cli sembrar-desarrollo` crea habitaciones, reservas y estas dos cuentas. Se entra
en <http://localhost:5176/entrar> (el login ya no las muestra: se escriben a mano).

| Usuario | Contraseña | Qué ve |
|---|---|---|
| `gerente` | `frida-panel-2026` | Las dos propiedades y todos los permisos (Personal, Auditoría, Sitios web, Otras plataformas…) |
| `recepcion` | `frida-panel-2026` | Solo Cabañas Frida (Chelem), sin configurar nada |

Nunca existen en producción: ahí el primer gerente se crea con `python -m app.cli crear-usuario`
(`docs/deploy-config-REFERENCIA.md` §6.4).

## Comandos

```bash
$DEV api uv run pytest -q                 # pruebas, contra la base beachclub_pruebas
$DEV api uv run ruff check . && $DEV api uv run ruff format --check .
$DEV api uv run pip-audit                 # vulnerabilidades conocidas en dependencias
$DEV api uv run alembic revision --autogenerate -m "qué cambia"   # y LEERLA antes de aplicarla
$DEV api uv add <paquete>                 # luego: docker compose -f docker-compose.dev.yml up -d --build api celery
```

## Estructura

```
app/
├── main.py          crea la app, monta rutas y manejadores de error
├── config.py        variables de entorno con fail fast
├── db.py            motores async (API) y síncrono (Celery); `Sesion` = una transacción por petición
├── errores.py       errores de dominio → {"error", "codigo"}
├── conexion_redis.py
├── esquemas/        Pydantic: entrada estricta (extra="forbid") y salida
├── modelos/         SQLAlchemy 2.1
├── repositorios/    consultas (sin reglas ni commit)
├── servicios/       reglas del negocio y transacciones (sin FastAPI)
├── rutas/           HTTP y nada más
├── auth/            sesión, permisos, claves de sitio
└── tareas/          Celery (worker + beat)
alembic/             migraciones (corren con el usuario de migraciones, no con el de la API)
docker/postgres/     crea el usuario de la API (privilegio mínimo) y la base de pruebas
tests/               unitarias/ e integracion/, contra Postgres de verdad
```

## Dos usuarios de base

- `DATABASE_URL`: el de la API. Solo lee y escribe filas; no puede crear ni alterar tablas; consultas con tope de 5 s.
- `DATABASE_URL_MIGRACIONES`: dueño de las tablas; solo lo usa Alembic.
