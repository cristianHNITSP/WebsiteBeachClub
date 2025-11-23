import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api/events': {
        target: 'http://localhost:5050',
        changeOrigin: true,
        ws: false,
        selfHandleResponse: false,
      },
      '/api': {
        target: 'http://localhost:5050',
        changeOrigin: true,
      },
      '/unsplash': {
        target: 'https://images.unsplash.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/unsplash/, ''),
      },
    },
  },
})
