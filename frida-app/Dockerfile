# ====== BUILD ======
FROM node:18-alpine AS build
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci || npm install

COPY . .

# (Opcional) si quieres inyectar API URL en build:
ARG VITE_API_BASE
ENV VITE_API_BASE=$VITE_API_BASE

ARG VITE_RESERVAS_WS_URL
ENV VITE_RESERVAS_WS_URL=$VITE_RESERVAS_WS_URL

RUN npm run build

# ====== RUNTIME (NGINX) ======
FROM nginx:alpine AS prod
WORKDIR /usr/share/nginx/html

# Nginx config para SPA (history fallback)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copia el build
COPY --from=build /app/dist ./

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
