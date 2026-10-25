# Plan del backend

Decisiones tomadas con el usuario (septiembre y octubre de 2026). El código va por fases (§16); este documento es su contrato. Lo que cambie, se cambia aquí primero.

Lo que el despliegue necesita cuando llegue el backend (compose, Nginx, secretos, migraciones, prueba de humo, CI) ya está listado en `docs/deploy-config-REFERENCIA.md` §7. Aquí solo se añade lo específico de este stack.

Este documento fija **qué** se construye. **Cómo** se escribe está en sus hermanos (si chocan, manda este y se corrigen ellos):

- `docs/BACKEND-ARQUITECTURA.md`: capas (`rutas` → `servicios` → `repositorios` → `modelos`, más `esquemas`), errores, configuración, migraciones.
- `docs/BACKEND-USUARIOS-Y-PERMISOS.md`: usuarios, roles y permisos, sesiones, auditoría.
- `docs/BACKEND-COMO-TRABAJAMOS.md`: la receta de cada cambio, el cliente API del frontend y las pruebas.

---

## ⚠️ PENDIENTES DE SUMA IMPORTANCIA (aún sin decidir)

**No construir lo que dependa de esto hasta que el usuario decida.** Cada pendiente dice qué bloquea.

| # | Pendiente | Por qué importa | Bloquea |
|---|---|---|---|
| 1 | **Proveedor de pagos** | Debe permitir **autorizar primero y cobrar después** (captura manual). Si el elegido no lo permite, el plan cae a cobrar directo con **reembolso automático** cuando la reserva no se pueda confirmar (§5.2) | Paso 8 (pagos) |
| 2 | **WordPress, Shopify o ambos** | Define dónde se prueba el widget y qué integración se escribe primero (§4.1) | Paso 7 (widget) |
| 3 | **Si Shopify cobra con su propio checkout** | Posible y contemplado (§4.1), pero es más simple y seguro que cobre nuestro widget. Solo aplica si se elige Shopify | Paso 8, si se elige Shopify |
| 4 | **Boutique y Restaurante** | Siguen apagados en el panel, sin borrar (`frontend/src/admin/modulos.js`). Sin API ni tablas hasta decidir si y cuándo se encienden | Paso 10 |
| 5 | **A dónde se copian los respaldos fuera del droplet** | `scripts/respaldo.sh` ya respalda la base y las fotos cada día en el droplet (§8), pero un respaldo en el mismo disco no sobrevive a perder el droplet. Opciones: DigitalOcean Spaces, otro servidor o el equipo de los dueños (como la auditoría) | Nada (no bloquea), pero es riesgo hasta decidirlo |

Ya decidido, para no volver a preguntarlo: la **auditoría y sus sellos se quedan en el droplet**; los dueños del sistema (root) los copian a mano a su equipo, y solo ellos la consultan (la pantalla del panel para verla se decidirá después; hoy el permiso `auditoria.ver` lo tiene el rol gerente y hay que revisarlo entonces) (2026-10-11). el cobro puede ser **anticipo o pago completo, y se elige desde el panel** (§5.4); las **sesiones duran 12 h** (§11); se queda **Celery con Redis**, así que son **5 contenedores** (§2).

---

## 0. Qué es el producto

**Hoteles Frida es un motor de reservas interno** (el panel, para el personal) **con una API pública** para que la website del hotel, hecha en **WordPress o Shopify**, consulte disponibilidad, reserve y cobre.

- **No hay website propia.** La que existía está **oculta, no borrada**, en `frontend/src/website` (interruptor en `frontend/src/lib/producto.js`). Toda URL suya manda al login.
- **No hay cuentas de huésped.** El huésped reserva desde la website externa y consulta su reserva con su código y su correo. El rol `huesped` del frontend está apagado en el mismo interruptor.
- **Por ahora las reservas se hacen a mano en el panel** (las captura el personal). La API pública, el widget y los pagos en línea esperan a los pendientes 1–3.
- **Primera entrega: solo el motor de reservas.** Boutique (tienda + ventas) y Restaurante siguen apagados en el panel (`frontend/src/admin/modulos.js`). No se borran; **están pendientes de decidir** (pendiente 4) y su API se hará cuando se enciendan.

---

## 1. Decisiones

| Tema | Decisión | Por qué |
|---|---|---|
| Estilo | **Monolito modular en capas**, desplegado en 5 contenedores | Una base y una transacción para la reserva, su pago y su aviso. Microservicios añadirían red y consistencia eventual justo donde no se quiere |
| API | **FastAPI** (async) bajo Uvicorn, un proceso por núcleo | Concurrencia alta por proceso; OpenAPI como contrato con el panel y con las websites |
| Base de datos | **PostgreSQL 18** | ACID, restricción de exclusión (cero sobreventa garantizada por la base), `uuidv7()` nativo, particionado y BRIN para tablas grandes |
| ORM | **SQLAlchemy 2.1** + **Alembic** | Modelos tipados compartidos por la API (sesión async) y Celery (sesión síncrona) |
| Integración con la website | **API pública versionada** (`/api/v1/...`) + **widget embebible** + **webhooks salientes firmados** | Funciona igual en WordPress y en Shopify (ver §4) |
| Pagos | **Proveedor pendiente** (pendiente 1); flujo diseñado con **autorizar → confirmar → capturar**. **Anticipo o pago completo**, elegido desde el panel | Ningún cobro sin reserva y ninguna reserva sin pago (ver §5) |
| Idempotencia | `Idempotency-Key` obligatoria en todo `POST` público + llaves `uuidv7` | Doble clic, reintentos de red y webhooks repetidos no duplican nada (ver §7) |
| Tiempo real | **SSE** para el panel y **webhooks** para las websites. **Sin WebSocket** | Nadie interactúa en tiempo real; solo se avisa. SSE es más simple, pasa por Nginx y reconecta solo (ver §10) |
| Métricas | **Agregados precalculados** + particionado | El tablero tarda lo mismo con mil que con un millón de reservas (ver §9) |
| Autenticación del panel | **AuthX + pwdlib + Authlib** dentro de FastAPI. Solo personal | Sin servicios extra ni Node (ver §11) |
| Caché | **Nginx** para lo público, **Redis** para lo privado y calculado | Lo público se responde sin tocar ni la API ni la base (ver §12) |
| Tareas | **Celery** con Redis como broker, **beat dentro del worker** | Outbox, webhooks, retenciones que vencen, conciliación de pagos, agregados, iCal |

Descartado: Better Auth (solo TypeScript), fastapi-users (en modo mantenimiento), SuperTokens (núcleo en Java), microservicios, WebSocket (ver §10).

---

## 2. Arquitectura y contenedores (5)

```
  Website del hotel (WordPress / Shopify)          Proveedor de pagos
    └─ widget (iframe desde nuestro dominio)          │  ▲
         │ HTTPS: disponibilidad, reservar            │  │ autorizar / capturar / anular
         ▼                                            │  │
  nginx (TLS · panel · widget · microcaché) ◄─────────┘  │ webhooks del proveedor
    ├─ /api/v1/*        → api   (pública, con clave del sitio; GET cacheados)
    ├─ /api/admin/*     → api   (personal, cookie de sesión; sin caché)
    ├─ /api/auth/*      → api   (login del personal; sin caché)
    ├─ /api/eventos     → api   (SSE del panel)
    └─ /api/webhooks/*  → api   (entrantes: pagos)
                           │ una transacción ACID por operación
                           ▼
                        postgres 18  ◄──── celery (worker + beat)
                           ▲                 │  outbox → webhooks salientes a la website,
                           │                 │  correos, agregados, conciliación, SSE
                        redis 8 ◄────────────┘  (caché, cola, pub/sub, límites)
```

| Contenedor | Imagen | Tope de memoria inicial | Notas |
|---|---|---|---|
| `frontend` (nginx) | la actual (`beachclub-frontend`) | 128M | Único con `ports`. Sirve el panel y el widget, y hace de proxy con caché de `/api` |
| `api` | `beachclub-backend` | 512M | `uvicorn app.main:app --workers N` |
| `celery` | **la misma** `beachclub-backend` | 512M | `celery -A app.tareas worker --beat -Q default,pagos,webhooks,bot` |
| `postgres` | `postgres:18` | 1G | Volumen propio; respaldos en §8 |
| `redis` | `redis:8` | 320M | `maxmemory 256mb`, `maxmemory-policy volatile-lru`, `appendonly yes` |

- **Droplet: 4 GB de RAM como mínimo.**
- **Por qué 5 y no menos** (el usuario pidió reducir lo posible, 2026-10-11): con Celery, Redis es obligatorio (es su broker), y meter la API y el worker en un mismo contenedor quita los reinicios y topes de memoria por separado. Ya se ahorra un sexto contenedor poniendo beat dentro del worker, y Flower no se levanta. Se evaluó bajar a 4 cambiando Celery por una cola en Postgres (procrastinate) y el usuario prefirió quedarse con **Celery y Redis**.
- **Beat va dentro del worker mientras haya UN solo contenedor `celery`.** Si se escala a varias réplicas, beat sale a su propio contenedor: dos beats lanzan cada tarea dos veces.
- **Por capas** (detalle en `docs/BACKEND-ARQUITECTURA.md`): `rutas` (HTTP: validar y responder) → `servicios` (reglas del negocio, transacciones, outbox) → `repositorios` (consultas) → `modelos` (SQLAlchemy) → Postgres, con `esquemas` (Pydantic) como contrato. Celery entra por la misma capa de servicios, nunca por HTTP.

---

## 3. Versiones (consultadas el 2026-10-11)

**Regla: siempre la última versión estable** al empezar cada fase, fijada en `uv.lock` (con hashes) y `package-lock.json`. Antes de cada fase se vuelve a consultar.

| Pieza | Versión |
|---|---|
| **Python** | **3.15.0** (salió el 2026-10-09; todas las dependencias compiladas ya publican ruedas para 3.15). Su imagen oficial de Docker **aún no existe** (solo candidatas): se arranca con **3.14.8** (`python:3.14-slim-trixie`) y se cambia una línea al publicarse `python:3.15-slim-trixie`. Las dos traen `uuid.uuid7()` |
| FastAPI / Uvicorn (+ uvloop, httptools) | 0.143.0 / 0.54.0 (0.23.0, 0.9.0) |
| Pydantic / pydantic-settings | 2.14.0 / 2.15.0 |
| SQLAlchemy / Alembic | 2.1.4 / 1.20.0 |
| psycopg (async y síncrono, con pool) | 3.3.6 |
| Celery / kombu / redis-py | 5.6.3 / 5.6.2 / **6.4.0** (redis-py 8 existe, pero el kombu estable exige < 6.5; la 8 solo resolvía con kombu 5.7 **beta**. Se sube cuando kombu 5.7 sea estable. El proyecto prohíbe versiones beta: `prerelease = "disallow"`) |
| AuthX / pwdlib / Authlib | 1.7.1 / 0.3.1 / 1.8.0 |
| Pillow / nh3 / python-multipart | 12.3.0 / 0.3.7 / 0.0.32 |
| httpx / icalendar / orjson | 0.28.1 / 7.3.0 / 3.13.0 |
| structlog / sentry-sdk | 26.1.0 / 2.71.0 |
| Bot: Scrapy / scrapy-playwright / Playwright | 2.19.0 / 0.0.48 / 1.63.0 |
| Bot: selectolax / Protego / trafilatura / extruct | 1.0.0 / 0.7.0 / 2.3.1 / 0.18.0 |
| Pruebas: pytest / pytest-asyncio / Hypothesis | 9.1.1 / 1.4.0 / 6.169.0 |
| uv / ruff / pip-audit | 0.13.0 / 0.17.0 / 2.10.1 |
| PostgreSQL / Redis / Nginx | 18.6 / 8.10.2 / 1.31.6 |
| Node (compilar el panel) | 26 LTS |

**Vulnerabilidades:** `uv.lock` con hashes en git; `pip-audit` en CI **que falla** ante severidad alta; Dependabot semanal; imagen base fijada por digest y escaneada con Trivy.

---

## 4. Integración con la website (WordPress o Shopify)

### 4.1 Cómo se conecta

**Recomendado: widget embebido.** La website pega una sola línea y aparece el buscador y el flujo de reserva, servido desde **nuestro** dominio dentro de un `iframe`:

```html
<script src="https://<nuestro-dominio>/widget/v1.js" data-sitio="pk_live_…" async></script>
```

- **WordPress:** un bloque "HTML personalizado" con esa línea, o un plugin mínimo que la inserte con un shortcode `[frida_reservas]`. Sin lógica en PHP.
- **Shopify:** una sección o "app embed" del tema con la misma línea.
- **Por qué `iframe`:** los estilos del tema de WordPress o Shopify no rompen el flujo (ni al revés), la política de seguridad la controlamos nosotros y el pago sale de un sitio que conocemos.
- El flujo de reserva **reaprovecha** lo que ya está hecho en la website respaldada (buscador, fechas, pasos de la reserva), con la marca de cada sitio por configuración.

**Alternativa servidor a servidor:** si un sitio prefiere su propio diseño, llama a la misma API desde su servidor con la **clave secreta** del sitio. Sigue las mismas reglas: idempotencia, retención y pago.

**Si el sitio quiere cobrar con su propio checkout** (por ejemplo, el de Shopify): la reserva se crea como `retenida` igual que siempre. El pedido pagado de Shopify llega a nuestro `POST /api/webhooks/shopify` (firma HMAC verificada) y confirma la reserva con la misma máquina de estados de §5. Es posible, pero el checkout propio (§5) es más simple y más seguro: elegirlo junto con el proveedor de pagos.

### 4.2 Claves por sitio

Tabla `sitios`, una fila por website:

| Clave | Dónde vive | Para qué |
|---|---|---|
| **Pública** (`pk_…`) | En el HTML del sitio (no es secreta) | Disponibilidad, cotizar y crear retenciones. Solo se acepta desde los **orígenes permitidos** del sitio (CORS) |
| **Secreta** (`sk_…`) | Solo en el servidor del sitio | Integración servidor a servidor: `Authorization: Bearer sk_…` sobre TLS |
| **Secreto de webhooks** (`whsec_…`) | Solo en el servidor del sitio | Para que el sitio verifique que nuestros avisos son nuestros |

En la base se guarda el **hash** (SHA-256) de la clave secreta, nunca la clave. **Límite de peticiones** en Redis: 600 por minuto por sitio y 20 escrituras por minuto por IP (si Redis cae, deja pasar). Las claves se **rotan** (las viejas dejan de servir al instante) o el sitio se **revoca** desde el panel (Configuración → Sitios web, permiso `sitios.gestionar`); los secretos se muestran una sola vez y nunca entran a la auditoría.

**Hecho así (fase 6, 2026-10-12), con dos cambios sobre la idea original:**
- La clave secreta va como **portador** y se compara su hash: firmar cada petición con HMAC exigiría guardar la clave legible, y eso contradice guardar solo el hash. Es lo que hacen Stripe y compañía, siempre sobre TLS.
- El **secreto de webhooks no se guarda**: se deriva de `CLAVE_WEBHOOKS` (secreto del servidor) + id del sitio + una versión; "nuevo secreto" sube la versión.
- La clave pública va en la cabecera **`X-Frida-Clave`**. Solo se acepta desde los orígenes del sitio (exactos, `https://dominio`); sin cabecera `Origin` (servidor, curl) pasa, porque solo sirve para ver, cotizar y retener. La verificación previa de CORS (OPTIONS) acepta el origen de cualquier sitio vigente (la pregunta no trae la clave); la petición real comprueba el de ESE sitio. Cuando se haga el widget (paso 7), su propio dominio tendrá que entrar en los orígenes de cada sitio.

### 4.3 API pública v1

| Método y ruta | Qué hace | Caché |
|---|---|---|
| `GET /api/v1/disponibilidad?llegada&salida&huespedes` | Habitaciones libres con precio total | Nginx 5 s |
| `GET /api/v1/habitaciones` | Catálogo (fotos, tipo, capacidad, tarifas base) | Nginx 60 s |
| `POST /api/v1/reservas` | **Crea la retención** (15 min) y devuelve el enlace de pago. `Idempotency-Key` obligatoria | Nunca |
| `GET /api/v1/reservas/{codigo}?t=…` | Estado de una reserva (con el token del enlace del correo) | Nunca |
| `POST /api/v1/reservas/{codigo}/cancelar` | Cancela según la política. `Idempotency-Key` obligatoria | Nunca |

- **Versionada:** un cambio que rompe algo va a `/api/v2`; `v1` se mantiene mientras haya sitios usándola.
- **Errores con la forma única del repo** (`BACKEND-ARQUITECTURA.md` §4): `{"error": "<frase para la persona>", "codigo": "<para la máquina>"}`, por ejemplo `409 {"error": "Esas fechas se acaban de ocupar", "codigo": "sin_disponibilidad"}` o `409 … "codigo": "retencion_vencida"`. El widget muestra `error` tal cual y decide qué hacer con `codigo`.
- **Código de reserva público** (`FRD-7K2M9Q`): corto, aleatorio, para el huésped. No es el `uuid` interno: un `uuidv7` revela la hora en que se creó.
- **Hecho (fase 6, 2026-10-12):** el sitio solo ve y reserva habitaciones **activas** de las propiedades que vende (alcance + RLS; las de mantenimiento no se ofrecen). Las fotos salen con URL absoluta. Retener devuelve el código, el **token del huésped** (`t`, se guarda solo su hash; con él se consulta o cancela) y los montos ya calculados (`pagar_hoy_centavos`, `pagar_en_hotel_centavos`). **Hasta que haya proveedor de pagos (PENDIENTE 1), `enlace_pago` es `null`**: la retención aparta las noches y vence sola a los 15 min (Celery, cada minuto, con historial, auditoría y aviso al sitio). **Cancelar por la API solo libera una retención**; una reserva confirmada se cancela con el hotel hasta que exista la política de cancelación (§5.4). Las retenciones no generan avisos en la campana del panel (la mayoría vencen sin pagarse); sí aparecen en la Línea de tiempo como "pendiente de pago".

### 4.4 Webhooks salientes (avisarle a la website)

Cuando una reserva cambia (`reserva.confirmada`, `reserva.expirada`, `reserva.cancelada`), el outbox (§6.4) manda un `POST` a la URL que el sitio registró:

- **Firmado:** `X-Frida-Firma: t=<marca de tiempo>,v1=<HMAC-SHA256 del cuerpo>`, con el secreto de webhooks del sitio.
- **Con `id` de evento** (`uuidv7`) para que el sitio ignore duplicados.
- **Reintentos con espera creciente** durante 24 h (1 min, 5 min, 30 min, 2 h…). Si el sitio sigue sin responder, el evento queda marcado y aparece un aviso en el panel.
- **Hecho (fase 6, 2026-10-12):** el despachador del outbox crea una fila en `entregas_webhook` por evento y sitio (`UNIQUE (sitio_id, evento_id)`); Celery las aparta cada 15 s (SKIP LOCKED), las manda **fuera de toda transacción** (httpx: 5 s conectar, 15 s total, sin seguir redirecciones) y guarda el resultado. Esperas: 1 min, 5 min, 30 min, 2 h, 6 h y 15 h; al séptimo fallo, `fallida` + aviso en el panel, y el gerente puede reintentarla. **Solo `https` y solo direcciones públicas** (contra SSRF: un webhook no puede apuntar a la red interna). Eventos: `reserva.expirada`, `reserva.cancelada`, `reserva.modificada` (y `reserva.confirmada` cuando lleguen los pagos). El cuerpo no lleva datos personales del huésped ni su token.

---

## 5. Reserva y pago: nunca uno sin el otro

### 5.1 El flujo

```
website/widget            api + postgres                          proveedor de pagos
     │ POST /v1/reservas    │                                            │
     │ Idempotency-Key ───► │ TX1: reserva 'retenida' (15 min)            │
     │                      │      + pago 'pendiente' + outbox  (COMMIT)  │
     │                      │ crear cobro (clave idempotente = pago.id) ─►│ (fuera de la TX)
     │ ◄── enlace de pago ──│                                            │
     │ (el huésped paga) ───────────────────────────────────────────────►│ AUTORIZA (no cobra aún)
     │                      │ ◄── webhook "autorizado" ──────────────────│
     │                      │ TX2: reserva FOR UPDATE                     │
     │                      │   ¿sigue retenida? → 'confirmada' (COMMIT)  │
     │                      │ captura (clave idempotente = pago.id) ─────►│ COBRA
     │ ◄── webhook a la website: reserva.confirmada                      │
```

1. **Retener:** en **una transacción** se crean la reserva `retenida` (vence en 15 min), su pago `pendiente` y el evento del outbox. La restricción de exclusión (§6.2) garantiza que nadie más puede retener esas noches.
2. **Crear el cobro** en el proveedor **fuera de la transacción**: una transacción nunca espera a un servicio externo. La clave de idempotencia del proveedor es `pago.id`, así que reintentar nunca crea dos cobros.
3. **Autorizar, no cobrar todavía:** el proveedor solo aparta el dinero (captura manual).
4. **Confirmar:** al llegar el webhook "autorizado", una transacción bloquea la reserva (`SELECT … FOR UPDATE`) y, si sigue `retenida`, la pasa a `confirmada`.
5. **Capturar:** solo con la reserva ya confirmada se cobra el dinero apartado.

### 5.2 Qué pasa cuando algo falla

| Falla | Resultado | Quién lo resuelve |
|---|---|---|
| El proveedor no responde al crear el cobro | La retención se libera en el acto; el widget dice "intenta de nuevo" (`503` con `Retry-After`) | La API, en la misma petición |
| El huésped no paga en 15 min o el pago es rechazado | Reserva `expirada`, noches liberadas, pago `fallido` | Beat (cada minuto) o el webhook de rechazo |
| La autorización llega **después** de vencer la retención | Se intenta volver a confirmar. Si las noches siguen libres, se confirma; si ya las tomó otro, se **anula la autorización**: el dinero nunca se cobró | Celery |
| La captura falla después de confirmar | Reintentos idempotentes; si se agotan, aviso al panel. La autorización dura días, hay margen | Celery + personal |
| Se pierde un webhook del proveedor | La **conciliación** (beat, cada 10 min) consulta al proveedor el estado de los pagos `pendientes` o `autorizados` de más de 15 min y aplica lo que falte | Celery |
| Llega dos veces el mismo webhook | El segundo choca con `UNIQUE (proveedor, evento_id)` y se ignora | La base |
| El proveedor no ofrece captura manual | Se cobra directo; si la reserva no puede confirmarse, se **reembolsa automáticamente** | Celery |

**Las dos reglas que nunca se rompen** (las vigila además una consulta de conciliación diaria que avisa al panel si encuentra alguna excepción):

- **Ninguna reserva `confirmada` sin su pago (el anticipo o el total, según la modalidad de §5.4) autorizado o cobrado**, salvo las que el personal registra a mano ("paga en el hotel").
- **Ningún dinero cobrado sin reserva confirmada.** Si pasa, se reembolsa sola.

### 5.3 Estados

| Reserva | Pago |
|---|---|
| `retenida` → `confirmada` → `en_curso` → `completada` | `pendiente` → `autorizado` → `cobrado` |
| `retenida` → `expirada` | `pendiente` → `fallido` |
| `confirmada` → `cancelada` | `autorizado` → `anulado`; `cobrado` → `reembolsado` |

Cada transición es una función de la capa de servicios que **verifica el estado de origen dentro de la transacción**. Una transición no permitida (por ejemplo, de `expirada` a `confirmada` sin pasar por la recomprobación) lanza un error, no se aplica a medias. Cada cambio queda en `reservas_eventos` (historial: quién, cuándo, de qué estado a cuál).

### 5.3.1 Reglas de las reservas del panel (fase 3c)

- Nacen `confirmada` (las captura el personal). La llegada no puede ser en el pasado.
- La llegada (`en_curso`) se registra el día de la estancia; la salida (`completada`) **exige que no quede saldo por cobrar**.
- Mover respeta lo pactado: la tarifa por noche y la modalidad de la reserva, no las de hoy. Una reserva no cambia de propiedad; una `en_curso` solo cambia su salida o su habitación.
- **Abonos libres (2026-10-12):** lo pagado funciona como un saldo a favor que cubre las noches en orden. Al reservar en el panel se puede cobrar lo de la política, una o varias noches, todo, o el monto que deje el huésped (`pago_inicial.monto_centavos`, hasta el total); después, lo que sea hasta liquidar ("1 noche", "N noches", "Todo (liquidar)" o un monto propio). El concepto lo pone el sistema: `anticipo`, `abono`, `saldo` o `total`. La cotización trae `precios_noche_centavos` para los atajos.
- **Analítica "Cómo pagan los huéspedes"** (`GET /api/admin/metricas/pagos?dias=`, Tablero): de las estancias terminadas en el periodo, una categoría por estancia, la primera que cumpla: de una vez (un solo pago cubrió todo), todo al llegar (pagado a más tardar el día del check-in), liquidaron al salir (la mitad o más la última noche o el día del check-out), en abonos (pagos en 2 o más días durante la estancia), otra. Fechas de Mérida; las devoluciones no cuentan.
- **Cobro noche por noche (2026-10-12):** el detalle trae `desglose`: cada noche con su parte del total PACTADO (proporcional al precio de esa noche, temporadas incluidas, exacto al centavo) y cuánto de ella está pagado (lo pagado cubre las noches en orden). Cobrar "hasta esta noche" es un pago más (`abono`, o `saldo`/`total` si cubre todo). El check-out con deuda se hace como "cobrar lo pendiente y salir" (dos pasos en la misma acción del panel). En el panel: **Llegadas y salidas** (`/admin/llegadas-y-salidas`).
- Los bloqueos de mantenimiento son reservas `tipo = bloqueo`: ocupan noches, sin huésped ni dinero; se puede bloquear una habitación en mantenimiento.

### 5.4 Anticipo o pago completo (se elige desde el panel)

> **Cambio (decisión del usuario, 2026-10-24): en el PANEL no hay política de cobro.** Al capturar una reserva se registra lo que el cliente ya pagó (nada, unas noches, todo u otro monto) y el resto se cobra después (§5.3.1, abonos libres). Se quitó Configuración → Cobro de reservas. La tabla `ajustes_cobro` y su ruta siguen en el backend (cada propiedad en `completo`) porque la API pública la usa para decir cuánto se paga hoy en una reserva de la web; se revisará cuando se elija el proveedor de pagos (PENDIENTE 1).

La **modalidad de cobro** es un ajuste del hotel, no una constante del código (regla de `BACKEND-ARQUITECTURA.md` §5). La cambia un gerente en el panel (Configuración → Cobro de reservas; permiso `ajustes.cobro`), **por propiedad** (Chelem y Chuburná pueden cobrar distinto):

| Modalidad | Qué se cobra al reservar | El resto |
|---|---|---|
| `completo` | El total de la estancia | Nada |
| `anticipo` | Un porcentaje del total (1–99 %, lo fija el gerente) | El **saldo**, en el hotel |

- **Cada reserva guarda su copia** de lo que se aplicó: `modalidad`, `total_centavos`, `anticipo_centavos` y `saldo_centavos`. Cambiar el ajuste solo afecta a las reservas nuevas, nunca a las ya hechas. El cambio del ajuste queda en la auditoría (quién, cuándo, de qué a qué).
- **Cada cobro es una fila en `pagos`** con su `concepto`: `anticipo`, `total` o `saldo`. El flujo de §5.1 (retener → autorizar → confirmar → capturar) es igual para `anticipo` y `total`; lo único que cambia es el monto.
- **El saldo** se registra en el panel al hacer el check-in (efectivo o tarjeta en el hotel; `metodo = 'en_hotel'`). La reserva pasa a `en_curso` aunque el saldo siga pendiente, y el panel lo muestra como "saldo por cobrar". Cobrar el saldo en línea antes de la llegada depende del proveedor de pagos (pendiente 1).
- **El widget muestra claro** cuánto se cobra hoy y cuánto en el hotel antes de pagar. La API lo devuelve ya calculado, para que ningún sitio calcule montos por su cuenta.
- **Política de cancelación** (cuánto del anticipo o del total se devuelve y hasta cuándo): también ajuste del panel, con la misma regla de copia por reserva.

---

## 6. ACID, aislamiento y concurrencia

### 6.1 Transacciones

- **Una operación del negocio = una transacción.** Retener, confirmar o cancelar escriben todo o nada: reserva, pago, historial y outbox juntos.
- **Nunca se llama a un servicio externo dentro de una transacción.** Primero se guarda, después se llama y después se guarda el resultado. Las llamadas externas son idempotentes y reintentables.
- **Aislamiento `READ COMMITTED`** (el de Postgres por omisión) **más** restricciones y bloqueos donde importa. No hace falta `SERIALIZABLE` en todo, que bajaría el rendimiento con mucha concurrencia. Donde una regla abarque varias filas sin una restricción que la proteja, esa operación concreta usa `SERIALIZABLE` con **reintento automático** ante error de serialización (máx. 3, con espera aleatoria).

### 6.2 Sin sobreventa: lo garantiza la base

```sql
CREATE EXTENSION IF NOT EXISTS btree_gist;
ALTER TABLE reservas ADD CONSTRAINT sin_choque
  EXCLUDE USING gist (habitacion_id WITH =, estancia WITH &&)
  WHERE (estado IN ('retenida', 'confirmada', 'en_curso'));
```

Si mil personas intentan la última habitación a la vez, **exactamente una** retención entra; las demás reciben `409 sin_disponibilidad`. Además, cada escritura toma un **turno por habitación** (`pg_advisory_xact_lock`): sin él, varias inserciones simultáneas se esperan entre sí al comprobar la restricción y Postgres aborta alguna con *deadlock* (un 500 en vez del 409). La prueba de concurrencia lo encontró. Es la misma regla que `conflicto()` en la Línea de tiempo del panel, pero imposible de saltarse.

### 6.3 Ediciones simultáneas en el panel

Dos personas de recepción moviendo la misma reserva: **bloqueo optimista**. Cada reserva lleva una columna `version`. El panel manda la versión que vio y la API actualiza `WHERE id = … AND version = …`. Si otro la cambió antes, responde `409` y el panel muestra el dato nuevo. Esto sustituye al aviso de presencia que solo tenía sentido con WebSocket.

### 6.4 Outbox

Todo efecto hacia fuera (webhook a la website, correo, evento SSE, invalidar caché, actualizar agregados) se escribe en `outbox` **en la misma transacción** del cambio, y Celery lo despacha. Nunca queda una reserva sin su aviso ni un aviso de una reserva que no se guardó.

### 6.5 Conexiones

- Pool pequeño por proceso: `pool_size × procesos de api + workers de celery` debe quedar por debajo de `max_connections` de Postgres (100 por omisión).
- Si un día no alcanza, se pone **PgBouncer** en modo transacción, con las sentencias preparadas de psycopg desactivadas.

---

## 7. Idempotencia y UUIDv7

**Llaves primarias `uuid` generadas con `uuidv7()`** (nativo en Postgres 18; en Python 3.14, `uuid.uuid7()` cuando el id se necesita antes de insertar, como `pago.id` para el proveedor):

- **Por qué v7 y no v4:** está ordenado por tiempo, así que los índices crecen al final y no se fragmentan, y se insertan rápido incluso con millones de filas.
- **Por qué no v1 ni v6:** pueden llevar la MAC de la máquina (fuga de información).
- **Cuidado:** un v7 revela cuándo se creó. Por eso al huésped se le muestra el **código público** aleatorio (§4.3), no el `uuid`.

**`Idempotency-Key`** (obligatoria en todo `POST` de la API pública; el widget genera un UUID v7 por intento):

```sql
CREATE TABLE claves_idempotencia (
  sitio_id uuid NOT NULL REFERENCES sitios,
  clave uuid NOT NULL,
  hash_peticion text NOT NULL,
  estado text NOT NULL,              -- en_proceso | terminada
  codigo_http int, respuesta jsonb,
  creada timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (sitio_id, clave)      -- la clave es única POR SITIO
);
```

| Caso | Respuesta |
|---|---|
| Clave nueva | Se inserta como `en_proceso` (`INSERT … ON CONFLICT DO NOTHING`, atómico), se ejecuta y se guarda la respuesta |
| Misma clave y misma petición, ya terminada | Se devuelve la respuesta guardada, **sin volver a ejecutar** |
| Misma clave mientras la primera sigue en proceso | `409 en_proceso` con `Retry-After: 1` |
| Misma clave con otro contenido | `422` |

Las claves se borran a los 7 días (beat). **Idempotencia en cadena:** la clave del proveedor de pagos es `pago.id`, los webhooks entrantes se deduplican por `(proveedor, evento_id)` y los salientes llevan su `id` de evento.

---

## 8. Resiliencia

- **Tiempos límite en toda llamada externa** (httpx: 5 s para conectar, 15 s en total). Ninguna petición queda colgada esperando al proveedor.
- **Reintentos con espera creciente y aleatoria** en Celery (`autoretry_for`, `retry_backoff`, `retry_jitter`). Todas las tareas son idempotentes, así que reintentar es seguro.
- **`acks_late` + `reject_on_worker_lost`:** si el worker muere a mitad de una tarea, la tarea vuelve a la cola, no se pierde.
- **Tareas que fallan para siempre** van a la cola `fallidas` y generan un aviso en el panel. Nada desaparece en silencio.
- **Conciliación** (§5.2) como red de seguridad de pagos y webhooks.
- **Si Redis se cae:** la API sigue reservando (la verdad está en Postgres). Se pierde la caché y el límite de peticiones pasa a "dejar pasar", salvo en el login, donde pasa a "bloquear".
- **Si el proveedor de pagos se cae:** no se pueden crear cobros nuevos; las retenciones vencen y se liberan solas. Nada queda a medias.
- **`/api/health`** (vivo) y **`/api/health/listo`** (con base y Redis alcanzables) para el despliegue y la prueba de humo.
- **Respaldos de Postgres:** `pg_dump` diario fuera del droplet desde el día uno. **Hecho en el droplet (2026-10-12):** `scripts/respaldo.sh` (base y fotos, los 14 últimos, también antes de cada migración); restaurar probado con la cadena de auditoría íntegra. **Falta el destino fuera del droplet (PENDIENTE 5).** Con datos reales y pagos, **recuperación a un punto en el tiempo** (archivado continuo de WAL con pgBackRest o WAL-G a almacenamiento externo), y un ensayo de restauración al mes.

---

## 9. Métricas con millones de registros

**Regla: el tablero nunca suma la tabla de reservas en vivo.**

| Técnica | Para qué |
|---|---|
| **Agregados precalculados** (`metricas_diarias`: por día, propiedad y habitación: noches vendidas, ingresos, cancelaciones, ocupación) | Se actualizan **por eventos del outbox**, de forma idempotente (cada evento se aplica una sola vez). El tablero lee unos cientos de filas en vez de millones |
| Recálculo nocturno de verificación | Recalcula el día anterior desde las reservas y corrige si algo se desvió |
| **Particionado mensual** de las tablas que solo crecen (`reservas_eventos`, `outbox` y, cuando exista, `webhooks_recibidos`) | Consultar o borrar un mes no toca los demás; lo viejo se archiva quitando la partición (`DETACH PARTITION`). **Hecho (2026-10-12, migración 0019):** llave `(id, momento)`; particiones de 24 meses adelante más una por omisión (ninguna inserción falla), creadas por el dueño de las tablas con `python -m app.cli particiones` (va en `deploy.sh` tras las migraciones); la API no toca las particiones directo (`REVOKE ALL`), solo la tabla padre con sus permisos y su RLS. **`claves_idempotencia` NO se parte:** Postgres solo garantiza unicidad dentro de cada partición y un reintento que cruzara el fin de mes se ejecutaría dos veces; además se vacía a los 7 días |
| **Índices BRIN** en columnas de tiempo de esas tablas | Diminutos y rápidos para rangos de fechas en tablas enormes |
| **Paginación por cursor solo en las tablas enormes** (historial, auditoría, eventos, reservas pasadas): `WHERE (creada, id) < (…)`, respuesta `{"items": [...], "meta": {"siguiente": "<cursor>"}}` | La página 5,000 tarda lo mismo que la 1. Las listas normales (habitaciones, personal, sitios) usan la paginación por número del repo (`BACKEND-ARQUITECTURA.md` §8) |
| Conteos aproximados para listas enormes ("unos 1.2 millones") | `COUNT(*)` exacto de millones es lento y nadie lo necesita al dígito |
| Caché del tablero en Redis (60 s) | Diez personas mirando el tablero hacen una sola consulta |

**Meta:** el tablero responde en menos de 100 ms con cualquier volumen. CI incluye una prueba de carga con 1 millón de reservas sintéticas.

---

## 10. Tiempo real: SSE y webhooks (sin WebSocket)

Nadie interactúa en tiempo real: solo hay que **avisar**. Así que:

| Quién recibe | Cómo | Para qué |
|---|---|---|
| El panel | **SSE** (`GET /api/eventos`) | Reservas nuevas o cambiadas, avisos, "las métricas cambiaron, vuelve a pedirlas" |
| La website | **Webhooks salientes** (§4.4) | Reserva confirmada, vencida o cancelada |
| Nosotros | **Webhooks entrantes** (`/api/webhooks/{proveedor}`) | Pagos (y Shopify, si cobra con su checkout) |

**SSE del panel:**

- **Solo personal:** cookie de sesión; sin sesión, `401`.
- **Cada rol recibe lo suyo.**
- **Cada evento lleva `id`:** si se corta, el navegador reconecta solo y manda `Last-Event-ID`, y el servidor reenvía lo que faltó desde el outbox. Nunca queda con datos viejos.
- **Latido** (comentario vacío) cada 25 s, para que nada en el camino corte la conexión.
- **Alimentado por Redis pub/sub**, así que funciona con varios procesos de la API.

**Webhooks entrantes:**

1. Verificar la firma y la marca de tiempo (se rechaza lo que tenga más de 5 min).
2. Guardar el evento crudo con `UNIQUE (proveedor, evento_id)`.
3. Responder `200` de inmediato.
4. Procesar en Celery con manejadores idempotentes. Si llegan en desorden, se consulta el estado actual al proveedor.

---

## 11. Autenticación (panel)

**Solo personal.** Login único en `/entrar`; roles `gerente`, `recepcion`, `restaurante` (este último, para cuando se encienda el módulo). Hecho (paso 2 de §16): `backend/app/auth/` + `frontend/src/lib/sesion.js` y `api.js`.

- **Usuario o correo + contraseña**, con **Argon2id** (pwdlib). `usuario` y `correo` únicos, sin distinguir mayúsculas (`citext`). Al personal lo da de alta un gerente.
- **Google u otro proveedor OpenID Connect** (Authlib): opcional, por configuración, y solo para cuentas de personal ya existentes.
- **Acceso:** JWT de 15 min en cookie `HttpOnly; Secure; SameSite=Strict`. Se valida en memoria: **cero consultas a la base por petición**.
- **La sesión dura como máximo 12 h** desde que se inicia (decisión del usuario, 2026-10-11): cubre un turno y obliga a volver a entrar al siguiente. Es un límite **absoluto**: usar el panel no la alarga. Dentro de esas 12 h, el token de acceso se renueva solo (cookie limitada a `/api/auth/renovar`, que rota en cada uso); a las 12 h, la renovación responde `401` y el panel manda al login con `?volver=`.
- **"Mantener la sesión iniciada"** solo decide si la sesión sobrevive a **cerrar el navegador** (cookie persistente o de sesión). Nunca pasa de 12 h.
- Sesiones revocadas en Redis (cerrar sesión, dar de baja a un empleado).
- **`GET /api/auth/yo`** al cargar el panel, mientras muestra "Verificando tu sesión…". La protección real es que la API responde `401`.
- **CSRF:** doble envío de AuthX en toda petición que modifica.
- **Fuerza bruta:** límite por IP y por usuario en Redis.
- **Huéspedes:** sin cuentas. Consultan o cancelan su reserva con el enlace del correo de confirmación (código público + token de un solo propósito).

### 11.1 Acceso por propiedad (Cabañas Frida y Casa Frida)

El hotel tiene dos propiedades: **Cabañas Frida** (Chelem) y **Casa Frida** (Chuburná).

| Quién | Ve |
|---|---|
| **Dueño / gerente** (permiso `propiedades.todas`) | Las dos, juntas ("Todas") o cada una por separado, con el selector de propiedad del panel |
| **Empleado con acceso a las dos** | Igual que el dueño, pero solo con sus permisos de rol |
| **Empleado con acceso a una** | **Solo esa.** El selector no le ofrece la otra, y la API nunca le devuelve nada de ella |

- Tabla `usuarios_propiedades (usuario_id, propiedad_id)`: a qué propiedades tiene acceso cada empleado; la asigna un gerente.
- El JWT de acceso lleva la lista de propiedades permitidas, para no consultar la base en cada petición.
- **Primera barrera, el servicio:** todo repositorio de datos con propiedad recibe un `Alcance` **obligatorio** (sin valor por omisión) y filtra con él. Una consulta sin alcance no compila con los tipos.
- **Segunda barrera, la base (Row-Level Security de Postgres)** en las tablas con `propiedad_id` (habitaciones, reservas, pagos, métricas…): cada transacción hace `SET LOCAL app.propiedades = '…'` y una política solo deja ver esas filas. Aunque un día se olvide un filtro en el código, Postgres no entrega filas de otra propiedad.
- Lo de otra propiedad responde **404**, no 403: no se confirma que existe.
- Pruebas: por cada ruta del panel, un empleado de una sola propiedad no puede leer ni modificar nada de la otra.

---

## 12. Caché

**Nginx: microcaché de lo público.** El backend decide cuánto se cachea cada ruta con `X-Accel-Expires: N`. Una respuesta sin esa cabecera, o con `Set-Cookie`, **no se cachea**.

```nginx
proxy_cache_path /var/cache/nginx/api levels=1:2 keys_zone=api:20m
                 max_size=256m inactive=10m use_temp_path=off;

location /api/v1/ {
    proxy_pass http://api:8000;
    proxy_cache api;
    # El Origin va en la llave: la respuesta lleva Access-Control-Allow-Origin
    # de ESE sitio, y no se le debe servir a otro.
    proxy_cache_key $scheme$host$request_uri$http_origin;
    proxy_cache_methods GET HEAD;
    proxy_cache_lock on;                      # 500 peticiones iguales = 1 al backend
    proxy_cache_use_stale updating error timeout http_500 http_502 http_503 http_504;
    proxy_cache_background_update on;
}

# Panel, login y salud: nunca en caché. (Nginx elige el prefijo más largo, así
# que /api/v1/, /api/eventos y /api/webhooks/ usan sus propios bloques.)
location /api/ { proxy_pass http://api:8000; proxy_cache off; }

location /api/eventos {                       # SSE
    proxy_pass http://api:8000;
    proxy_http_version 1.1;
    proxy_set_header Connection "";
    proxy_buffering off;
    proxy_cache off;
    proxy_read_timeout 1h;
}

location /api/webhooks/ { proxy_pass http://api:8000; proxy_cache off; client_max_body_size 1m; }
```

- **Ningún `location` lleva `add_header`** (regla del repo). Aciertos y fallos de caché: `$upstream_cache_status` en el `log_format`.
- **Que la disponibilidad llegue con 5 s de retraso es seguro:** la comprobación final la hace Postgres al retener (§6.2).

**Redis: una instancia, cuatro papeles.**

| Papel | Claves | Vida |
|---|---|---|
| Caché de lo privado y calculado (tablero, métricas) | `cache:*` | **Siempre con TTL**; se borran al llegar el evento que las invalida |
| Broker de Celery | las de Celery | Sin TTL |
| Tiempo real | canales `eventos:*` | No ocupan memoria |
| Límites y seguridad | `revocada:*`, `limite:*` | TTL = lo que les quede de vida |

Con `volatile-lru`, si Redis se llena solo desaloja claves con TTL, nunca la cola de Celery.

---

## 13. Reservas de otras plataformas (solo consulta)

Igual que antes: tabla `reservas_externas` con `UNIQUE (canal, uid_externo)`, alimentada por iCal (beat cada 15 min) o por un CSV del Extranet de Booking.com subido desde el panel. **No toca `reservas` ni la disponibilidad propia.** Si alguien reserva fechas que ya figuran ahí, llega un aviso al panel; no bloquea la venta.

### 13.1 El bot: "Casa Frida" y "Hoteles Frida" en la web

Tareas de Celery en la cola `bot` que **buscan** dónde aparece el hotel y **leen** esas páginas, **solo donde esté permitido**.

**Qué se puede obtener y qué no:** en la web pública **no hay reservas ajenas** (son privadas de cada plataforma). Lo que sí: dónde aparece el hotel, el precio publicado, la calificación y las reseñas, la disponibilidad publicada y los datos estructurados de la ficha. Va a su propia tabla, `menciones_externas` (`UNIQUE (url)`; fuente, título, precio, calificación, fecha de lectura), y se ve en el panel como "En otras páginas". Las reservas de otras plataformas siguen saliendo de iCal y CSV.

1. **Buscar:** API de **Brave Search** (la de Bing cerró en 2025 y la de Google no acepta clientes nuevos y cierra el 2027-01-01). Consultas fijas: "Casa Frida Chuburná", "Cabañas Frida Chelem", "Hoteles Frida". Cobra por consulta: beat diario y tope mensual configurable en el panel.
2. **Permiso, antes de leer nada:**
   - `robots.txt` de cada sitio, con **Protego** (el mismo parser de Scrapy), respetando `Crawl-delay`.
   - **Lista de dominios bloqueados** editable en el panel, con Booking.com, Airbnb y Expedia desde el inicio: sus términos prohíben el scraping aunque su `robots.txt` no lo impida en todas las rutas.
3. **Leer:** **Scrapy** (`ROBOTSTXT_OBEY = True`, AutoThrottle, una petición a la vez por dominio, `User-Agent` que dice quiénes somos y cómo contactarnos). Solo si una página necesita JavaScript, **scrapy-playwright** (Chromium sin interfaz).
4. **Extraer:**
   - **extruct** para los datos estructurados (schema.org `Hotel`, `AggregateRating`, `Offer`): es lo más fiable.
   - **selectolax** para el HTML.
   - **trafilatura** para el texto de reseñas y artículos.
5. **Guardar** con `UNIQUE (url)`: volver a leer actualiza la fila, no duplica.

Lo que llega de páginas ajenas es **dato no confiable**: se sanea (§17) y se muestra como texto, nunca como HTML.

**Hecho (fase 9, 2026-10-12):**
- **Reservas externas:** `calendarios_externos` (un iCal por habitación y plataforma; la URL lleva el token de la plataforma, así que en el panel y en la auditoría solo se ve el dominio y el final) leídos cada 15 min por Celery; `reservas_externas` con `UNIQUE (canal, uid_externo)` (releer actualiza) y RLS. Lo que desaparece de un iCal (y aún no pasa) se marca cancelada. El **CSV del Extranet de Booking** se sube desde el panel (columnas en inglés o español, `,` o `;`); sus filas quedan sin habitación (Booking no dice cuál es la nuestra). Choques en los dos sentidos: una externa sobre una propia, o una propia nueva o movida sobre una externa (desde el despachador del outbox), dejan el aviso **"Posible doble venta"**. Nunca bloquean la venta.
- **El bot**, con dos cambios sobre la idea original: **httpx + Protego + selectolax** en vez de Scrapy (el reactor de Twisted no se reinicia dentro de un worker de Celery) y **sin trafilatura** (no se guardan textos de reseñas, solo la calificación normalizada a 5 y cuántas hay). Las reglas de cortesía son las mismas: robots.txt por dominio, `Crawl-delay` (tope 10 s), una petición a la vez, User-Agent con el **contacto** que se configura en el panel (sin contacto, no lee). Los dominios bloqueados (Booking, Airbnb, Expedia, Hotels.com, Vrbo de inicio) **ni siquiera reciben la petición de robots.txt**: se guarda solo lo que dijo el buscador. Las búsquedas se cuentan contra el tope ANTES de hacerse. Corre en la cola `default` una vez al día (6:20 de Mérida) o con "Buscar ahora"; la cola propia `bot` del §2 se hará cuando haga falta.
- **Lectura eficiente y aviso (2026-10-24):** cada iCal se lee **cada 5 min** con petición condicional (`If-None-Match` / `If-Modified-Since`: si nada cambió, 304 sin archivo) y una huella de las reservas leídas (si son las mismas, no se procesa; hay plataformas que cambian su marca de tiempo en cada petición). Tras errores seguidos la espera crece (5, 10, 20, 40 min, tope 1 h). Cuando llega **al menos una reserva nueva de fuera** (vigente y que aún no termina; `MINIMO_PARA_AVISAR` en `servicios/externas.py`), un evento `externas.nuevas` del outbox se vuelve el aviso **"Reservas fuera de la app"** (permiso `externas.ver`, en vivo por SSE, uno por lectura con las fechas juntas). Probado con un iCal real de 221 eventos: primera lectura 2.5 s, las siguientes sin procesar nada.
- **Fichas conocidas del hotel en otras plataformas** (las dio el usuario, 2026-10-24). **NO se leen**: sus términos prohíben leerlas con un programa, ponen pantallas anti-bot (los enlaces traen `chal_t=`, `challengeReferer=`) y no traen reservas (eso solo sale del iCal de cada extranet). Están en los dominios bloqueados del bot (migración 0020 sumó Kayak, Facebook, Hoteles.com, Instagram y Tripadvisor). Sirven para saber de dónde pedir cada iCal:
  - Cabañas Frida: Booking (`booking.com/hotel/mx/cabanas-frida`), Hoteles.com (`ho1426878560`), Expedia (`h44558705`), Facebook (`facebook.com/cabanasfridachelem`).
  - Casa Frida: Booking (`booking.com/hotel/mx/casa-frida-chelem`), Hoteles.com (`ho2906913664`), Kayak (`9551093`).
  - De dónde sale el iCal: **Booking** → Extranet → Tarifas y disponibilidad → Sincronizar calendarios → exportar, uno por habitación. **Expedia y Hoteles.com** (son la misma empresa) → Expedia Partner Central; la sincronización por iCal solo existe para alojamientos tipo "vacation rental"; si la propiedad está como hotel, va por un channel manager o por el CSV. **Kayak** es un buscador (no vende: manda a Booking/Expedia). **Facebook** no recibe reservas.
- **Toda URL de fuera pasa por `app/red.py`:** solo direcciones públicas (contra SSRF: ni la red de Docker ni el metadata del droplet), cada redirección se vuelve a comprobar, con tope de tamaño y tiempos límite.
- En el panel: **Otras plataformas** (`/admin/otras-plataformas`, `externas.ver`): reservas (con la marca de choque), calendarios iCal y "En otras páginas"; configurar pide `ajustes.editar`.

---

---

## 14. Estructura de `backend/`

```
backend/
├── Dockerfile            # una imagen: api y celery
├── pyproject.toml, uv.lock
├── alembic/              # migraciones
├── app/
│   ├── main.py           # FastAPI: routers, /api/health, manejadores de error
│   ├── config.py         # pydantic-settings: si falta una variable, no arranca
│   ├── db.py             # engine async (api) y síncrono (celery)
│   ├── errores.py        # excepciones de dominio → {"error", "codigo"}
│   ├── modelos/          # SQLAlchemy (un archivo por agregado: reservas.py, pagos.py, sitios.py…)
│   ├── esquemas/         # Pydantic: el contrato con el panel y con las websites
│   ├── repositorios/     # consultas, sin reglas ni commit
│   ├── servicios/        # reglas del negocio y transacciones (sin FastAPI dentro)
│   │   ├── reservas.py   # máquina de estados (§5.3)
│   │   ├── pagos.py      # interfaz del proveedor; una implementación por proveedor
│   │   └── idempotencia.py
│   ├── rutas/
│   │   ├── v1/           # API pública: disponibilidad, habitaciones, reservas (clave del sitio)
│   │   ├── admin/        # panel: reservas, habitaciones, sitios, métricas (sesión + permiso)
│   │   ├── auth.py       # login del personal
│   │   ├── eventos.py    # SSE
│   │   └── webhooks.py   # entrantes
│   ├── auth/             # AuthX, pwdlib, dependencias de permiso, claves de sitio
│   └── tareas/           # Celery: outbox, webhooks salientes, retenciones, conciliación, agregados, ical
└── tests/                # unitarias, integración, concurrencia (mil retenciones a la vez) y carga (1 millón de reservas); ver BACKEND-COMO-TRABAJAMOS.md §4
```

**Contrato con el panel:** la forma de los objetos de `frontend/src/data/*.js` y de los almacenes del admin (`admin/reservas.js`, `admin/avisos.js`) es la que la API debe devolver.

---

## 15. Variables nuevas

Regla del repo (fail fast; un valor de relleno cuenta como ausente), **separando secretos de ajustes** (decisión del usuario, 2026-10-11):

- **Secretos** (contraseñas, claves): Secret en GitHub + línea en el `.env` de `deploy.yml` + comprobación en `deploy.sh` + fila en `docs/deploy-config-REFERENCIA.md`. En desarrollo, `backend/.env`.
- **Ajustes no secretos** (entorno, usuarios, nombres de base, direcciones internas como `DB_HOST` o `REDIS_URL`): **fijos** en `docker-compose.yml` / `deploy.sh` (y en `docker-compose.dev.yml` para desarrollo), no en `.env` ni en los Secrets. Igual se validan al arrancar.
- Las URLs de la base **no se escriben**: `config.py` las arma con `URL.create` a partir de las piezas (host, base, usuario y contraseña), que escapa la contraseña y la oculta al imprimir.

| Variable | Para qué |
|---|---|
| `POSTGRES_PASSWORD`, `API_DB_CLAVE` | Contraseñas de los dos usuarios de la base (migraciones y API) |
| `JWT_SECRETO` | Firma de tokens del panel (32+ bytes aleatorios) |
| `CLAVE_WEBHOOKS` | De ella se deriva el secreto de webhooks de cada sitio (§4.4). Cambiarla obliga a darle a cada sitio el suyo nuevo |
| `SMTP_HOST`, `SMTP_USUARIO`, `SMTP_CLAVE`, `CORREO_REMITENTE` | Confirmaciones al huésped, recuperar contraseña |
| `PAGOS_PROVEEDOR`, `PAGOS_CLAVE_SECRETA`, `PAGOS_SECRETO_WEBHOOK` | Cuando se elija el proveedor |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Solo si se activa el login con Google |
| `BRAVE_SEARCH_CLAVE` | El bot (§13.1); sin ella, el bot no busca y lo dice en el panel (no inventa resultados) |

Las claves de cada sitio (`pk_…`, `sk_…`) **no son variables**: se crean y rotan desde el panel y viven (con hash) en la base.

`deploy.sh` corre `alembic upgrade head` en el contenedor `api` antes de la prueba de humo, y recrea `frontend` después de levantar `api` (Nginx resuelve el nombre del servicio una sola vez, al arrancar).

---

## 16. Orden de trabajo

1. ✅ **Esqueleto (hecho, 2026-10-11):** los 5 contenedores, `config.py` que falla sin variables, `/api/health`, Alembic, CI con pytest + pip-audit, entrada en `docker-compose.dev.yml` y proxy `/api` en Vite.
2. ✅ **Autenticación del personal y roles (hecho, 2026-10-11):** login real con cookies, renovación con rotación y detección de reúso, CSRF, límite de intentos, cerrar sesión (esta o todas), lista de sesiones abiertas, auditoría, CLI `crear-usuario`. Falta la pantalla de gestión de usuarios (va con el paso 3).
3. **Catálogo y motor de reservas en el panel (reservas a mano)**, en subfases (se para y se reporta al terminar cada una):
   - 3a. ✅ **Habitaciones y acceso por propiedad (hecho, 2026-10-11):** `Alcance` obligatorio en los repositorios + Row-Level Security en Postgres (§11.1), habitaciones con tarifa base y bloqueo optimista, papelera con borrado lógico, restaurar y definitivo (§19), auditoría. En el panel: Habitaciones (lista, búsqueda, filtro, papelera), formulario único de alta y edición, y el selector de propiedad de la SideNav conectado.
   - 3b. ✅ **Auditoría forense (hecho, 2026-10-11, §17.4):** cadena de hashes calculada por Postgres, solo inserciones, contexto completo por solicitud, eventos de seguridad que sobreviven al error, sello horario, consultar, verificar y exportar con cadena de custodia. Arregló un fallo real: la revocación por token de renovación robado se perdía en el rollback.
   - 3c. ✅ **Reservas (hecho, 2026-10-11):** restricción de exclusión `sin_choque` + turno por habitación (§6.2), llave compuesta habitación/propiedad, máquina de estados cerrada, bloqueo optimista, historial, auditoría y outbox en la misma transacción, cobro anticipo/completo por propiedad con copia por reserva, pagos a mano, bloqueos de mantenimiento, cotización del servidor y RLS. En el panel: Línea de tiempo, Nueva reserva, Configuración → Cobro de reservas y las próximas reservas de Habitaciones. Prueba de concurrencia real (12 conexiones, entra una).
     **Completado después (2026-10-12):** tarifas de temporada (`tarifas`, sin cruces; cada noche con su precio; mover respeta lo pactado en proporción a las noches), devoluciones registradas a mano (`pagos` concepto `devolucion`, con motivo; una cancelada ya no debe nada), panel de **detalle de reserva** (llegada, salida, cobrar, devolver, cancelar, pagos e historial; `?reserva=` en la URL), fotos HEIC, pantalla de **Auditoría** (consultar, verificar, exportar) y **pruebas de propiedades con Hypothesis** (`tests/propiedades/`). La navegación del panel solo ofrece lo que el rol puede abrir (`admin/modulos.js`, `permitida`). Sigue pendiente: la **política** de cuánto devolver al cancelar (la decide el hotel) y particionar tablas (§9).
   - 3d. ✅ **Fotos (hecho, 2026-10-11, §18):** subir con validación de contenido, WebP en 3 tamaños sin metadatos, orden y portada, papelera y lápida con archivos borrados después del commit; en el panel, Gestionar fotos y el componente `Imagen` con sus estados.
   - 3e. ✅ **Gestión del personal (hecho, 2026-10-11):** `/api/admin/personal`: alta con contraseña temporal (se ve una vez; `debe_cambiar_clave` obliga a cambiarla), editar rol y propiedades (cierra sus sesiones para que rija ya), baja = desactivar (nunca borrar; cierra sus sesiones), reactivar, restablecer contraseña. Nadie se toca a sí mismo y nunca queda el sistema sin quien gestione (con candado contra la carrera). `POST /api/auth/clave` para cambiar la propia (cierra las demás sesiones). En el panel: Personal, y Configuración → Seguridad real (contraseña y sesiones abiertas).
4. ✅ **SSE y avisos en vivo (hecho, 2026-10-12):** el despachador del outbox (Celery, cada 2 s, `FOR UPDATE SKIP LOCKED`) crea los avisos (`avisos`, uno por evento; leído y borrado por persona en `avisos_usuarios`) y publica en Redis después del commit; `GET /api/eventos` (SSE) entrega a cada quien solo lo de sus propiedades y permisos, con latido, corte a los 10 min, cierre si se revoca la sesión y reenvío de lo perdido por `Last-Event-ID` o `?desde=`. En el panel: una sola conexión (`lib/eventos.js`), la Línea de tiempo se actualiza sola, la campana y Avisos salen de la API con toast para lo que hizo otra persona. Nginx: `location = /api/eventos` sin búfer.
5. ✅ **Métricas (hecho, 2026-10-12):** `metricas_diarias` (una fila por propiedad y día: noches, ingreso, llegadas, salidas, cancelaciones y por cobrar) que el despachador recalcula por evento sobre las fechas que tocó, con verificación nocturna completa (3:30 de Mérida). `GET /api/admin/metricas/tablero` (hoy, 7 días, mes contra el anterior, 12 meses, 14 días; caché de 60 s en Redis que el despachador invalida) y `/metricas/habitaciones/{id}?mes=`. En el panel: el Tablero con datos reales, en vivo y exportable a CSV, y las cifras de cada habitación. **Prueba de carga** (`pytest -m carga`, en CI antes de main) con 1 millón de reservas: tablero 37 ms, una habitación 6 ms, recálculo completo 11 s.
6. ✅ **API pública v1 (hecho, 2026-10-12, §4, §7, §12):** `sitios` con clave pública, secreta (hash) y orígenes; CORS por sitio; `Idempotency-Key` en la misma transacción (`claves_idempotencia`, se borran a los 7 días); retenciones de 15 min que vencen solas; microcaché de Nginx (catálogo 60 s, disponibilidad 5 s); webhooks salientes firmados con reintentos y defensa contra SSRF; límite de peticiones. En el panel: Configuración → **Sitios web** (alta, editar, rotar claves y secreto, revocar, avisos enviados y reintentar). Pruebas de concurrencia reales por HTTP: 10 retenciones simultáneas de las mismas noches, entra una; 8 reintentos simultáneos con la misma clave, una sola reserva. **Sin pagos** (PENDIENTE 1): no hay enlace de pago y una confirmada no se cancela por la API.
7. **Widget** embebible (reaprovechando el flujo de reserva de la website respaldada), probado en la plataforma que se elija (pendiente 2).
8. **Pagos**, cuando se elija el proveedor (pendiente 1): autorizar → confirmar → capturar, anticipo o completo según el ajuste del panel, webhooks entrantes y conciliación.
9. ✅ **Reservas de otras plataformas y el bot (hecho, 2026-10-12, §13):** iCal por habitación cada 15 min y CSV de Booking, a `reservas_externas` (solo consulta; avisos de posible doble venta en los dos sentidos); el bot con Brave Search, robots.txt, dominios bloqueados, tope mensual y datos estructurados. En el panel: Otras plataformas. Sin `BRAVE_SEARCH_CLAVE` el bot no busca y lo dice.
10. **Boutique y Restaurante**: pendiente de decidir (pendiente 4).

---

## 17. Seguridad: entrada, consultas y flujos

### 17.1 Saneamiento de datos

- **Todo lo que entra pasa por un esquema Pydantic estricto:** tipos exactos, `max_length` en todo texto, rangos en números y fechas, enumeraciones cerradas (`Literal`) para estados y modalidades, y **`extra="forbid"`**: un campo que no está en el contrato es un `422`, nunca se ignora en silencio.
- **Texto libre** (nombres, notas, reseñas del bot): se normaliza (Unicode NFC, espacios recortados), se rechazan caracteres de control y se guarda **como texto plano**. Si alguna vez se acepta HTML (no está previsto), solo pasa por **nh3** con una lista mínima de etiquetas permitidas.
- **Correos** con `email-validator`; teléfonos en formato E.164.
- **Montos: nunca vienen del cliente.** El servidor recalcula el total, el anticipo y el saldo desde las tarifas y el ajuste de cobro (§5.4). Si el cliente manda un total, no se usa.
- **Salida:** siempre por un esquema de salida (nunca el modelo de SQLAlchemy tal cual). El panel pinta texto con React, que escapa por defecto; **prohibido `dangerouslySetInnerHTML`** con datos del backend.
- **Tamaño de petición:** Nginx corta los cuerpos grandes (1 MB en JSON; las fotos tienen su propio límite, §18).

### 17.2 Consultas parametrizadas y de bajo impacto

- **Solo SQLAlchemy** (ORM o Core), que siempre manda los valores como **parámetros**, nunca pegados en el SQL. `text()` solo con `bindparams`; **prohibido** armar SQL con f-strings o concatenación. Una regla de ruff lo vigila en CI (S608, inyección SQL).
- **Pedir solo lo necesario:** cada consulta selecciona las columnas que su esquema de salida necesita (`load_only` o columnas explícitas), con relaciones cargadas a propósito (`selectinload` o `joinedload`), nunca por acceso perezoso: **cero N+1**.
- **Una prueba falla si una ruta lanza más consultas de las esperadas** (contador de sentencias en las pruebas de integración).
- **Índices para cada filtro real**, revisados con `EXPLAIN (ANALYZE, BUFFERS)` en las consultas pesadas.
- **Tope por consulta:** `statement_timeout` (5 s) en el usuario de la API: una consulta desbocada se corta, no tumba la base.
- **Usuario de base con mínimo privilegio:** la API no es dueña de las tablas ni puede alterarlas. Las migraciones corren con otro usuario.

### 17.3 Flujos validados: nada que no esté previsto

- **Máquina de estados cerrada** (§5.3): una tabla de transiciones permitidas en código. Cualquier otra transición es un error, aunque el usuario tenga permiso.
- **Cada acción comprueba, dentro de su transacción:**
  1. permiso del rol;
  2. propiedad (§11.1);
  3. estado de origen;
  4. versión (§6.3);
  5. reglas del negocio.

  En ese orden, y si una falla, no se escribe nada.
- **Pruebas de propiedades con Hypothesis:** una máquina de estados de prueba (`RuleBasedStateMachine`) dispara secuencias aleatorias de acciones (retener, confirmar, cancelar, mover, vencer, registrar pagos) y comprueba que las invariantes nunca se rompen:
  - nunca dos reservas activas que se crucen;
  - nunca una confirmada sin su pago;
  - el saldo nunca es negativo;
  - nunca se ve nada de otra propiedad.
- **Límite de peticiones** por usuario y por IP en todo lo que modifica.

---

### 17.4 Auditoría forense: todo queda, nada se altera sin dejar rastro

Decisión del usuario (2026-10-11): **absolutamente todo debe ser auditable** y servir como evidencia en un peritaje.

| Pieza | Qué garantiza |
|---|---|
| **Cadena de hashes** (`auditoria.hash_anterior`, `hash`): SHA-256 sobre un arreglo JSONB de cada fila más el hash de la anterior | Alterar, borrar o colar una fila rompe la cadena. `auditoria_verificar(desde)` (SQL) dice el primer eslabón roto |
| **Lo calcula Postgres** (trigger `auditoria_encadenar`): `secuencia` sin huecos, `momento` = `clock_timestamp()`, huella | La aplicación no puede elegir ni el orden, ni la hora, ni el hash. Un candado (advisory lock) encadena una fila a la vez |
| **Solo inserciones**: trigger que rechaza `UPDATE`/`DELETE`/`TRUNCATE` para todos + `REVOKE` a la API | Ni la API ni el dueño de la tabla la modifican por error. Si el dueño quita el trigger a propósito, la cadena lo delata (hay una prueba de eso) |
| **Contexto en cada fila**: usuario, sesión del panel, IP, navegador y `solicitud_id` | Se cruza con el **registro de acceso** (una línea JSON por solicitud en el stdout del contenedor) y con la cabecera `X-Solicitud-Id` de la respuesta |
| **Eventos de seguridad aunque la respuesta sea error** (`confirmar=True`) | Login fallido, bloqueo, robo de sesión y permisos denegados nunca se pierden en un rollback |
| **Sello horario** (Celery, `sellar_auditoria`): la cabeza de la cadena se registra como evento y como línea JSON `{"sello_auditoria": …}` | Copiado a mano fuera del servidor por los dueños del sistema (decisión del usuario), prueba que la cadena no se cortó ni reescribió después |
| **Herramientas** (`auditoria.ver`): `GET /api/admin/auditoria` (filtros, cursor), `/verificar`, `/exportar` (NDJSON en orden de la cadena + `X-Contenido-Sha256`); CLI `python -m app.cli verificar-auditoria` (la cadena completa, sin tope de tiempo) | Consultar, verificar y exportar también se auditan: **cadena de custodia** (quién sacó qué, cuándo y con qué huella) |

- **IP real:** la API confía en `X-Forwarded-For` solo porque nunca se publica a internet (la alcanza Nginx). Por eso **Nginx debe sobrescribirla** con `proxy_set_header X-Forwarded-For $remote_addr;` (no `$proxy_add_x_forwarded_for`, que dejaría al cliente inventar su IP). Anotado en `docs/deploy-config-REFERENCIA.md` §7.
- **Hora:** todo en `timestamptz` (UTC en la huella). El servidor debe tener NTP activo; una hora mal puesta no rompe la cadena, pero sí el peritaje.
- **Techo conocido:** el candado serializa las inserciones de auditoría (una a la vez hasta el COMMIT). Sobra para un hotel; con miles de escrituras por segundo, cadenas por partición.

## 18. Fotos de las habitaciones y cabañas

Las fotos las sube el personal desde el panel ("Gestionar fotos").

- **La ruta en disco nunca sale del usuario.** El nombre que manda el navegador **se ignora**: cada foto recibe un id `uuidv7` y se guarda en `/datos/fotos/<propiedad>/<habitacion>/<uuid>-<ancho>.webp`. En la base se guardan **ids**, no rutas. Así un nombre como `../../../etc/passwd` no tiene por dónde entrar.
- **Doble cerrojo de rutas:** toda ruta de archivo se arma con `pathlib` desde la carpeta base, y se verifica con `ruta.resolve().is_relative_to(BASE)` antes de leer o escribir. Si no está dentro, se rechaza.
- **Se valida el contenido, no la extensión:**
  - Pillow abre el archivo y comprueba que de verdad sea JPEG, PNG, WebP o HEIC.
  - Tope de 15 MB (Nginx `client_max_body_size` en esa ruta y FastAPI lo verifica).
  - `Image.MAX_IMAGE_PIXELS` contra las "bombas de descompresión".
- **Se vuelve a codificar siempre** a WebP. Eso elimina los metadatos (EXIF con GPS, por ejemplo) y cualquier contenido escondido en el archivo original (archivos "políglota"). Variantes 1920, 1080 y 480 px (nunca se agranda); el original no se guarda ni se sirve.
- **Hecho en la fase 3d (2026-10-11), con dos ajustes al plan:** se procesa **en la propia petición, en un hilo** (`run_in_threadpool`, ~1 s por foto) en vez de Celery: sin estados "procesando" ni sondeos en el panel; si un día pesa, pasa a Celery (marcado `ponytail:`). **HEIC no se acepta** todavía (necesitaría `pillow-heif`): solo JPEG, PNG y WebP. El tope de píxeles se comprueba con la cabecera, **antes** de decodificar. Cada foto guarda la **huella SHA-256** del original (evidencia; la misma foto no se repite en una habitación). La primera por `orden` es la portada. Los archivos de una lápida los borra la tarea `limpiar_fotos` (cada 15 min) **después** del commit.
- Código: `app/imagenes.py` (validar, codificar, rutas con doble cerrojo), `servicios/fotos.py`, `rutas/admin/fotos.py`. En el panel: `GestionFotosPage` y el componente `components/marca/Imagen.jsx` (esqueleto, "Imagen no anexada", "Imagen no disponible" con Reintentar).
- **Nginx sirve las fotos** desde `/media/` (`alias` a la carpeta de fotos, `autoindex off`, solo `GET`, caché larga porque el nombre cambia si cambia la foto). Nginx nunca ejecuta nada de esa carpeta.
- **Respaldo:** la carpeta de fotos es un volumen y entra en los respaldos (§8), junto con la base.

---

## 19. Borrado lógico (soft delete) y borrado definitivo (hard delete)

### 19.1 Qué se borra y cómo

| Tipo de dato | Borrar = | Por qué |
|---|---|---|
| **Catálogo y configuración:** habitaciones, tarifas, fotos, sitios (websites), personal | **Borrado lógico**: va a la **papelera**, se puede **restaurar**. El **definitivo deja una lápida** (abajo) | Un clic equivocado no destruye nada; el historial que las mencione sigue teniendo a qué apuntar |
| **Reservas y pagos** | **Nunca se borran.** Se **cancelan** (es un estado, §5.3) | Son registros contables y de auditoría |
| **Auditoría, historial de reservas, webhooks, outbox** | **Nunca se borran a mano.** Lo viejo se archiva quitando su partición mensual (§9) | Son la memoria del sistema |
| **Datos personales de un huésped** (a petición suya, derechos ARCO de la LFPDPPP) | **Se anonimizan**: nombre, correo y teléfono se reemplazan; la reserva y sus montos quedan | Cumplir la ley sin romper la contabilidad |

### 19.2 Cómo se implementa

- **Columnas en todo modelo con borrado lógico** (mezcla `ConBorradoLogico`): `eliminado_en timestamptz NULL`, `eliminado_por uuid NULL` (quién) y `motivo_eliminacion text NULL`.
- **Filtro automático, imposible de olvidar:** un evento de la sesión de SQLAlchemy (`do_orm_execute` + `with_loader_criteria`, la receta oficial de "filtros globales") añade `eliminado_en IS NULL` a **toda** consulta sobre esos modelos. Ver lo borrado exige pedirlo a propósito (`execution_options(incluir_eliminados=True)`), y solo lo hacen la papelera y la restauración.
- **Únicos que ignoran lo borrado:** los `UNIQUE` de esos modelos son **índices parciales** (`WHERE eliminado_en IS NULL`). Así se puede crear una habitación nueva con el nombre de una que está en la papelera.
- **Borrado definitivo = lápida** (decisión del usuario, 2026-10-11): la fila **se queda** con `purgado_en` y `purgado_por`, y el modelo borra su contenido (`vaciar_contenido`: textos, amenidades, fotos, datos personales). Quedan el id, el nombre y la propiedad. Así **todo lo que la nombra** (reservas, pagos, auditoría, historial) sigue resolviendo y el panel dice "Eliminada definitivamente" o "En la papelera", en vez de quedar apuntando a la nada o de impedir el borrado. Ya no se restaura ni aparece en la papelera. Un `CHECK` exige que esté en la papelera antes.
- **Toda salida de un recurso con papelera lleva `situacion`** (`vigente`, `en_papelera`, `eliminado_definitivo`) y `GET /…/{id}` devuelve también lo borrado (para que un enlace del historial diga qué fue); editarlo da `404`. En el panel, los textos salen de `frontend/src/lib/situacion.js`.
- **Una sola implementación** para todos los recursos: `app/servicios/papelera.py` (reglas) y `app/repositorios/papelera.py` (listado). Un recurso nuevo con papelera hereda `ConBorradoLogico`, implementa `vaciar_contenido` y declara su `Recurso` (cómo se llama en la auditoría, cómo se fotografía, qué decir si su nombre está ocupado).
- **Llaves foráneas con `ON DELETE RESTRICT`:** como nada de negocio se borra físicamente, ninguna referencia queda colgando. Nunca `CASCADE` sobre datos del negocio.
- **Todo borrado y toda restauración quedan en la auditoría** con el estado anterior completo, en la misma transacción.

### 19.3 La API

| Método y ruta | Qué hace | Quién |
|---|---|---|
| `DELETE /api/admin/<recurso>/{id}` | Borrado lógico (a la papelera). `204`; repetirlo también da `204` (idempotente) | Quien tenga el permiso `<recurso>.eliminar` |
| `POST /api/admin/<recurso>/{id}/restaurar` | Lo saca de la papelera. Si su nombre ya lo usa otro, `409` con el motivo | Igual |
| `GET /api/admin/<recurso>/papelera?cursor=` | Lo que está en la papelera de ese recurso, paginado por cursor (una ruta por recurso: cada una pide su propio permiso) | Igual, solo de sus propiedades (§11.1) |
| `DELETE /api/admin/<recurso>/{id}?definitivo=true` | **Borrado definitivo** (lápida). Solo si ya está en la papelera; repetirlo da `204`. Restaurarlo después: `409 eliminado_definitivo` | Solo `gerente` (`papelera.vaciar`) |

- **Dos pasos siempre:** nada pasa de "activo" a "borrado de verdad" de un golpe. Primero a la papelera; el definitivo es un segundo acto, explícito, con confirmación en el panel.
- **Vaciado automático:** beat elimina de forma definitiva (lápida) lo que lleva más de N días en la papelera (N es un ajuste del panel, 30 por omisión).
- **Fotos:** el borrado definitivo de una foto borra sus archivos **después** del commit, por el outbox: si la transacción falla, los archivos siguen ahí.
- **Pruebas:**
  - por cada modelo con borrado lógico, lo borrado no aparece en ninguna lista ni búsqueda;
  - restaurar funciona;
  - el definitivo exige papelera y permiso;
  - el definitivo deja la lápida: sin contenido, fuera de la papelera, y `GET` dice `eliminado_definitivo`.

