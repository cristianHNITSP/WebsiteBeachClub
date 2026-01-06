// vite.config.js
import { defineConfig, loadEnv } from "vite";
import { fileURLToPath, URL } from "url";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), ""); // lee .env, .env.production, etc.

  const EVENTS_TARGET = env.VITE_EVENTS_TARGET || "http://localhost:5050";
  const SHOP_TARGET = env.VITE_SHOP_TARGET || "http://localhost:4003";
  const RESERVAS_TARGET = env.VITE_RESERVAS_TARGET || "http://localhost:4002";
  const USERS_TARGET = env.VITE_USERS_TARGET || "http://localhost:4001";

  return {
    base: "/hotelesfrida.app/",
    plugins: [react()],
    resolve: {
      alias: {
        "@api": fileURLToPath(new URL("./src/api", import.meta.url)),
      },
    },
    server: {
      host: "0.0.0.0",
      proxy: {
        "/api/events": {
          target: EVENTS_TARGET,
          changeOrigin: true,
          ws: false,
        },

        // Reservas/Habitaciones
        "/api/reservas": { target: RESERVAS_TARGET, changeOrigin: true },
        "/api/habitaciones": { target: RESERVAS_TARGET, changeOrigin: true },
        "/api/hero-slides": { target: RESERVAS_TARGET, changeOrigin: true },

        // NUEVO: sedes en reservas-service
        "/api/sedes": { target: RESERVAS_TARGET, changeOrigin: true },

        // Socket.IO (muy importante)
        "/socket.io": {
          target: RESERVAS_TARGET,
          changeOrigin: true,
          ws: true,
        },

        // shop-service (ANTES de "/api")
        "/api/shop": { target: SHOP_TARGET, changeOrigin: true },

        // Auth + users (catch-all)
        "/api": { target: USERS_TARGET, changeOrigin: true },
      },
    },
  };
});
