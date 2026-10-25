# Cómo trabajamos: cambios al backend, vistas y pruebas

La forma de trabajar que ya probamos en otro proyecto del equipo (SIMDES: Flask + PostGIS + React), traducida a este stack (FastAPI). Léelo junto con:

- `docs/PLAN-BACKEND.md`: qué se construye (stack, contenedores, autenticación, reservas).
- `docs/BACKEND-ARQUITECTURA.md`: capas, carpetas, errores, configuración, migraciones.
- `docs/BACKEND-USUARIOS-Y-PERMISOS.md`: usuarios, roles, sesiones, auditoría.
- `CLAUDE.md` y `docs/SISTEMA-DE-DISENO.md`: reglas del frontend.

---

## 1. Reglas de siempre

1. **El plan primero.** Si una decisión cambia (una tabla, una ruta, una librería), se cambia en `docs/PLAN-BACKEND.md` **antes** que en el código.
2. **Todo en español**: identificadores, rutas, mensajes, comentarios, commits.
3. **Nada escrito a mano** (URLs, secretos, dominios): variables de entorno con fail fast (arquitectura §5). Lo que el hotel podría querer cambiar va a la base, no a una constante.
4. **Lo que no se sabe no se inventa.** Sin dato, `null` y «Sin dato» en pantalla; nunca un valor de relleno que parezca real.
5. **Los comentarios dicen por qué**, sobre todo cuando el código parece raro a propósito. Si algo se arregló por un reporte, el comentario lo cuenta («reportado: …»): evita que el siguiente lo «simplifique» de vuelta.
6. **Una regla, un lugar.** Si dos rutas necesitan la misma lógica, va al servicio y las dos lo llaman. Nada de copiar y pegar reglas de negocio.
7. **Arreglar la causa, no el síntoma.** Antes de tocar una función, mira quién más la llama: un arreglo en la función compartida corrige a todos; un parche en una sola ruta deja a las demás rotas.
8. **No se dice «listo» sin pruebas que pasen y sin verlo funcionar** (§6). Si algo no se pudo verificar, se dice explícitamente.
9. **Commit y push solo cuando el usuario lo pide.** `main` despliega a producción.

---

## 2. Receta: un cambio de backend de punta a punta

Ejemplo: «las reservas pueden llevar una nota del huésped».

| # | Paso | Dónde | Comprobación |
|---|---|---|---|
| 1 | Decidir y anotar | `docs/PLAN-BACKEND.md` si cambia el contrato | El plan dice lo mismo que vas a hacer |
| 2 | Modelo | `modelos/reservas.py`: `nota: Mapped[str \| None] = mapped_column(String(500))` | — |
| 3 | Migración | `uv run alembic revision --autogenerate -m "nota en reservas"` → **leerla**, añadir docstring con el porqué y `downgrade` | `alembic upgrade head` y `alembic downgrade -1` corren |
| 4 | Repositorio | Solo si cambia una consulta | — |
| 5 | Servicio | La regla («máximo 500 caracteres, sin HTML», «solo mientras no esté completada») | Prueba unitaria |
| 6 | Esquemas | `esquemas/reservas.py`: entrada (con `max_length`) y salida | — |
| 7 | Ruta | Solo si hace falta una nueva; si no, ya viaja en la existente | Prueba de integración: 200, 401, 403, 422 |
| 8 | Frontend | El mock (`src/data/`), la vista y el cliente API (§3) | Lint y build; verlo en el navegador |
| 9 | Despliegue | ¿Variable nueva? ¿Datos que no viajan con git? → `docs/deploy-config-REFERENCIA.md` | `./scripts/deploy.sh --dry-run` |

**Orden de abajo arriba** (modelo → migración → servicio → esquema → ruta → vista) y **una rebanada completa a la vez**: mejor una función terminada de punta a punta que cinco capas a medias.

---

## 3. Vistas: cómo se conecta una pantalla a la API

El frontend ya existe con datos simulados (`src/data/*.js`, almacenes `admin/avisos.js`, `admin/reservas.js`, `admin/restaurante.js`). Conectar una pantalla es **cambiar de dónde salen los datos, no cómo se pintan**.

### 3.1 Un solo cliente

Toda llamada pasa por `src/lib/api.js` (a crear en la fase 1 del plan). Nadie llama `fetch` suelto:

```js
// src/lib/api.js: el único lugar que habla con el backend
export async function api(ruta, { metodo = 'GET', cuerpo, idempotencia, senal } = {}) {
  const cabeceras = { Accept: 'application/json' };
  if (cuerpo !== undefined) cabeceras['Content-Type'] = 'application/json';
  // CSRF de doble envío (AuthX): la cookie legible se reenvía en la cabecera
  // en todo lo que modifica.
  if (metodo !== 'GET') cabeceras['X-CSRF-TOKEN'] = leerCookie('csrf_access_token') ?? '';
  if (idempotencia) cabeceras['Idempotency-Key'] = idempotencia;
  const r = await conTope(fetch(ruta, { method: metodo, headers: cabeceras, credentials: 'include',
    body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo), signal: senal }));
  if (r.status === 401 && ruta !== '/api/auth/renovar' && await renovarUnaVez()) return api(ruta, { metodo, cuerpo, idempotencia, senal });
  const datos = r.status === 204 ? null : await r.json().catch(() => null);
  if (!r.ok) throw new ErrorApi(datos?.error ?? 'No se pudo completar', r.status, datos);
  return datos;
}
```

Lecciones de SIMDES que ya trae ese cliente:

- **Un 401 renueva UNA vez y reintenta**, y si la renovación también da 401 se va a `/entrar`. Varias peticiones que fallan a la vez comparten **una sola** renovación en vuelo (si no, cada una rota el token y se pisan entre sí).
- **Toda petición tiene tope de tiempo** (`conTope`, 12 s en auth y 30 s en el resto). En SIMDES, un iPhone se quedaba en «Entrando…» para siempre porque la respuesta nunca llegaba.
- **`Idempotency-Key`**: un **UUID v7 por intento** (`import { v7 as uuidv7 } from 'uuid'`, generado al pulsar «Reservar», no en cada reintento de red), para que el doble clic no duplique (`PLAN-BACKEND.md` §7). La API acepta cualquier UUID; usamos v7 en todos lados por consistencia con las llaves de la base.
- El **mensaje del error** se muestra tal cual: el backend ya lo escribe para la persona.

### 3.2 Cada pantalla, tres estados más el de vacío

Toda vista que pide datos pinta explícitamente:

1. **Cargando:** esqueleto con la forma del contenido (no un spinner en medio de la nada).
2. **Error:** el mensaje del backend y un «Reintentar».
3. **Vacío:** qué significa y qué hacer («Aún no tienes reservas. Ver habitaciones»).
4. **Datos.**

### 3.3 Reglas de las vistas (del `CLAUDE.md` del repo)

- **La URL es la fuente de verdad** de la pantalla: filtros, página y búsqueda viajan en `?parámetros` (`useParametros`) y se mandan tal cual a la API (`/api/habitaciones?pagina=2&q=…`). Recargar o compartir el enlace deja todo igual.
- **La búsqueda y el filtro los hace la base**, no el navegador: se pide solo la página visible.
- **Lo que llega por SSE** (`EventSource('/api/eventos')`) **actualiza el almacén**, no recarga la pantalla. Al reconectar, el navegador manda `Last-Event-ID` solo y el servidor reenvía lo perdido (`PLAN-BACKEND.md` §10).
- **Fechas en la URL y en la API como `AAAA-MM-DD` en hora local** (`src/lib/fechas.js`, nunca `toISOString`). Dinero en centavos hasta el último momento: se formatea solo al pintar.
- **La guardia del frontend no protege nada:** `RutaProtegida` evita parpadeos, pero la API responde 401/403 por su cuenta.

---

## 4. Pruebas

### 4.1 Qué se prueba

| Tipo | Qué | Cómo |
|---|---|---|
| **Unitarias** (`tests/unitarias/`) | Servicios y funciones puras: tarifas, reglas de reserva, permisos | Sin HTTP. La base solo si la regla la necesita |
| **Integración** (`tests/integracion/`) | Cada ruta: el caso feliz, 401, 403, 404 de lo ajeno, 422 de validación | `httpx.AsyncClient` contra la app, con **Postgres de verdad** |
| **Concurrencia** | La exclusión `sin_choque`, la idempotencia | Dos retenciones simultáneas de la misma habitación: una gana y la otra recibe 409 |
| **Contrato** | Que toda ruta del panel declare permiso | Una prueba recorre `app.routes` y falla si una ruta `/api/admin/*` no depende de `requiere_permiso`/`solo_personal` |

**Postgres de verdad, no SQLite:** la exclusión por rango, `uuidv7()`, `citext` y `JSONB` no existen en SQLite, y una prueba que pasa contra otra base no prueba nada.

### 4.2 Cada prueba deja la base como la encontró

Lección dura de SIMDES: allí las fixtures eran de **sesión** (una app y una conexión para todas las pruebas) y las pruebas se pisaban los datos entre sí. Aquí **cada prueba corre dentro de una transacción que se revierte al terminar**:

```python
# tests/conftest.py
@pytest.fixture(scope="session")
async def motor():
    m = create_async_engine(config.database_url_pruebas)   # una base APARTE: beachclub_pruebas
    async with m.begin() as c:
        await c.run_sync(lambda s: command.upgrade(alembic_cfg(s), "head"))  # o alembic por subprocess
    yield m
    await m.dispose()


@pytest.fixture
async def sesion(motor):
    async with motor.connect() as conexion:
        trans = await conexion.begin()
        s = AsyncSession(bind=conexion, expire_on_commit=False,
                         join_transaction_mode="create_savepoint")   # el commit del código = SAVEPOINT
        try:
            yield s
        finally:
            await s.close()
            await trans.rollback()                                    # nada queda


@pytest.fixture
async def cliente(sesion):
    app.dependency_overrides[get_sesion] = lambda: sesion
    async with AsyncClient(transport=ASGITransport(app=app), base_url="https://prueba") as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture
async def como(cliente, sesion):
    """`await como("recepcion")` deja al cliente con la sesión de ese rol (cookies + CSRF)."""
    ...
```

- La base de pruebas es **otra base** (`beachclub_pruebas`), nunca la de desarrollo.
- Los datos de cada prueba los crea la propia prueba (fábricas en `tests/fabricas.py`: `crear_habitacion(sesion, capacidad=2)`), no un volcado compartido.
- Las pruebas de concurrencia necesitan **dos conexiones reales** (no la sesión revertida): esas sí limpian al final por su cuenta.

### 4.3 Cómo se corren

Igual que el frontend: dentro del contenedor de desarrollo.

```bash
DEVB="docker compose -f docker-compose.dev.yml exec api"
$DEVB uv run pytest -q                      # todo
$DEVB uv run pytest -q tests/integracion/test_reservas.py -k choque
$DEVB uv run ruff check . && $DEVB uv run ruff format --check .
$DEVB uv run pip-audit                      # CI falla con severidad alta
```

CI (`.github/workflows/ci.yml`, a extender en la fase 1 del plan) corre ruff, pytest contra un Postgres 18 de servicio, pip-audit, y luego lint y build del frontend. **Si CI no pasa, no se despliega.**

---

## 5. Antes de decir «listo»

- [ ] Pruebas nuevas para lo nuevo (y la de 401/403 si es una ruta).
- [ ] `pytest`, `ruff`, y en el frontend `npm run lint && npm run build`: todo verde. Si algo ya fallaba antes de tu cambio, se dice cuál y por qué no es tuyo.
- [ ] **Visto funcionar**: la pantalla en el navegador con la API de verdad (no solo el test). Para lo visual se mira en claro y en oscuro, y en teléfono.
- [ ] Migración leída, con docstring y `downgrade`.
- [ ] Variables nuevas, archivos que no viajan con git o pasos manuales anotados en `docs/deploy-config-REFERENCIA.md`.
- [ ] `PLAN-BACKEND.md` al día si cambió el contrato.

---

## 6. Lecciones de SIMDES que aplican aquí

Errores reales que ya nos costaron y no hay que repetir:

| Pasó | Regla |
|---|---|
| Un script de datos corría después de las migraciones y pisaba lo que una migración había corregido; otro borró un catálogo entero | Los datos fijos van **en la migración**. Los scripts de datos son idempotentes y **nunca borran** |
| Producción no tenía los archivos de datos (no viajan con git) y la app decía «no disponible» sin que nada lo detectara | Todo lo que no viaja con git se lista en `deploy-config-REFERENCIA.md` y se verifica en el servidor tras desplegar |
| Un cambio solo en el servidor (fuera del repo) se perdió en el siguiente despliegue (`git reset --hard`) | Nada se edita a mano en el servidor sin llevarlo también al repo |
| Una regla copiada en dos rutas dejó de coincidir sin que ninguna prueba lo viera | Una regla, un servicio |
| El login tardaba distinto si el usuario existía o no | Verificar contra un hash de relleno (usuarios §5) |
| La lista de «sesiones abiertas» mostraba la fecha de creación como «último acceso» | Columna `usada`, actualizada al renovar (usuarios §4) |
| Peticiones colgadas para siempre en iPhone | Tope de tiempo en el cliente (§3.1) |
| Pruebas que se pisaban los datos por compartir una sesión de base | Transacción revertida por prueba (§4.2) |
| Valores «por defecto» silenciosos que ocultaban configuración ausente | Fail fast: si falta, no arranca (arquitectura §5) |
| Dato que no teníamos, rellenado con un número «razonable» que la gente tomó por real | `null` y «Sin dato» |
