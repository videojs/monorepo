import packageJson from './package.json' with { type: 'json' };
import { build } from 'vite';
import dts from 'vite-plugin-dts';
import banner from 'vite-plugin-banner';
import { viteStaticCopy } from 'vite-plugin-static-copy';
import { execSync } from 'node:child_process';

(async () => {
  const bannerPlugin = banner({
    content: `/**
  * @license
  * ${packageJson.name} ${packageJson.version}
  * Copyright Brightcove, Inc. <https://www.brightcove.com/>
  * Available under Apache License Version 2.0
  * <https://github.com/videojs/monorepo/blob/main/LICENSE>
  */`,
  });

  const name = 'PlaybackNamespace';
  const formats = ['cjs', 'es', 'iife'];

  const commitHash = (() => {
    try {
      return execSync('git rev-parse HEAD').toString().trim();
    } catch (e) {
      // eslint-disable-next-line no-console
      console.log('Failed to generate commit Hash: ', e);
      return 'mock-commit-hash';
    }
  })();

  const define = {
    __COMMIT_HASH: JSON.stringify(commitHash),
    __VERSION: JSON.stringify(packageJson.version),
    __EXPERIMENTAL: false,
  };

  // build production player with worker core
  await build({
    mode: 'production',
    define,
    plugins: [
      viteStaticCopy({
        targets: [
          {
            src: '../../LICENSE',
            dest: './',
          },
        ],
      }),
      dts({ rollupTypes: true, outDir: 'dist/player-with-worker/core/types', tsconfigPath: 'tsconfig.json' }),
      bannerPlugin,
    ],
    build: {
      outDir: 'dist',
      lib: {
        entry: 'src/entry-points/player-with-worker.ts',
        fileName: (format) => `player-with-worker/core/${format}/index.min.js`,
        formats,
        name,
      },
    },
  });

  // build development player with worker core
  await build({
    mode: 'development',
    define,
    plugins: [bannerPlugin],
    build: {
      sourcemap: 'inline',
      outDir: 'dist',
      emptyOutDir: false,
      minify: false,
      lib: {
        entry: 'src/entry-points/player-with-worker.ts',
        fileName: (format) => `player-with-worker/core/${format}/index.debug.js`,
        formats,
        name,
      },
    },
  });

  // build production player core
  await build({
    mode: 'production',
    define,
    plugins: [
      dts({ rollupTypes: true, outDir: 'dist/player/core/types', tsconfigPath: 'tsconfig.json' }),
      bannerPlugin,
    ],
    build: {
      outDir: 'dist',
      emptyOutDir: false,
      lib: {
        entry: 'src/entry-points/player.ts',
        fileName: (format) => `player/core/${format}/index.min.js`,
        formats,
        name,
      },
    },
  });

  // build development player core
  await build({
    mode: 'development',
    define,
    plugins: [bannerPlugin],
    build: {
      sourcemap: 'inline',
      outDir: 'dist',
      emptyOutDir: false,
      minify: false,
      lib: {
        entry: 'src/entry-points/player.ts',
        fileName: (format) => `player/core/${format}/index.debug.js`,
        formats,
        name,
      },
    },
  });
})();
