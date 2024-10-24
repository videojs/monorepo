/* eslint-disable no-console,jsdoc/no-types */
import { execSync } from 'node:child_process';
import { basename } from 'node:path';
import { writeFileSync } from 'node:fs';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import { dts } from 'rollup-plugin-dts';
import { visualizer } from 'rollup-plugin-visualizer';
import commonjs from '@rollup/plugin-commonjs';
import replace from '@rollup/plugin-replace';
import typescript from '@rollup/plugin-typescript';
import terser from '@rollup/plugin-terser';
import copy from 'rollup-plugin-copy';

const commitHash = (() => {
  try {
    return execSync('git rev-parse HEAD').toString().trim();
  } catch (e) {
    console.log('Failed to generate commit Hash: ', e);
    return 'mock-commit-hash';
  }
})();

export class Configuration {
  static Format_ = { Es: 'es', Cjs: 'cjs', Iife: 'iife' };
  static FileName_ = {
    Min: 'index.min.js',
    Debug: 'index.debug.js',
    Diagnostics: 'index.diagnostics.js',
    DiagnosticsStats: 'index.diagnostic-stats.html',
  };

  /**
   *
   * @param {{ name: string, input: string, version: string, packageName: string }} deps - required deps
   * @param {{ folder?: string, experimental?: boolean, includeDiagnostics?: boolean }} [options] - optional options
   */
  constructor(deps, options = {}) {
    const { name, packageName, input, version } = deps;
    const { folder = '', experimental = false, includeDiagnostics = false } = options;

    /**
     * package version is injected as global __VERSION property in the bundle
     * package version is included in the license banner
     */
    this.version_ = version;
    /**
     * global namespace for iife build
     */
    this.name_ = name;
    /**
     * target input for the build
     */
    this.input_ = input;
    /**
     * package name for license banner
     */
    this.packageName_ = packageName;

    /**
     * optional
     * experimental build will have __EXPERIMENTAL property as true in the bundle
     */
    this.experimental_ = experimental;
    /**
     * optional
     * when true, diagnostics bundles will be generated
     */
    this.includeDiagnostics_ = includeDiagnostics;
    /**
     * optional
     * sub folder in the dist.
     */
    this.folder_ = folder;

    this.externals_ = [];
    this.globals_ = {};

    this.bundleSize_ = {
      files: [],
    };
  }

  get input() {
    return this.input_;
  }

  get external() {
    return (id) => this.externals_.some((name) => id.startsWith(name));
  }

  get output() {
    const licenseBanner = `/**
 * @license
 * ${this.packageName_} ${this.version_}
 * Copyright Brightcove, Inc. <https://www.brightcove.com/>
 * Available under Apache License Version 2.0
 * <https://github.com/videojs/monorepo/blob/main/LICENSE>
 */`;

    return [
      /**
       * es/index.debug.js
       * es/index.diagnostics.js (optional)
       * es/index.diagnostics-stats.html (optional)
       * es/index.min.js
       */
      this.createEsMinBundle_(),
      this.createEsDebugBundle_(),
      this.includeDiagnostics_ ? this.createEsDiagnosticsBundle_() : null,
      /**
       * cjs/index.debug.js
       * cjs/index.diagnostics.js (optional)
       * cjs/index.diagnostics-stats.html (optional)
       * cjs/index.min.js
       */
      this.createCjsMinBundle_(),
      this.createCjsDebugBundle_(),
      this.includeDiagnostics_ ? this.createCjsDiagnosticsBundle_() : null,
      /**
       * iife/index.debug.js
       * iife/index.diagnostics.js (optional)
       * iife/index.diagnostics-stats.html (optional)
       * iife/index.min.js
       */
      this.createIifeMinBundle_(),
      this.createIifeDebugBundle_(),
      this.includeDiagnostics_ ? this.createIifeDiagnosticsBundle_() : null,
    ]
      .filter((output) => output !== null)
      .map((output) => {
        output.banner = licenseBanner;
        return output;
      });
  }

  createEsMinBundle_() {
    const { FileName_, Format_ } = Configuration;

    return {
      file: this.withBasePath_(`${Format_.Es}/${FileName_.Min}`),
      format: Configuration.Format_.Es,
      exports: 'auto',
      plugins: [
        terser({
          keep_classnames: true,
          keep_fnames: true,
        }),
      ],
    };
  }

  createEsDebugBundle_() {
    const { FileName_, Format_ } = Configuration;

    return {
      file: this.withBasePath_(`${Format_.Es}/${FileName_.Debug}`),
      format: Configuration.Format_.Es,
      exports: 'auto',
      sourcemap: 'inline',
    };
  }

  createEsDiagnosticsBundle_() {
    const { FileName_, Format_ } = Configuration;

    return {
      file: this.withBasePath_(`${Format_.Es}/${FileName_.Diagnostics}`),
      format: Configuration.Format_.Es,
      exports: 'auto',
      plugins: [
        visualizer({
          gzipSize: true,
          open: false,
          filename: this.withBasePath_(`${Format_.Es}/${FileName_.DiagnosticsStats}`),
        }),
      ],
    };
  }

  createCjsMinBundle_() {
    const { FileName_, Format_ } = Configuration;

    return {
      file: this.withBasePath_(`${Format_.Cjs}/${FileName_.Min}`),
      format: Configuration.Format_.Cjs,
      exports: 'auto',
      plugins: [
        terser({
          keep_classnames: true,
          keep_fnames: true,
        }),
      ],
    };
  }

  createCjsDebugBundle_() {
    const { FileName_, Format_ } = Configuration;

    return {
      file: this.withBasePath_(`${Format_.Cjs}/${FileName_.Debug}`),
      format: Configuration.Format_.Cjs,
      exports: 'auto',
      sourcemap: 'inline',
    };
  }

  createCjsDiagnosticsBundle_() {
    const { FileName_, Format_ } = Configuration;

    return {
      file: this.withBasePath_(`${Format_.Cjs}/${FileName_.Diagnostics}`),
      format: Configuration.Format_.Cjs,
      exports: 'auto',
      plugins: [
        visualizer({
          gzipSize: true,
          open: false,
          filename: this.withBasePath_(`${Format_.Cjs}/${FileName_.DiagnosticsStats}`),
        }),
      ],
    };
  }

  createIifeMinBundle_() {
    const { FileName_, Format_ } = Configuration;

    return {
      file: this.withBasePath_(`${Format_.Iife}/${FileName_.Min}`),
      format: Configuration.Format_.Iife,
      globals: this.globals_,
      name: this.name_,
      plugins: [
        terser({
          keep_classnames: true,
          keep_fnames: true,
        }),
      ],
    };
  }

  createIifeDebugBundle_() {
    const { FileName_, Format_ } = Configuration;

    return {
      file: this.withBasePath_(`${Format_.Iife}/${FileName_.Debug}`),
      format: Configuration.Format_.Iife,
      globals: this.globals_,
      name: this.name_,
      sourcemap: 'inline',
    };
  }

  createIifeDiagnosticsBundle_() {
    const { FileName_, Format_ } = Configuration;

    return {
      file: this.withBasePath_(`${Format_.Iife}/${FileName_.Diagnostics}`),
      format: Configuration.Format_.Iife,
      globals: this.globals_,
      name: this.name_,
      plugins: [
        visualizer({
          gzipSize: true,
          open: false,
          filename: this.withBasePath_(`${Format_.Iife}/${FileName_.DiagnosticsStats}`),
        }),
      ],
    };
  }

  withBasePath_(filename) {
    if (this.folder_) {
      return `dist/${this.folder_}/${filename}`;
    }

    return `dist/${filename}`;
  }

  get plugins() {
    const bundleSize = this.bundleSize_;
    const withBasePath = this.withBasePath_.bind(this);

    return [
      nodeResolve(),
      commonjs(),
      replace({
        preventAssignment: true,
        values: {
          __COMMIT_HASH: JSON.stringify(commitHash),
          __VERSION: JSON.stringify(this.version_),
          __EXPERIMENTAL: this.experimental_,
        },
      }),
      typescript(),
      // custom plugin to generate bundlesize config
      {
        name: 'rollup-plugin-bundle-size',
        generateBundle(options, bundle) {
          const file = basename(options.file);
          const size = bundle[file].code.length;
          const maxSize = Math.ceil(size / 1024);

          bundleSize.files.push({
            path: options.file,
            maxSize,
            compression: 'none',
          });

          console.log(`Generate bundle ${options.file} → ~${maxSize} Kb.`);
        },
        closeBundle() {
          writeFileSync(withBasePath('bundlesize.json'), JSON.stringify(bundleSize, null, 2));
        },
      },
      // each sub package must place rollup.config.js at it's own root
      copy({
        targets: [{ src: '../../LICENSE', dest: 'dist' }],
      }),
    ];
  }

  get rawRollupConfig() {
    return {
      input: this.input,
      output: this.output,
      plugins: this.plugins,
      external: this.external,
    };
  }
}

export class DtsConfiguration extends Configuration {
  get output() {
    return [{ file: this.withBasePath_('types/index.d.ts'), format: 'es' }];
  }

  get plugins() {
    // each sub-package must have its own ts config:
    return [dts({ tsconfig: './tsconfig.json' })];
  }
}
