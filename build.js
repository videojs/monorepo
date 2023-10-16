/* eslint-disable no-undef */
import { version } from './packages/web-media-box/package.json';

const createConfig = ({ minify, naming }) => ({
  entrypoints: ['./packages/web-media-box/src/player/index.ts', './packages/web-media-box/src/hls-parser/index.ts', './packages/web-media-box/src/dash-parser/index.ts'],
  outdir: './packages/web-media-box/dist',
  target: 'browser',
  format: 'esm',
  sourcemap: 'external',
  minify,
  naming,
  define: {
    VERSION: JSON.stringify(version),
  },
});

await Promise.all([
  Bun.build(createConfig({ minify: false, naming: '[dir]/[name].debug.[ext]' })),
  Bun.build(createConfig({ minify: true, naming: '[dir]/[name].[ext]' })),
]);
