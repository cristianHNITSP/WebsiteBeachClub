#!/usr/bin/env bash
# ============================================================================
# respaldo.sh — corre EN EL SERVIDOR. Respalda la base (pg_dump, formato
# personalizado) y las fotos (tar.gz) en respaldos/ y deja los 14 más recientes
# de cada uno (PLAN-BACKEND §8).
#
#   ./scripts/respaldo.sh                      # a mano o desde cron (diario)
#   ./scripts/respaldo.sh antes-de-desplegar   # lo llama deploy.sh antes de migrar
#
# Cron sugerido (usuario deploy):  15 4 * * *  /opt/beachclub/scripts/respaldo.sh >> /opt/beachclub/respaldos/cron.log 2>&1
#
# PENDIENTE (decisión del usuario): copiar respaldos/ FUERA del droplet (Spaces,
# otro servidor, el equipo de los dueños). Un respaldo que vive en el mismo
# disco no sobrevive a perder el droplet.
# Restaurar:  docker compose exec -T postgres pg_restore -U beachclub_migraciones -d beachclub --clean < base-….dump
# ============================================================================
set -euo pipefail

APP_DIR="${APP_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
cd "$APP_DIR"
DESTINO="$APP_DIR/respaldos"
GUARDAR=14

umask 077   # contienen datos de huéspedes y la auditoría: solo el dueño los lee
mkdir -p "$DESTINO"
marca="$(date -u +%Y%m%dT%H%M%SZ)${1:+-$1}"

docker compose exec -T postgres pg_dump -U beachclub_migraciones -Fc beachclub > "$DESTINO/base-$marca.dump.tmp"
mv "$DESTINO/base-$marca.dump.tmp" "$DESTINO/base-$marca.dump"
# Con el usuario del servidor: el archivo queda suyo y la rotación lo puede borrar.
docker compose run --rm --no-deps --user "$(id -u):$(id -g)" -v "$DESTINO:/respaldo" --entrypoint tar api \
    czf "/respaldo/fotos-$marca.tgz" -C /datos/fotos .
chmod 600 "$DESTINO/fotos-$marca.tgz"

for patron in 'base-*.dump' 'fotos-*.tgz'; do
    find "$DESTINO" -maxdepth 1 -name "$patron" -printf '%T@ %p\n' | sort -rn | tail -n +$((GUARDAR + 1)) | cut -d' ' -f2- | xargs -r rm --
done
echo "✓ Respaldo $marca: $(du -h "$DESTINO/base-$marca.dump" | cut -f1) de base, $(du -h "$DESTINO/fotos-$marca.tgz" | cut -f1) de fotos"
