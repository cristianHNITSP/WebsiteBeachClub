import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      //Backend de eventos (lo que ya tenías)
      "/api/events": {
        target: "http://localhost:5050",
        changeOrigin: true,
        ws: false,
        selfHandleResponse: false,
      },

      //Microservicio de reservas/habitaciones (puerto 4002)
      "/api/reservas": {
        target: "http://localhost:4002",
        changeOrigin: true,
      },
      "/api/habitaciones": {
        target: "http://localhost:4002",
        changeOrigin: true,
      },
      "/api/hero-slides": {
        target: "http://localhost:4002",
        changeOrigin: true,
      },

      //Microservicio de auth + users (puerto 4001)
      // /api/auth/...  y /api/users/... van acá
      "/api": {
        target: "http://localhost:4001",
        changeOrigin: true,
      },
      /*
        '/unsplash': {
        target: 'https://images.unsplash.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/unsplash/, ''),
      },  
      */
    },
  },
});
