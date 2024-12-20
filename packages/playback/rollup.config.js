import packageJson from './package.json' with { type: 'json' };
import { ConfigurationsBuilder } from '../../rollup.config.base.js';

const builder = new ConfigurationsBuilder({
  version: packageJson.version,
  packageName: packageJson.name,
});

export default [
  // CORE-MAIN PRODUCTION | DEBUG | DTS
  ...builder
    .copy()
    .setName('PlaybackNamespace')
    .setInput('./src/entry-points/main-core.ts')
    .setFolder('main/core')
    .build(),

  // CORE-WORKER PRODUCTION | DEBUG | DTS
  // TODO: inject __BUNDLED_WORKER_PIPELINE_LOADERS to the main thread script
  ...builder
    .copy()
    .setName('PlaybackNamespace')
    .setInput('./src/entry-points/main-with-worker-core.ts')
    .setWorker('dist/worker/es')
    .setFolder('main-with-worker/core')
    .build(),
];
