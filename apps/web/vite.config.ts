import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    // En dev, /api se proxya a la API. Así la cookie de sesión es same-origin
    // (:5173). En producción, Caddy enruta /api (ARCHITECTURE §8).
    // El puerto sale de API_PORT para poder convivir con otros stacks locales.
    proxy: {
      '/api': {
        target: `http://localhost:${process.env['API_PORT'] ?? '3000'}`,
        changeOrigin: true,
      },
    },
  },
});
