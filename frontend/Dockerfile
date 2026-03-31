# ====== BUILD ======
FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci || npm install

COPY . .

ARG VITE_RESERVAS_TARGET
ARG VITE_USERS_TARGET
ARG VITE_SHOP_TARGET

ENV VITE_RESERVAS_TARGET=$VITE_RESERVAS_TARGET
ENV VITE_USERS_TARGET=$VITE_USERS_TARGET
ENV VITE_SHOP_TARGET=$VITE_SHOP_TARGET

RUN npm run build

# ====== RUNTIME ======
FROM nginx:alpine AS prod
WORKDIR /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist ./
