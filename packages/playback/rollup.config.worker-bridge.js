import packageJson from './package.json' with { type: 'json' };
import { ConfigurationsBuilder } from '../../rollup.config.base.js';

const builder = new ConfigurationsBuilder({
  version: packageJson.version,
  packageName: packageJson.name,
});

export default [
  // WORKER-BRIDGE PRODUCTION | DEBUG | DTS
  ...builder
    .copy()
    .setName('PlaybackWorkerBridgeNamespace')
    .setInput('./src/entry-points/worker-script.ts')
    .setFolder('worker')
    .build(),
];
