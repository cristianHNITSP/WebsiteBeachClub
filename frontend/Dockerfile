# ====== DEV (docker-compose.dev.yml) ======
# El código llega por bind-mount; node_modules vive en un volumen propio del
# contenedor (binarios musl, no se mezclan con los del host). Se crea aquí con
# dueño `node` (uid 1000) para que el volumen herede ese dueño y lo que genere
# el contenedor en el código (shadcn add, package.json) no quede de root.
FROM node:26-alpine AS dev
WORKDIR /app
RUN mkdir -p /app/node_modules && chown -R node:node /app
USER node
EXPOSE 5173
CMD ["sh", "-c", "npm install && npm run dev -- --host 0.0.0.0 --port 5173"]

# ====== BUILD ======
FROM node:26-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# ====== RUNTIME ======
FROM nginx:1.31-alpine AS prod
ENV NGINX_ENVSUBST_FILTER=^BEACHCLUB_
COPY nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html
