import packageJson from './package.json';
import { defineConfig } from 'vite';
import banner from 'vite-plugin-banner';

export default defineConfig({
  mode: 'development',
  plugins: [
    banner({
      content: `/**
 * @license
 * ${packageJson.name} ${packageJson.version}
 * Copyright Brightcove, Inc. <https://www.brightcove.com/>
 * Available under Apache License Version 2.0
 * <https://github.com/videojs/monorepo/blob/main/LICENSE>
 */`,
    }),
  ],
  build: {
    sourcemap: 'inline',
    outDir: 'dist',
    emptyOutDir: false,
    minify: false,
    lib: {
      entry: 'src/index.ts',
      formats: ['cjs', 'es', 'iife'],
      name: 'HlsParserNamespace',
      fileName: (format) => `${format}/index.debug.js`,
    },
  },
});
