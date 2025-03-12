import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  root: 'demo',
  base: '/',
  build: {
    outDir: '../dist-demo',
    emptyOutDir: true,
  },
  server: {
    watch: {
      usePolling: true,
    },
    hmr: true,
  }
});
