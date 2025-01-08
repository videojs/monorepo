import packageJson from './package.json';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';
import banner from 'vite-plugin-banner';
import { viteStaticCopy } from 'vite-plugin-static-copy';

export default defineConfig({
  mode: 'production',
  plugins: [
    viteStaticCopy({
      targets: [
        {
          src: '../../LICENSE',
          dest: './',
        },
      ],
    }),
    dts({ rollupTypes: true, outDir: 'dist/types', tsconfigPath: 'tsconfig.json' }),
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
    outDir: 'dist',
    lib: {
      entry: 'src/index.ts',
      formats: ['cjs', 'es', 'iife'],
      name: 'HlsParserNamespace',
      fileName: (format) => `${format}/index.min.js`,
    },
  },
});
