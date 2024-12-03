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
    .setInput('./src/entry-points/core-main.ts')
    .setFolder('main/core')
    .build(),

  // CORE-WORKER PRODUCTION | DEBUG | DTS
  ...builder
    .copy()
    .setName('PlaybackNamespace')
    .setInput('./src/entry-points/core-worker.ts')
    .setWorker('dist/worker/bridge/es')
    .setFolder('worker/core')
    .build(),
];
