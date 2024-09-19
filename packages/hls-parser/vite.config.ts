import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  root: 'demo',
  base: '/demo/hls-parser',
  build: {
    outDir: '../dist-demo',
    emptyOutDir: true,
  },
});
