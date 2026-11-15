import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

// Proxy /api → backend en desarrollo. El destino llega por variable de
// entorno (API_DESTINO, la pone docker-compose.dev.yml), nunca un literal.
// Solo hace falta al servir (npm run dev); el build no la necesita.
// Versión de esta compilación: va dentro del código (__VERSION__) y en /version.json. Si la
// publicada cambia, el panel abierto sabe que quedó viejo y ofrece actualizar (lib/version.js).
const VERSION = process.env.VERSION_APP || new Date().toISOString()
const publicarVersion = {
  name: "publicar-version",
  apply: "build",
  generateBundle() {
    this.emitFile({ type: "asset", fileName: "version.json", source: JSON.stringify({ version: VERSION }) });
  },
};

export default defineConfig(({ command }) => ({
  plugins: [react(), tailwindcss(), publicarVersion],
  define: { __VERSION__: JSON.stringify(VERSION) },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    host: "0.0.0.0",
    proxy: command === "serve" && process.env.API_DESTINO
      ? {
          "/api": { target: process.env.API_DESTINO, changeOrigin: false, xfwd: true }, // xfwd: la API ve la IP real
          // Fotos de las habitaciones: en desarrollo las sirve la API; en producción, Nginx.
          "/media": { target: process.env.API_DESTINO, changeOrigin: false },
        }
      : undefined,
  },
}));
