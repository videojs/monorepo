import packageJson from './package.json' with { type: 'json' };

import { Configuration, DtsConfiguration } from '../../rollup.config.base.js';

const defaults = {
  version: packageJson.version,
  packageName: packageJson.name,
};

const coreMain = {
  ...defaults,
  name: 'PlaybackNamespace',
  input: './src/entry-points/core-main.ts',
};

// TODO: inject __WORKER_CODE
const coreWorker = {
  ...defaults,
  name: 'PlaybackNamespace',
  input: './src/entry-points/core-worker.ts',
};

export default [
  // or new Configuration(deps, { includeDiagnostics: true }).rawRollupConfig
  new Configuration(coreMain, { folder: 'main/core' }).rawRollupConfig,
  new DtsConfiguration(coreMain, { folder: 'main/core' }).rawRollupConfig,
  new Configuration(coreWorker, { folder: 'worker/core' }).rawRollupConfig,
  new DtsConfiguration(coreWorker, { folder: 'worker/core' }).rawRollupConfig,
];
