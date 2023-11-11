import { version } from './package.json';
import type { BuildConfig } from 'bun';

interface CreateConfigOptions {
  minify: boolean;
  naming: string;
}

const createConfig = ({ minify, naming }: CreateConfigOptions): BuildConfig => ({
  entrypoints: ['./src/index.ts'],
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
