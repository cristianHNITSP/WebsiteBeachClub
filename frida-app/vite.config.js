// vite.config.js
import { defineConfig, loadEnv } from "vite";
import { fileURLToPath, URL } from "url";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  const BASE = env.VITE_BASE || "/hotelesfrida.app/";

  const EVENTS_TARGET = env.VITE_EVENTS_TARGET || "http://localhost:5050";
  const SHOP_TARGET = env.VITE_SHOP_TARGET || "http://localhost:4003";
  const RESERVAS_TARGET = env.VITE_RESERVAS_TARGET || "http://localhost:4002";
  const USERS_TARGET = env.VITE_USERS_TARGET || "http://localhost:4001";

  const mk = (target, { ws = false } = {}) => ({
    target,
    changeOrigin: true,
    ws,
  });

  return {
    base: BASE,
    plugins: [react()],
    resolve: {
      alias: {
        "@api": fileURLToPath(new URL("./src/api", import.meta.url)),
      },
    },

    server: {
      host: "0.0.0.0",

      proxy: {
        // ==========================
        // Soporte extra: si algo llama /hotelesfrida.app/api/... en DEV
        // lo reescribimos a /api/... (para evitar bugs por base/subpath)
        // ==========================
        [BASE.replace(/\/$/, "") + "/api"]: {
          target: USERS_TARGET,
          changeOrigin: true,
          rewrite: (path) => path.replace(new RegExp("^" + BASE.replace(/\/$/, "")), ""),
        },
        [BASE.replace(/\/$/, "") + "/uploads"]: {
          target: RESERVAS_TARGET,
          changeOrigin: true,
          rewrite: (path) => path.replace(new RegExp("^" + BASE.replace(/\/$/, "")), ""),
        },
        [BASE.replace(/\/$/, "") + "/socket.io"]: {
          target: RESERVAS_TARGET,
          changeOrigin: true,
          ws: true,
          rewrite: (path) => path.replace(new RegExp("^" + BASE.replace(/\/$/, "")), ""),
        },

        // ==========================
        // EVENTS
        // ==========================
        "/api/events": mk(EVENTS_TARGET),

        // ==========================
        // RESERVAS / HABITACIONES / HERO / UPLOADS / SOCKET.IO
        // ==========================
        "/api/reservas": mk(RESERVAS_TARGET),
        "/api/habitaciones": mk(RESERVAS_TARGET),
        "/api/hero-slides": mk(RESERVAS_TARGET),

        // sedes (si aún lo atiende reservas-service)
        "/api/sedes": mk(RESERVAS_TARGET),

        "/uploads": mk(RESERVAS_TARGET),
        "/socket.io": mk(RESERVAS_TARGET, { ws: true }),

        // ==========================
        // SHOP (antes del catch-all /api)
        // ==========================
        "/api/shop": mk(SHOP_TARGET),

        // ==========================
        // USERS/AUTH (catch-all)
        // ==========================
        "/api": mk(USERS_TARGET),
      },
    },
  };
});
