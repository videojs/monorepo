import packageJson from './package.json' with { type: 'json' };
import { ConfigurationsBuilder } from '../../rollup.config.base.js';

const builder = new ConfigurationsBuilder({
  version: packageJson.version,
  packageName: packageJson.name,
});

export default [...builder.copy().setName('HlsParserNamespace').setInput('./src/index.ts').build()];
