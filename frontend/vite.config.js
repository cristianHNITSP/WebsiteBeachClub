import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  const RESERVAS_TARGET = env.VITE_RESERVAS_TARGET || "http://localhost:4002";
  const USERS_TARGET    = env.VITE_USERS_TARGET    || "http://localhost:4001";
  const SHOP_TARGET     = env.VITE_SHOP_TARGET     || "http://localhost:4003";

  const mk = (target, { ws = false } = {}) => ({ target, changeOrigin: true, ws });

  return {
    plugins: [react()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    server: {
      host: "0.0.0.0",
      proxy: {
        "/api/reservas":     mk(RESERVAS_TARGET),
        "/api/habitaciones": mk(RESERVAS_TARGET),
        "/api/hero-slides":  mk(RESERVAS_TARGET),
        "/api/sedes":        mk(RESERVAS_TARGET),
        "/uploads":          mk(RESERVAS_TARGET),
        "/api/shop":         mk(SHOP_TARGET),
        "/api":              mk(USERS_TARGET),
      },
    },
  };
});
