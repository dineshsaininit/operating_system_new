import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
  server: {
    port: 5173,
    open: true,
    // When the backend is ready, uncomment and point to it so /api calls are proxied:
    // proxy: { '/api': { target: 'http://localhost:8000', changeOrigin: true } },
  },
});
