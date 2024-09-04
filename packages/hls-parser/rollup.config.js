import packageJson from './package.json' with { type: 'json' };

import { Configuration, DtsConfiguration } from '../../rollup.config.base.js';

const deps = {
  version: packageJson.version,
  name: 'HlsParserNamespace',
  input: './src/index.ts',
};

export default [
  // or new Configuration(deps, { includeDiagnostics: true }).rawRollupConfig
  new Configuration(deps).rawRollupConfig,
  new DtsConfiguration(deps).rawRollupConfig,
];
