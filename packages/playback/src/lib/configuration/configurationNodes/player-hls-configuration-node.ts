import { StoreNode } from '../../utils/store';
import type { PlayerHlsConfiguration } from '../../types/configuration.declarations';
import { getPlayerHlsConfigurationDefaults } from '../configuration-defaults';

export default class PlayerHlsConfigurationImpl extends StoreNode<PlayerHlsConfiguration> {
  public static default(): PlayerHlsConfigurationImpl {
    return new PlayerHlsConfigurationImpl(getPlayerHlsConfigurationDefaults());
  }
}
