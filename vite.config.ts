import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      buffer: 'buffer',
    },
  },
  define: {
    global: 'globalThis',
  },
  optimizeDeps: {
    esbuildOptions: {
      define: {
        global: 'globalThis',
      },
    },
    exclude: ['lucide-react'],
  },
  preview: {
    port: 4173,
    host: true
  },
  server: {
    port: 5173,
    host: true
  },
  build: {
    rollupOptions: {
      plugins: [],
    },
  },
});