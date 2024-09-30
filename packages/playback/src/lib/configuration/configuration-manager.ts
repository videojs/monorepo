import type { PlayerConfiguration } from '../types/configuration.declarations';
import PlayerConfigurationImpl from './configurationNodes/player-configuration-node';
import { Store } from '../utils/store';

export class ConfigurationManager extends Store<PlayerConfiguration> {
  public constructor() {
    super(() => PlayerConfigurationImpl.default());
  }
}
