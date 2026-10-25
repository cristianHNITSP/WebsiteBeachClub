# Arquitectura del backend (FastAPI)

Cómo se organiza el código del backend y por qué. Complementa a `docs/PLAN-BACKEND.md`, que fija **qué** se construye (stack, contenedores, autenticación, motor de reservas). Este documento fija **cómo** se escribe. Si algo de aquí choca con el plan, manda el plan; cámbialo ahí primero.

Documentos hermanos:

- `docs/BACKEND-USUARIOS-Y-PERMISOS.md`: usuarios, roles, sesiones, auditoría.
- `docs/BACKEND-COMO-TRABAJAMOS.md`: la receta para cada cambio, cómo se conectan las vistas y cómo se prueba.

---

## 1. Las capas

Cada petición atraviesa cuatro capas, siempre en este orden y nunca saltándose una:

```
petición HTTP
   │
   ▼
rutas/            ← CONTROLADORES: HTTP y nada más
   │  valida la entrada (esquemas Pydantic), saca al usuario (dependencias),
   │  llama a UN servicio y traduce su resultado a respuesta HTTP
   ▼
servicios/        ← LÓGICA DE NEGOCIO: reglas del hotel
   │  decide qué se puede y qué no; orquesta repositorios; abre y cierra la
   │  transacción; escribe el outbox. No sabe que existe FastAPI.
   ▼
repositorios/     ← ACCESO A DATOS: consultas
   │  SELECT/INSERT/UPDATE con SQLAlchemy. Sin reglas de negocio, sin commit.
   ▼
modelos/          ← TABLAS: SQLAlchemy 2.1 (Mapped[...])
```

Más dos piezas transversales:

- `esquemas/`: los modelos **Pydantic** de entrada y salida, o sea el contrato con el frontend. No son los modelos de SQLAlchemy: una tabla puede tener columnas que nunca salen (hash de contraseña, notas internas) y una respuesta puede juntar varias tablas.
- `auth/`: AuthX, pwdlib y las dependencias de rol (ver el documento de usuarios).

### Qué va en cada capa (y qué no)

| Capa | Sí | No |
|---|---|---|
| `rutas/` | `@router.get/post…`, `Depends`, códigos HTTP, cabeceras (`X-Accel-Expires`, `Idempotency-Key`), convertir excepciones de dominio a HTTP | Consultas SQL, reglas de negocio, `commit()` |
| `servicios/` | Reglas («una retención dura 15 min», «una reserva vencida no se confirma sin volver a comprobar las noches»), transacción, outbox, llamar a varios repositorios | `Request`, `HTTPException`, nombres de cookies, nada de FastAPI |
| `repositorios/` | `select(...)`, `insert(...)`, filtros, paginación, `with_for_update()` | Decidir si algo está permitido, `commit()`, lanzar errores HTTP |
| `modelos/` | Columnas, relaciones, restricciones (`CheckConstraint`, `UniqueConstraint`, la exclusión por rango) | Lógica |
| `esquemas/` | Forma y validación de lo que entra y sale | Acceso a la base |

**Por qué tan estricto:**

- **Los servicios se prueban sin HTTP.** Las reglas del hotel se prueban llamando a la función, sin levantar FastAPI. Celery reutiliza los mismos servicios con su sesión síncrona.
- **Las rutas quedan cortas y aburridas:** cada una es «validar → llamar → responder». Cuando una ruta crece, es lógica que se está escapando del servicio.
- **Una regla vive en un solo lugar.** En SIMDES hubo reglas copiadas en dos rutas que dejaron de coincidir sin que nadie lo notara («dos caminos que debían decir lo mismo dejaron de estar sincronizados»). Si dos rutas necesitan la misma regla, va al servicio y las dos lo llaman.

---

## 2. Estructura de carpetas

La misma de `PLAN-BACKEND.md` §14, aquí con el porqué de cada carpeta:

```
backend/
├── Dockerfile                  # una imagen: api y celery
├── pyproject.toml, uv.lock
├── alembic/                    # migraciones (env.py importa app.modelos)
├── app/
│   ├── main.py                 # crea la app, monta routers, /api/health, manejadores de error
│   ├── config.py               # pydantic-settings; si falta algo, no arranca
│   ├── db.py                   # engine async (api) y síncrono (celery); dependencia get_sesion
│   ├── errores.py              # excepciones de dominio + su traducción a HTTP
│   ├── modelos/                # un archivo por agregado: usuarios.py, habitaciones.py, reservas.py…
│   ├── esquemas/               # Pydantic, mismo reparto que modelos/
│   ├── repositorios/           # mismo reparto
│   ├── servicios/              # mismo reparto
│   ├── rutas/                  # v1/ (API pública de las websites), admin/ (panel), auth.py, eventos.py (SSE), webhooks.py
│   ├── auth/                   # AuthX, pwdlib, dependencias de rol y permiso
│   ├── tiempo_real.py          # Redis pub/sub → SSE del panel
│   └── tareas/                 # Celery: bot, ical, retenciones, outbox
└── tests/
    ├── conftest.py             # app, cliente, sesión con rollback por prueba
    ├── unitarias/              # servicios y funciones puras, sin HTTP
    └── integracion/            # rutas contra Postgres real
```

Un **agregado** (usuarios, habitaciones, reservas, restaurante…) tiene un archivo con el mismo nombre en cada capa. Para saber dónde está algo de reservas: `modelos/reservas.py`, `esquemas/reservas.py`, `repositorios/reservas.py`, `servicios/reservas.py`, `rutas/reservas.py`.

---

## 3. Una petición de punta a punta

Ejemplo: una website (WordPress o Shopify) crea una retención de reserva por la API pública (`PLAN-BACKEND.md` §4–§5).

```python
# esquemas/reservas.py: lo que entra y lo que sale (contrato con el frontend)
class RetencionEntrada(BaseModel):
    habitacion_id: int
    llegada: date
    salida: date
    huespedes: int = Field(ge=1, le=8)

    @model_validator(mode="after")
    def _fechas(self):
        if self.salida <= self.llegada:
            raise ValueError("La salida debe ser después de la llegada")
        return self


class ReservaSalida(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    habitacion_id: int
    llegada: date
    salida: date
    estado: Literal["retenida", "confirmada", "en_curso", "completada", "expirada", "cancelada"]
    total_centavos: int
    vence: datetime | None
```

```python
# repositorios/reservas.py: solo consultas
async def crear(sesion: AsyncSession, **datos) -> Reserva:
    reserva = Reserva(**datos)
    sesion.add(reserva)
    await sesion.flush()          # flush, NO commit: la transacción es del servicio
    return reserva


async def por_codigo(sesion: AsyncSession, sitio_id: UUID, codigo: str) -> Reserva | None:
    # Filtra por sitio: una website nunca ve reservas de otra (404, no 403).
    r = await sesion.execute(select(Reserva).where(Reserva.sitio_id == sitio_id,
                                                   Reserva.codigo == codigo))
    return r.scalar_one_or_none()
```

```python
# servicios/reservas.py: reglas del hotel; sin FastAPI
RETENCION = timedelta(minutes=15)   # PLAN §5. Si el hotel la quiere cambiar, pasa a la tabla de ajustes (§5)

async def retener(sesion: AsyncSession, sitio: Sitio, datos: RetencionEntrada) -> Reserva:
    habitacion = await repo_habitaciones.por_id(sesion, datos.habitacion_id)
    if habitacion is None or not habitacion.activa:
        raise NoEncontrado("Esa habitación no existe")
    if datos.huespedes > habitacion.capacidad:
        raise ReglaDeNegocio(f"La habitación es para {habitacion.capacidad} personas como máximo")
    total = tarifas.total_centavos(habitacion, datos.llegada, datos.salida)
    try:
        async with sesion.begin_nested():            # SAVEPOINT: el choque no tumba la transacción
            reserva = await repo_reservas.crear(
                sesion, sitio_id=sitio.id, codigo=codigo_publico(), habitacion_id=habitacion.id,
                # Range: sqlalchemy.dialects.postgresql.Range (columna DATERANGE)
                estancia=Range(datos.llegada, datos.salida), estado="retenida",
                total_centavos=total, vence=ahora() + RETENCION)
    except IntegrityError as e:                       # la restricción `sin_choque` de Postgres
        raise Conflicto("Esas fechas se acaban de ocupar", codigo="sin_disponibilidad") from e
    await outbox.encolar(sesion, "reserva.retenida", reserva.id)   # misma transacción
    return reserva
```

```python
# rutas/reservas.py: HTTP y nada más
# rutas/v1/reservas.py: API pública. Pública A PROPÓSITO: la protege la clave
# del sitio (más su lista de orígenes permitidos), no una sesión.
router = APIRouter(prefix="/api/v1/reservas", tags=["v1: reservas"])

@router.post("", response_model=ReservaSalida, status_code=201)
async def retener(datos: RetencionEntrada,
                  sitio: Sitio = Depends(sitio_actual),
                  sesion: AsyncSession = Depends(get_sesion),
                  clave: UUID = Header(alias="Idempotency-Key")):
    return await idempotencia.una_vez(sesion, sitio.id, clave, "reservas.retener", datos,
                                      lambda: servicio_reservas.retener(sesion, sitio, datos))
```

La sesión la abre y la cierra `get_sesion` (con `commit` al terminar sin error y `rollback` si algo falla), y las rutas la reciben con el alias **`Sesion`** de `app/db.py`, que la declara con `Depends(get_sesion, scope="function")`: así el `commit` corre **antes** de enviar la respuesta. Con el alcance por omisión de FastAPI (`"request"`) correría después, y el cliente podría recibir un 200 de algo que luego falla al guardar. **Nadie más hace `commit`**, salvo que un servicio necesite dos transacciones a propósito, y entonces lo dice en un comentario.

---

## 4. Errores

Las capas de abajo lanzan **excepciones de dominio**; solo `main.py` las convierte a HTTP. Así un servicio sirve igual para una ruta, para Celery o para una prueba.

```python
# errores.py
class ErrorDeDominio(Exception):
    estado = 400
    def __init__(self, mensaje: str, **detalle):
        self.mensaje, self.detalle = mensaje, detalle

class NoAutenticado(ErrorDeDominio): estado = 401
class NoEncontrado(ErrorDeDominio):  estado = 404
class SinPermiso(ErrorDeDominio):    estado = 403
class Conflicto(ErrorDeDominio):     estado = 409
class ReglaDeNegocio(ErrorDeDominio): estado = 422
```

```python
# main.py
@app.exception_handler(ErrorDeDominio)
async def _dominio(request, e: ErrorDeDominio):
    return JSONResponse({"error": e.mensaje, **e.detalle}, status_code=e.estado)

@app.exception_handler(Exception)
async def _inesperado(request, e: Exception):
    log.exception("Error no controlado en %s %s", request.method, request.url.path)
    return JSONResponse({"error": "Error interno del servidor"}, status_code=500)
```

Reglas:

- **Forma única del error:** `{"error": "<frase para la persona>", ...detalle}`. El frontend muestra `error` tal cual, así que escríbelo para un huésped o para recepción, no para un programador. Un `detalle` de máquina va con su propia clave (`{"error": "Esas fechas se acaban de ocupar", "codigo": "choque"}`).
- **Un 500 nunca filtra** la traza ni el mensaje interno; se registra completo en el log.
- 401 sin sesión, 403 sin permiso, 404 no existe **o no es tuyo** (no confirmes que existe algo ajeno), 409 choque de estado, 422 regla de negocio o validación.

---

## 5. Configuración: fail fast

Como en el frontend y en el resto del repo: **nada escrito a mano**. Toda URL, secreto o ajuste que cambie entre máquinas va en variables de entorno, declaradas en `config.py` con pydantic-settings:

```python
class Config(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")
    entorno: Literal["desarrollo", "pruebas", "produccion"]
    database_url: PostgresDsn
    redis_url: RedisDsn
    jwt_secreto: SecretStr

    @field_validator("jwt_secreto")
    @classmethod
    def _no_relleno(cls, v):
        if v.get_secret_value().lower() in {"", "change-me", "cambiame", "prueba"} or len(v.get_secret_value()) < 32:
            raise ValueError("JWT_SECRETO falta o es de relleno (ver docs/deploy-config-REFERENCIA.md)")
        return v

config = Config()   # si falta algo, el proceso NO arranca y dice qué falta
```

- **Un valor de relleno cuenta como ausente.** Estar definida no es estar configurada.
- **Al añadir un ajuste**: va en `config.py`, en `.env.example` (con una línea de para qué es), en los Secrets y `deploy.yml` si es secreto, y en `docs/deploy-config-REFERENCIA.md` (ver `PLAN-BACKEND.md` §15).
- Los **números que alguien del hotel podría querer cambiar** (duración de la retención, horario del restaurante, políticas de cancelación) **no son constantes del código**: van a una tabla editable desde el panel. Regla de SIMDES: *«si alguien podría querer cambiarlo sin tocar código, va a la base»*. En el código solo quedan la física y las decisiones del propio sistema.

---

## 6. Base de datos y migraciones

- **Alembic** con `autogenerate`, pero **toda migración se lee antes de aplicarla**: autogenerate no ve restricciones de exclusión, extensiones (`btree_gist`) ni datos sembrados.
- **Una migración por cambio**, con docstring que diga **por qué** (no solo qué). En SIMDES las migraciones explican su motivo y la fuente de sus datos, y eso ha evitado más de un error.
- **Siempre con `downgrade()`** funcional.
- **Datos semilla (catálogos fijos):** van **en la migración** que crea la tabla (`op.bulk_insert`), no en un script aparte que corra después. Trampa real de SIMDES: un `seed.py` que corría después de las migraciones pisó datos que una migración había corregido, y otro borró un catálogo entero. Si hace falta un script de datos, debe ser **idempotente** y **nunca borrar**.
- **Dinero en centavos (`bigint`)**, noches como `date` en hora de Mérida, momentos como `timestamptz`, llaves `uuidv7()` (ver `PLAN-BACKEND.md` §7).
- **La base garantiza lo que no se puede romper**: `UNIQUE`, `CHECK`, la exclusión `sin_choque`. El servicio valida antes para dar un buen mensaje, pero la última palabra es de Postgres.
- **Borrado lógico y definitivo** (`PLAN-BACKEND.md` §19): los modelos de catálogo heredan `ConBorradoLogico` e implementan `vaciar_contenido`; el filtro `eliminado_en IS NULL` lo añade la sesión a TODA consulta (no se escribe a mano en cada repositorio), sus `UNIQUE` son índices parciales y sus llaves foráneas van con `ON DELETE RESTRICT`. El definitivo deja una **lápida** (la fila se queda sin contenido), así nada queda apuntando a la nada. Papelera, restaurar y definitivo se implementan **una vez** en `servicios/papelera.py`; cada recurso solo declara su `Recurso`. Reservas y pagos nunca se borran: se cancelan.
- **Choques esperados (UNIQUE, exclusión) dentro de un SAVEPOINT** (`async with sesion.begin_nested():`) y **los cambios al objeto DENTRO del bloque**: `begin_nested()` vacía lo pendiente antes de abrir el savepoint, así que un `setattr` hecho antes choca fuera de él y tumba toda la transacción (pasó en la fase 3a con restaurar).
- **Acceso por propiedad en la base (RLS):** toda tabla con `propiedad_id` lleva la política `por_propiedad` (ver la migración 0003) y la API fija `app.propiedades` por transacción (`app/auth/alcance.py`). Escríbela con `CASE`, no con `OR`: SQL no garantiza el orden de un `OR` y `'*'` no se puede convertir a uuid. Celery y la CLI fijan su alcance con `fijar_en_base_sincrona`.
- `deploy.sh` corre `alembic upgrade head` antes de la prueba de humo. **Lo que no viaja con git** (archivos de datos grandes, cargas iniciales) se documenta en `docs/deploy-config-REFERENCIA.md` y se sube aparte; en SIMDES varias quejas («no hay puentes», «Ciudad 3D no disponible») eran el servidor sin los datos.

---

## 7. Tareas (Celery) y tiempo real

- Las tareas son **delgadas**: reciben ids, abren su sesión síncrona y llaman al **mismo servicio** que usaría una ruta. Nada de lógica de negocio dentro de `tareas/`.
- **Idempotentes**: una tarea puede correr dos veces (reintentos, beat duplicado). Usa `UNIQUE`, `ON CONFLICT` o comprobación de estado.
- Efectos hacia fuera (correo, webhooks a la website, eventos SSE del panel, invalidar caché, agregados de métricas) **solo por el outbox** (`PLAN-BACKEND.md` §6.4, §10): se escribe en la misma transacción del cambio y Celery lo despacha.
- `rate_limit` y reintentos con espera creciente en todo lo que hable con terceros (iCal, correo).

---

## 8. Contrato con el frontend

- **La forma de los objetos de `frontend/src/data/*.js` y de los almacenes del admin es la que la API debe devolver.** Esos mocks se escribieron pensando en la respuesta del backend: el esquema de salida (`esquemas/`) se diseña mirándolos, no al revés. Si de verdad hay que cambiar una forma, se cambian en el mismo trabajo el esquema, el mock y la pantalla.
- Nombres en **español** y en `snake_case` en la API (`total_centavos`, `habitacion_id`), como el resto del repo.
- **Listas paginadas** con la misma forma en todas partes: `{"items": [...], "meta": {"total": 57, "pagina": 2, "por_pagina": 20, "paginas": 3}}`. La búsqueda y el filtro se hacen **en la base** (`?q=`), no trayendo todo para filtrar en el navegador.
  - **Excepción, las tablas enormes** (historial de reservas, auditoría, eventos): paginación por cursor, `{"items": [...], "meta": {"siguiente": "<cursor>"}}`, sin `total` exacto (`PLAN-BACKEND.md` §9). Con millones de filas, `OFFSET` y `COUNT(*)` se vuelven lentos.
- **Lo que no se sabe no se inventa:** un campo sin dato va `null` (y la pantalla dice «Sin dato»), nunca un valor de relleno que parezca real. Regla de SIMDES: *«los datos que no tenemos se descartan por completo»*.
- FastAPI publica el OpenAPI en `/api/docs`, solo en desarrollo: ahí se revisa el contrato.
