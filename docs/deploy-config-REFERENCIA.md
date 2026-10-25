# Despliegue: referencia

Qué hace falta para poner BeachClub en producción, qué hace cada pieza y qué
revisar cuando falla. **Este archivo se versiona y NO lleva secretos**: dice
qué valores existen y cómo se generan. Los valores reales van en
`docs/deploy-config.local.md`, que está en `.gitignore`.

Adaptado del despliegue de SIMDES, sin lo que aquí aún no existe (backend,
base de datos, migraciones).

---

## 0. Un vistazo

| | |
|---|---|
| Qué se despliega | Solo `frontend/`: un Nginx que sirve la SPA compilada y termina TLS |
| Servidor | Droplet dedicado, usuario `deploy`, proyecto en `/opt/beachclub` |
| Disparo | Push a `main` → CI (lint, build, imagen) → job `deploy` por SSH |
| Script | `./scripts/deploy.sh` (valida sin tocar: `--dry-run`) |
| Puertos expuestos | Solo 80 y 443 |
| Si falla | `deploy.sh` revierte solo a la imagen anterior |

---

## 1. Variables

### 1.1 `.env` en la raíz del servidor

Lo **regenera el workflow en cada despliegue** a partir de los Secrets de
GitHub. No se edita a mano en el servidor: se perdería en el siguiente push.

| Variable | Qué es |
|---|---|
| `DOMINIO` | Dominio público, **sin** `https://`. Alimenta el `server_name` de Nginx, la ruta del certificado y la prueba de humo |
| `POSTGRES_PASSWORD` | Contraseña del dueño de las tablas (el usuario de migraciones). 16+ caracteres |
| `API_DB_CLAVE` | Contraseña del usuario de la API (privilegio mínimo). 16+ caracteres |
| `JWT_SECRETO` | Firma de las sesiones del panel. 32+ caracteres aleatorios |
| `CLAVE_WEBHOOKS` | De ella se deriva el secreto de webhooks de cada sitio web. 32+ caracteres |
| `BRAVE_SEARCH_CLAVE` | **Opcional**: el bot. Sin ella no busca y lo dice en el panel |

Genera cada secreto con `python3 -c "import secrets; print(secrets.token_urlsafe(48))"`.
Sin los cuatro obligatorios, `docker compose` se niega a componer y
`deploy.sh` aborta antes de tocar nada (también si son cortos o de relleno).
Lo que NO es secreto (entorno, usuarios y nombre de la base, Redis, carpeta de
fotos) va fijo en `docker-compose.yml`.

Sin `DOMINIO`, `docker compose` se niega a componer (`${DOMINIO:?…}`) y
`deploy.sh` aborta antes de tocar nada. No tiene valor por defecto a
propósito: un `localhost` haría pasar la prueba de humo contra un
`server_name` que en el dominio real no responde.

### 1.2 Cómo llega el dominio a Nginx

`frontend/nginx.conf.template` se copia a `/etc/nginx/templates/` dentro de la
imagen. Al arrancar, la imagen oficial de Nginx corre `envsubst` sobre esa
plantilla. El Dockerfile fija `NGINX_ENVSUBST_FILTER=^BEACHCLUB_`: **sin ese
filtro, envsubst vaciaría también las variables propias de Nginx** (`$host`,
`$uri`, `$request_uri`) y la config quedaría rota. Toda variable nuestra en la
plantilla lleva el prefijo `BEACHCLUB_`.

La plantilla va **dentro de la imagen**, no montada como archivo. En SIMDES,
montada, un `git pull` cambiaba el inodo y el contenedor seguía leyendo la
plantilla vieja. Aquí cada despliegue la hornea de nuevo.

### 1.3 Variables `VITE_*`

Hoy no hay ninguna. Si se añaden: se resuelven **al compilar**, no en
ejecución, así que viajan como `build.args` y se escriben en el `.env` que
genera `deploy.yml`.

---

## 2. Qué hace `deploy.sh`

1. **Comprobaciones previas**, antes de tocar lo que corre: `.env` existe,
   `DOMINIO` no está vacío, los secretos del backend están y no son cortos ni
   de relleno, no hay un `docker-compose.override.yml`, hay certificado para
   ese dominio y la composición es válida.
2. **Anota las imágenes actuales** (`beachclub-frontend:latest` y
   `beachclub-backend:latest`) para poder volver.
3. **Construye** las nuevas.
4. **`nginx -t` sobre la imagen NUEVA** (`docker compose run --rm frontend
   nginx -t`) antes de sustituir la que corre. Un error de sintaxis en la
   plantilla se detecta aquí, sin haber tirado el sitio.
5. **Base y Redis arriba** (`up --wait`), el volumen de fotos con dueño uid 1000
   (la API escribe ahí) y, si la base ya existía, **respaldo antes de migrar**
   (`scripts/respaldo.sh antes-de-desplegar`).
6. **Migraciones y particiones con la imagen NUEVA** (`run --rm api alembic
   upgrade head` y `python -m app.cli particiones`), antes de sustituir la API
   que corre.
7. **Levanta** todo (`up --wait`: espera a que la API esté sana).
8. **Prueba de humo**: HTTP real contra el dominio (con `--resolve` a
   `127.0.0.1`): `/` y `/admin` dan 200 (el fallback del router),
   `/api/health` y `/api/health/listo` dan 200 (la API, la base y Redis),
   `/api/auth/yo` y `/api/v1/habitaciones` dan 401 (piden sesión o clave).
9. **Revierte** si falla cualquier paso: re-etiqueta las imágenes anteriores y
   recrea `frontend`, `api` y `celery`. **La base no se revierte**: las
   migraciones deben ser compatibles con el código anterior (añadir antes de
   quitar). Si una no lo es, el respaldo de antes de migrar está en
   `respaldos/`.

Probado de punta a punta en local con la imagen de producción (2026-10-12):
humo 6/6, alta del gerente por la CLI, cookies `Secure`, una foto escrita por
la API y servida por Nginx, Celery sin errores, y un respaldo restaurado en
otra base con la cadena de auditoría íntegra.

> **Por qué la imagen tiene nombre fijo** (`image:` en `docker-compose.yml`).
> El rollback funciona re-etiquetando la imagen anterior con el nombre que
> usa el servicio. En SIMDES se etiquetaba como `simdes-rollback-<svc>`, un
> nombre que ningún servicio usa, y `up --no-build` volvía a levantar la
> imagen rota.

---

## 3. Cómo queda el stack

```
Internet ──► 80  ──► frontend (Nginx) ──┬── /.well-known/acme-challenge/ → /var/www/certbot
                                        └── resto → 301 a https
         ──► 443 ──► frontend (Nginx) ──┬── /assets/*  (caché 1 año, llevan hash)
                                        ├── /index.html (sin caché)
                                        └── /*  → index.html (rutas de React Router)
```

Montajes, de solo lectura: `/etc/letsencrypt` (certificados, tal cual),
`/var/www/certbot` (retos de renovación) y el volumen `fotos`. Tope: 128 MB.

Detrás de Nginx, sin puertos publicados (solo la red interna): `api`
(uvicorn, 2 workers, 512 MB), `celery` (worker + beat, UN solo contenedor,
512 MB), `postgres` (1 GB, volumen `postgres`) y `redis` (320 MB, volumen
`redis`). Droplet de **4 GB como mínimo** (`docs/PLAN-BACKEND.md` §2).
`api` y `celery` usan la misma imagen, `beachclub-backend`.

---

## 4. Preparar el droplet (una vez, a mano)

Debian 12 recomendado. Todo esto como `root` con tu clave personal.

```bash
# Docker (repositorio oficial) y utilidades
apt update && apt install -y ca-certificates curl git ufw fail2ban certbot
# → instalar Docker Engine + compose plugin: docs.docker.com/engine/install/debian

# Usuario de despliegue, sin contraseña y sin sudo
adduser --disabled-password --gecos "" deploy
usermod -aG docker deploy
mkdir -p /opt/beachclub /var/www/certbot
chown deploy:deploy /opt/beachclub

# Firewall: solo SSH, HTTP y HTTPS
ufw allow OpenSSH && ufw allow 80/tcp && ufw allow 443/tcp && ufw enable
```

> Estar en el grupo `docker` equivale en la práctica a `root` (se puede montar
> cualquier ruta del host). Es lo que hace falta para desplegar y nada más: no
> se abre `sudo`.

**SSH solo por clave.** En `/etc/ssh/sshd_config`:

```
PermitRootLogin prohibit-password
PasswordAuthentication no
```

`sshd -t` para validar **antes** de `systemctl reload ssh` (nunca `restart`), y
probar con una conexión NUEVA en otra terminal antes de cerrar la actual. Un
error aquí deja el servidor inalcanzable.

**fail2ban** (`/etc/fail2ban/jail.local`):

```
[DEFAULT]
bantime  = 1h
findtime = 10m
maxretry = 3
[sshd]
enabled = true
```

---

## 5. TLS (Let's Encrypt)

El DNS del dominio tiene que apuntar ya al droplet.

**Primera emisión**, con el puerto 80 libre (Docker todavía sin levantar):

```bash
certbot certonly --standalone --agree-tos -m TU-CORREO -d TU-DOMINIO
```

**Después del primer despliegue**, pasar la renovación a *webroot* (Nginx ya
sirve `/.well-known/acme-challenge/` desde `/var/www/certbot`), así renueva
sin parar el sitio:

```bash
certbot certonly --webroot -w /var/www/certbot -d TU-DOMINIO --force-renewal \
  --deploy-hook "cd /opt/beachclub && docker compose exec -T frontend nginx -s reload"
certbot renew --dry-run          # debe terminar sin errores
```

Eso deja guardados en `/etc/letsencrypt/renewal/TU-DOMINIO.conf` el método
webroot y el hook. El temporizador de systemd de certbot renueva solo, y el
hook recarga Nginx. No hay que copiar certificados: el contenedor monta
`/etc/letsencrypt` directo.

---

## 6. Despliegue automático (GitHub Actions)

```
GitHub Actions ──(DEPLOY_SSH_KEY)──► servidor (usuario deploy)
                                         │
                                         └──(github_deploy_key, EN el servidor)──► GitHub (git fetch)
```

Dos claves **distintas**, una por sentido. Ninguna es tu clave personal.

### 6.1 Crear las claves

```bash
# En TU máquina: Actions → servidor
ssh-keygen -t ed25519 -C "github-actions-deploy-beachclub" -f ./beachclub_deploy -N ""
# La PÚBLICA va a /home/deploy/.ssh/authorized_keys del servidor.
# La PRIVADA va al Secret DEPLOY_SSH_KEY (archivo entero, con BEGIN/END).

# EN EL SERVIDOR, como deploy: servidor → GitHub (solo lectura)
ssh-keygen -t ed25519 -C "deploy@beachclub (solo lectura)" -f ~/.ssh/github_deploy_key -N ""
cat >> ~/.ssh/config <<'EOF'
Host github.com
    HostName github.com
    User git
    IdentityFile ~/.ssh/github_deploy_key
    IdentitiesOnly yes
EOF
cat ~/.ssh/github_deploy_key.pub    # → GitHub, §6.2-A

# IMPRESCINDIBLE: sin esto el primer `git fetch` del workflow falla con
# "Host key verification failed" (nadie puede contestar "yes" en un script).
ssh-keyscan -t ed25519,rsa github.com >> ~/.ssh/known_hosts
ssh-keygen -lf ~/.ssh/known_hosts | grep github
# Comparar con las huellas publicadas en docs.github.com ("GitHub's SSH key fingerprints").

ssh -T git@github.com                # debe saludar nombrando AL REPO
git clone git@github.com:cristianHNITSP/WebsiteBeachClub.git /opt/beachclub
```

### 6.2 Dónde pegar cada cosa

**A. Deploy Key:** GitHub → Settings → Deploy keys → Add deploy key. El
contenido es `github_deploy_key.pub`. **Sin** "Allow write access".

**B. Secrets:** GitHub → Settings → Secrets and variables → Actions:

| Secret | Valor |
|---|---|
| `DEPLOY_HOST` | IP del droplet |
| `DEPLOY_USER` | `deploy` |
| `DEPLOY_SSH_KEY` | la privada de §6.1 |
| `DOMINIO` | el dominio, sin `https://` |
| `POSTGRES_PASSWORD`, `API_DB_CLAVE`, `JWT_SECRETO`, `CLAVE_WEBHOOKS` | aleatorios, ver §1.1 |
| `BRAVE_SEARCH_CLAVE` | solo si se usa el bot (si no, **no lo crees**) |

> **No crees Secrets opcionales con valor de relleno** (`-`, un espacio).
> GitHub no admite vacíos, y un Secret que no existe se resuelve solo a
> texto vacío, que es lo correcto. Rellenarlo hace que el código lo tome
> como configurado.

### 6.3 Qué pasa en cada push a `main`

1. `ci.yml`: frontend (`npm ci`, lint, build, `npm audit` que solo avisa,
   build de la imagen) y backend (ruff, pytest contra Postgres y Redis reales,
   la prueba de carga de 1 millón de reservas antes de `main`, `pip-audit`
   que bloquea).
2. Si pasa, el job `deploy` (llama a `deploy.yml`, `needs:` en el mismo
   workflow) entra por SSH, **regenera `.env`**, hace `git fetch && git
   reset --hard origin/main` y corre `./scripts/deploy.sh`.
3. `concurrency` impide dos despliegues a la vez.

`workflow_dispatch` permite redesplegar a mano desde la pestaña Actions (p. ej.
tras cambiar un Secret).

### 6.4 Primer despliegue, en orden

1. §4 (droplet), §6.1 y §6.2 (claves y Secrets), clonar en `/opt/beachclub`.
2. §5, primera emisión (standalone).
3. Crear los Secrets del backend (§6.2-B) y redesplegar con
   `workflow_dispatch`, o escribir a mano un `.env` con todo lo de §1.1 y
   `./scripts/deploy.sh --dry-run`.
4. `./scripts/deploy.sh`, o un push a `main`.
5. §5, pasar la renovación a webroot.
6. **El primer gerente** (no hay otra forma de entrar al panel; la contraseña
   se pide sin eco, nunca va en la línea de comandos):
   `docker compose exec api python -m app.cli crear-usuario --usuario … --correo … --nombre "…" --rol gerente`
7. Cron de respaldos (§7.1).

---

## 7. Cuando llegue el backend

Lista de lo que hay que tocar, para no dejar nada a medias:

- [x] Servicio nuevo en `docker-compose.yml` **sin `ports`** (solo lo alcanza Nginx por la red interna), con tope de memoria.
- [x] `location /api/` en `frontend/nginx.conf.template` (hecho, 2026-10-11): `proxy_pass` a `api:8000` con el resolver de Docker (`127.0.0.11`) y el destino en una variable, así Nginx arranca aunque el backend no esté (responde 502 en `/api`) y no se queda con la IP vieja si la API se recrea. Tope de 1 MB; 16 MB solo en la subida de fotos.
- [x] **`proxy_set_header X-Forwarded-For $remote_addr;`** (sobrescribir, NO `$proxy_add_x_forwarded_for`): la API confía en esa cabecera para la IP de la auditoría forense y del límite de intentos (`docs/PLAN-BACKEND.md` §17.4). Con `$proxy_add_…` el cliente podría inventarse la IP.
- [x] **Microcaché de `/api/v1/`** (API pública de las websites, `docs/PLAN-BACKEND.md` §12, hecho 2026-10-12): `proxy_cache_path` arriba de la plantilla, llave con Origin y `X-Frida-Clave`, la API decide el tiempo con `X-Accel-Expires`; con `Authorization` (clave secreta) nunca se cachea. Probado con la imagen de producción: 3 peticiones iguales = 1 a la API.
- [ ] NTP activo en el droplet (`timedatectl`): la hora de la auditoría es evidencia.
- [x] **Fotos** (`docs/PLAN-BACKEND.md` §18, hecho 2026-10-11): volumen `fotos` en `docker-compose.yml`, montado **solo lectura** en `frontend` en `/datos/fotos`; Nginx sirve SOLO `/media/fotos/<uuid>/<uuid>/<uuid>-<480|1080|1920>.webp` (nada de listados ni `.tmp`; el resto de `/media/` es 404), solo GET, `expires 30d`. Hecho al desplegar la API: montado **con escritura** en `api` y `celery`, `FOTOS_DIR=/datos/fotos` fija en el compose, y el volumen entra en los respaldos junto con la base.
- [ ] Los sellos de auditoría (`{"sello_auditoria": …}` en el registro de `celery`) se quedan en el droplet; los dueños del sistema los copian a mano a su equipo (decisión del usuario, `docs/PLAN-BACKEND.md` §17.4). Que el registro de Docker no los rote antes de copiarlos.
- [x] ~~Nginx resuelve el nombre del servicio una vez al arrancar~~: resuelto con el resolver de Docker y el destino en variable (ver arriba). Ya no hace falta recrear `frontend` tras levantar la API.
- [x] Secrets nuevos (`POSTGRES_PASSWORD`, `API_DB_CLAVE`, `JWT_SECRETO`, `CLAVE_WEBHOOKS`, y opcional `BRAVE_SEARCH_CLAVE` para el bot; ver `backend/.env.example`): en GitHub, en el heredoc del `.env` de `deploy.yml` y en las comprobaciones previas de `deploy.sh`. El backend además debe **negarse a arrancar** si falta alguno (fail fast; los valores de relleno tipo `change-me` cuentan como ausentes).
- [x] Migraciones en `deploy.sh`, después de levantar y antes de la prueba de humo, y enseguida `python -m app.cli particiones` (particiones mensuales de 24 meses adelante, `docs/PLAN-BACKEND.md` §9; idempotente).
- [x] `comprobar "/api/health" 200 …` en la prueba de humo (y `/api/health/listo`, `/api/auth/yo` 401, `/api/v1/habitaciones` 401).
- [x] Proxy `/api` en `frontend/vite.config.js` para desarrollo, con destino por variable de entorno.
- [x] Añadir el backend a `docker-compose.dev.yml` (desarrollo), nunca a un `docker-compose.override.yml`: ese lo carga Compose solo y en el servidor publicaría puertos saltándose Nginx. Si alguien lo crea, que `deploy.sh` aborte al encontrarlo.
- [x] Tests del backend en `ci.yml` antes del job `deploy`.
- [x] **Respaldos:** `scripts/respaldo.sh` (base con `pg_dump -Fc` y fotos en tar.gz, los 14 últimos) antes de cada migración y por cron (§7.1). **Pendiente del usuario:** a dónde se copian FUERA del droplet.

### 7.1 Respaldos y rotación de secretos

- **Respaldo diario** (usuario `deploy`, `crontab -e`):
  `15 4 * * * /opt/beachclub/scripts/respaldo.sh >> /opt/beachclub/respaldos/cron.log 2>&1`.
  Quedan en `/opt/beachclub/respaldos/` (modo 600, fuera de git). **Copiarlos fuera
  del droplet** es una decisión pendiente (Spaces, otro servidor o el equipo de
  los dueños): un respaldo en el mismo disco no sobrevive a perder el droplet.
- **Restaurar:** `docker compose exec -T postgres pg_restore -U beachclub_migraciones -d beachclub --clean < base-….dump`
  y las fotos con `tar xzf` dentro del volumen. Ensayarlo una vez al mes en otra base (`createdb restaurada`)
  y comprobar la cadena: `SELECT * FROM auditoria_verificar(1)`.
- **Rotar `JWT_SECRETO`**: cambiar el Secret y redesplegar (todas las sesiones se cierran).
- **Rotar `CLAVE_WEBHOOKS`**: cambiar el Secret, redesplegar y darle a cada sitio su secreto nuevo
  (Configuración → Sitios web → "Nuevo secreto de webhooks").
- **Rotar `POSTGRES_PASSWORD` o `API_DB_CLAVE`**: el Secret solo NO basta (la base guardó la contraseña
  al crearse). Primero `docker compose exec postgres psql -U beachclub_migraciones -d beachclub -c "\password beachclub_api"`
  (o `beachclub_migraciones`), con la contraseña nueva; después el Secret y redesplegar.

---

## 8. Qué revisar cuando algo falla

| Síntoma | Dónde mirar |
|---|---|
| El workflow falla al conectar por SSH | `DEPLOY_HOST`/`DEPLOY_USER`/`DEPLOY_SSH_KEY`. La privada completa, con `BEGIN`/`END`, y su pública en `authorized_keys` de `deploy` |
| **"Host key verification failed"** | Engaña: la sesión Actions→servidor sí entró. Falla el salto servidor→GitHub por falta de `known_hosts` (§6.1, `ssh-keyscan`) |
| `git fetch` falla en el servidor | Falta la Deploy Key en GitHub, o se regeneró `github_deploy_key` sin actualizarla |
| `deploy.sh`: "No hay certificado" | §5, primera emisión. El nombre de la carpeta en `live/` debe ser exactamente `DOMINIO` |
| `nginx -t` falla | Error en `nginx.conf.template`. Probar local: ver `CLAUDE.md`, "Probar la imagen" |
| Nginx arranca pero el proxy pierde `$host` | Alguien quitó `NGINX_ENVSUBST_FILTER` del Dockerfile (§1.2) |
| 404 en el dominio real y en `--resolve` va bien | `DOMINIO` ≠ DNS real. `docker compose exec frontend grep server_name /etc/nginx/conf.d/default.conf` |
| Recargar `/admin/...` da 404 | Falta el `try_files … /index.html` |
| El certificado venció | `certbot renew --dry-run`. ¿Renovación en webroot (§5)? ¿`/var/www/certbot` montado? |
| Tras renovar, el navegador sigue viendo el certificado viejo | El `--deploy-hook` no recargó Nginx: `cat /etc/letsencrypt/renewal/TU-DOMINIO.conf` |
