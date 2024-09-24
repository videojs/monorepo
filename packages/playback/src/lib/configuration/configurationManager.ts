import type { PlayerConfiguration } from '../types/configuration.declarations';
import PlayerConfigurationImpl from './configurationNodes/playerConfigurationNode';
import { Store } from '../utils/store';

export class ConfigurationManager extends Store<PlayerConfiguration> {
  public constructor() {
    super(() => PlayerConfigurationImpl.default());
  }
}
