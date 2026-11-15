#!/bin/sh
# Instala piezas de devl.dev (y sus dependencias de coss.com/ui) SIN tocar components/ui,
# que es de shadcn y lo usa la website: usa components.devl.json solo durante la instalación.
#   docker compose -f docker-compose.dev.yml exec frontend-dev sh scripts/devl-add.sh liquid-slider launcher https://coss.com/ui/r/command.json
set -e
cd "$(dirname "$0")/.."
cp components.json /tmp/components.shadcn.json
trap 'cp /tmp/components.shadcn.json components.json' EXIT
cp components.devl.json components.json
# Una pieza a la vez y hasta 3 intentos: con Wi-Fi, muchas descargas en paralelo
# (cada pieza arrastra las suyas de coss.com) a veces agotan el límite de 10 s.
for n in "$@"; do
  for intento in 1 2 3; do
    case "$n" in *://*) url="$n" ;; *) url="https://devl.dev/r/$n.json" ;; esac  # una pieza de devl o una dirección completa (p. ej. coss)
    npx shadcn@latest add "$url" --yes && break
    [ "$intento" = 3 ] && { echo "No se pudo instalar $n"; exit 1; }
    echo "Reintentando $n ($intento)…"; sleep 3
  done
done
