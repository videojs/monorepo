/* eslint-disable no-undef */
import { version } from './package.json';

const createConfig = ({ minify, naming }) => ({
  entrypoints: ['./src/player/index.ts', './src/hls-parser/index.ts', 'src/dash-parser/index.ts'],
  outdir: './dist',
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
