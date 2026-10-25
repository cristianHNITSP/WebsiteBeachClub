#!/usr/bin/env bash
# ============================================================================
# deploy.sh — corre EN EL SERVIDOR. Construye y levanta el stack de producción
# (frontend, api, celery, postgres, redis) y, si la verificación falla,
# REVIERTE a las imágenes anteriores.
#
#   ./scripts/deploy.sh            # despliega
#   ./scripts/deploy.sh --dry-run  # valida sin tocar nada
#
# Orden: comprobar todo → anotar imágenes actuales → construir → `nginx -t`
# sobre la imagen NUEVA → base y Redis arriba → respaldo → migraciones y
# particiones con la imagen NUEVA (antes de sustituir la que corre) → levantar →
# prueba de humo HTTP real contra el dominio → revertir si algo falla.
#
# Revertir devuelve las IMÁGENES, no la base: las migraciones deben ser
# compatibles con el código anterior (añadir antes de quitar). Si una no lo es,
# el respaldo de antes de migrar está en respaldos/ (scripts/respaldo.sh).
# ============================================================================
set -euo pipefail

APP_DIR="${APP_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
cd "$APP_DIR"

DRY_RUN=0
[[ "${1:-}" == "--dry-run" ]] && DRY_RUN=1

COMPOSE=(docker compose)
# Las mismas que `image:` en docker-compose.yml.
IMAGENES=(beachclub-frontend:latest beachclub-backend:latest)

rojo()  { printf '\033[31m%s\033[0m\n' "$*"; }
verde() { printf '\033[32m%s\033[0m\n' "$*"; }
paso()  { printf '\n\033[1m==> %s\033[0m\n' "$*"; }

# ── 1. Comprobaciones previas (antes de tocar lo que corre) ────────────────
paso "Comprobaciones previas"

if [[ ! -f .env ]]; then
    rojo "✗ Falta .env. Ver docs/deploy-config-REFERENCIA.md"
    exit 1
fi

# Compose carga solo un override y en el servidor publicaría puertos saltándose
# Nginx: si alguien lo crea, no se despliega.
if [[ -e docker-compose.override.yml || -e docker-compose.override.yaml ]]; then
    rojo "✗ Hay un docker-compose.override.yml en el servidor: bórralo (ver docs/deploy-config-REFERENCIA.md §7)"
    exit 1
fi

valor() { grep -E "^$1=" .env | tail -1 | cut -d= -f2- || true; }

# Sin valor por defecto a propósito: un "localhost" haría pasar la prueba de
# humo con un server_name que en el dominio real no responde.
DOMINIO="$(valor DOMINIO)"
if [[ -z "${DOMINIO// }" ]]; then
    rojo "✗ DOMINIO vacío en .env"
    exit 1
fi

# Secretos del backend: presentes, largos y no de relleno (la API haría lo
# mismo al arrancar, pero aquí se sabe ANTES de tocar nada).
faltan=0
for par in POSTGRES_PASSWORD:16 API_DB_CLAVE:16 JWT_SECRETO:32 CLAVE_WEBHOOKS:32; do
    nombre="${par%%:*}" minimo="${par##*:}" v="$(valor "${par%%:*}")"
    case "${v,,}" in change-me|changeme|cambiame|cambia-esto|password|prueba|secreto|postgres) v="" ;; esac
    if (( ${#v} < minimo )); then
        rojo "✗ $nombre falta, es de relleno o tiene menos de $minimo caracteres (Secret de GitHub)"
        faltan=1
    fi
done
(( faltan == 0 )) || exit 1

# /etc/letsencrypt/live es 0700 de root: `deploy` no puede mirarlo directo,
# pero sí a través de Docker (está en el grupo docker).
if ! docker run --rm -v /etc/letsencrypt:/le:ro nginx:1.27-alpine \
        test -f "/le/live/$DOMINIO/fullchain.pem"; then
    rojo "✗ No hay certificado para $DOMINIO en /etc/letsencrypt/live/"
    rojo "  Primer despliegue: ver §5 de docs/deploy-config-REFERENCIA.md"
    exit 1
fi

"${COMPOSE[@]}" config >/dev/null
verde "✓ Comprobaciones previas correctas ($DOMINIO)"

if (( DRY_RUN )); then
    paso "DRY RUN — no se tocó nada"
    exit 0
fi

# ── 2. Anotar a qué volver ─────────────────────────────────────────────────
declare -A ANTERIOR=()
for img in "${IMAGENES[@]}"; do
    ANTERIOR[$img]="$(docker image inspect -f '{{.Id}}' "$img" 2>/dev/null || true)"
    [[ -n "${ANTERIOR[$img]}" ]] && echo "    $img: ${ANTERIOR[$img]:7:12}" || echo "    $img: primer despliegue"
done

revertir() {
    rojo "✗ El despliegue falló"
    local hubo=0
    for img in "${IMAGENES[@]}"; do
        if [[ -n "${ANTERIOR[$img]}" ]]; then
            rojo "  Revirtiendo $img a ${ANTERIOR[$img]:7:12}"
            docker tag "${ANTERIOR[$img]}" "$img"
            hubo=1
        fi
    done
    (( hubo )) && { "${COMPOSE[@]}" up -d --no-build --force-recreate frontend api celery || true; }
    rojo "  Logs: docker compose logs --tail 80 frontend api celery"
    exit 1
}

# ── 3. Construir y validar ANTES de sustituir lo que corre ─────────────────
paso "Construyendo"
"${COMPOSE[@]}" build || revertir

paso "Validando la config de Nginx en la imagen nueva"
"${COMPOSE[@]}" run --rm --no-deps frontend nginx -t || revertir

# ── 4. Datos: base y Redis arriba, respaldo, migraciones ───────────────────
paso "Base de datos y Redis"
"${COMPOSE[@]}" up -d --wait postgres redis || revertir

# El volumen de fotos pudo nacer de root (si Nginx lo creó primero): la API escribe como uid 1000.
"${COMPOSE[@]}" run --rm --no-deps --user root --entrypoint chown api 1000:1000 /datos/fotos || revertir

if "${COMPOSE[@]}" exec -T postgres psql -U beachclub_migraciones -d beachclub -tAc \
        "SELECT 1 FROM pg_tables WHERE tablename = 'alembic_version'" | grep -q 1; then
    paso "Respaldo antes de migrar"
    ./scripts/respaldo.sh antes-de-desplegar || revertir
fi

paso "Migraciones (con la imagen nueva)"
"${COMPOSE[@]}" run --rm --no-deps api alembic upgrade head || revertir
"${COMPOSE[@]}" run --rm --no-deps api python -m app.cli particiones || revertir

paso "Levantando"
"${COMPOSE[@]}" up -d --remove-orphans --wait || revertir

# ── 5. Prueba de humo: HTTP real, con el Host del dominio ──────────────────
paso "Prueba de humo"
fallos=0
comprobar() {
    local ruta="$1" esperado="$2" descripcion="$3" code=000
    for _ in 1 2 3 4 5; do   # unos segundos para que Nginx termine de arrancar
        code="$(curl -sk -o /dev/null -w '%{http_code}' --max-time 10 \
                --resolve "$DOMINIO:443:127.0.0.1" "https://$DOMINIO$ruta" || echo 000)"
        [[ "$code" == "$esperado" ]] && break
        sleep 2
    done
    if [[ "$code" == "$esperado" ]]; then
        verde "  ✓ $descripcion ($ruta → $code)"
    else
        rojo  "  ✗ $descripcion ($ruta → $code, se esperaba $esperado)"
        fallos=$((fallos+1))
    fi
}
comprobar "/"                    200 "La SPA se sirve"
comprobar "/admin"               200 "Las rutas del router caen en index.html"
comprobar "/api/health"          200 "La API responde"
comprobar "/api/health/listo"    200 "La API alcanza la base y Redis"
comprobar "/api/auth/yo"         401 "El panel pide sesión"
comprobar "/api/v1/habitaciones" 401 "La API pública pide la clave del sitio"
(( fallos == 0 )) || revertir

docker image prune -f >/dev/null   # las imágenes colgadas de builds viejos
paso "Despliegue correcto"
verde "  https://$DOMINIO"
