#!/bin/sh
# Solo corre la PRIMERA vez que arranca el volumen de Postgres (initdb).
# Crea el usuario de la API (privilegio mínimo, PLAN-BACKEND §17.2) y, solo en
# desarrollo (si se pide POSTGRES_DB_PRUEBAS), la base de pruebas. El dueño de
# las tablas es POSTGRES_USER (el de migraciones).
# Cambiar API_DB_CLAVE después NO cambia la contraseña del rol: hay que hacer
# ALTER ROLE a mano (docs/deploy-config-REFERENCIA.md).
set -eu
: "${API_DB_USUARIO:?Falta API_DB_USUARIO}" "${API_DB_CLAVE:?Falta API_DB_CLAVE}"
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" \
     -v usuario="$API_DB_USUARIO" -v clave="$API_DB_CLAVE" -v base="$POSTGRES_DB" <<'SQL'
CREATE ROLE :"usuario" LOGIN PASSWORD :'clave' NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT;
-- Ninguna consulta de la API dura más de 5 s (la conexión puede pedir menos).
ALTER ROLE :"usuario" SET statement_timeout = '5s';
GRANT CONNECT ON DATABASE :"base" TO :"usuario";
SQL
if [ -n "${POSTGRES_DB_PRUEBAS:-}" ]; then
    psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" \
         -v usuario="$API_DB_USUARIO" -v pruebas="$POSTGRES_DB_PRUEBAS" <<'SQL'
CREATE DATABASE :"pruebas";
GRANT CONNECT ON DATABASE :"pruebas" TO :"usuario";
SQL
fi
