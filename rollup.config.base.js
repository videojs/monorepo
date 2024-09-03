/* eslint-disable no-console */
import { execSync } from 'child_process';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import { dts } from 'rollup-plugin-dts';
import { visualizer } from 'rollup-plugin-visualizer';
import commonjs from '@rollup/plugin-commonjs';
import replace from '@rollup/plugin-replace';
import typescript from '@rollup/plugin-typescript';
import terser from '@rollup/plugin-terser';

const commitHash = (() => {
  try {
    return execSync('git rev-parse HEAD').toString().trim();
  } catch (e) {
    console.log('Failed to generate commit Hash: ', e);
    return 'mock-commit-hash';
  }
})();

class Configuration {
  static Format_ = { Es: 'es', Cjs: 'cjs', Iife: 'iife' };

  constructor({ folder, name, input, experimental, version }) {
    /**
     * package version is injected as global __VERSION property in the bundle
     */
    this.version_ = version;
    /**
     * optional sub folder in the dist.
     */
    this.folder_ = folder;
    /**
     * global namespace for iife build
     */
    this.name_ = name;
    /**
     * target input for the build
     */
    this.input_ = input;
    /**
     * experimental build will have __EXPERIMENTAL property as true in the bundle
     */
    this.experimental_ = experimental;

    this.externals_ = {};
    this.globals_ = {};
  }

  get input() {
    return this.input_;
  }

  get external() {
    return (id) => this.externals_.some((name) => id.startsWith(name));
  }

  get output() {
    const { es, cjs, iife } = this.createOutput_();

    es.file = this.withBasePath_(es.file);
    es.format = Configuration.Format_.Es;

    cjs.file = this.withBasePath_(cjs.file);
    cjs.format = Configuration.Format_.cjs;

    iife.file = this.withBasePath_(iife.file);
    iife.format = Configuration.Format_.iife;

    return [es, cjs, iife];
  }

  withBasePath_(filename) {
    if (this.folder_) {
      return `dist/${this.folder_}/${filename}`;
    }

    return `dist/${filename}`;
  }

  get plugins() {
    return [
      nodeResolve(),
      commonjs(),
      replace({
        __COMMIT_HASH: JSON.stringify(commitHash),
        __VERSION: JSON.stringify(this.version_),
        __EXPERIMENTAL: this.experimental_,
      }),
      typescript(),
    ];
  }

  createOutput_() {
    throw new Error('You must implement create output method!');
  }
}

export class MinifiedConfiguration extends Configuration {
  createOutput_() {
    return {
      es: {
        file: 'index.es.min.js',
        exports: 'auto',
        plugins: [terser()],
      },

      cjs: {
        file: 'index.cjs.min.js',
        exports: 'auto',
        plugins: [terser()],
      },

      iife: {
        file: 'index.iife.min.js',
        globals: this.globals_,
        name: this.name_,
        plugins: [terser()],
      },
    };
  }
}

export class DebugConfiguration extends Configuration {
  createOutput_() {
    return {
      es: {
        file: 'index.es.debug.js',
        exports: 'auto',
        sourcemap: 'inline',
      },

      cjs: {
        file: 'index.cjs.debug.js',
        exports: 'auto',
        sourcemap: 'inline',
      },

      iife: {
        file: 'index.iife.debug.js',
        globals: this.globals_,
        name: this.name_,
        sourcemap: 'inline',
      },
    };
  }
}

export class DiagnosticsConfiguration extends Configuration {
  createOutput_() {
    return {
      es: {
        file: 'index.es.diagnostics.js',
        exports: 'auto',
        plugins: [
          visualizer({
            gzipSize: true,
            open: false,
            filename: this.withBasePath_('index.es.diagnostics-stats.html'),
          }),
        ],
      },

      cjs: {
        file: 'index.cjs.diagnostics.js',
        exports: 'auto',
        plugins: [
          visualizer({
            gzipSize: true,
            open: false,
            filename: this.withBasePath_('index.cjs.diagnostics-stats.html'),
          }),
        ],
      },

      iife: {
        file: 'index.iife.diagnostics.js',
        globals: this.globals_,
        name: this.name_,
        plugins: [
          visualizer({
            gzipSize: true,
            open: false,
            filename: this.withBasePath_('index.iife.diagnostics-stats.html'),
          }),
        ],
      },
    };
  }
}

export class DtsConfiguration {
  constructor({ declarationsInput, folder }) {
    this.input_ = declarationsInput;
    this.folder_ = folder;
  }

  get input() {
    return this.input_;
  }

  get output() {
    return [{ file: `dist/${this.folder_}/index.d.ts`, format: 'es' }];
  }

  get plugins() {
    // each sub-package must have its own ts config:
    return [dts({ tsconfig: './tsconfig.json' })];
  }
}
