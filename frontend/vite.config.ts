import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: ['frontend'],
    watch: { usePolling: process.env.VITE_USE_POLLING === 'true' },
    proxy: { '/api': 'http://nginx' },
  },
});
