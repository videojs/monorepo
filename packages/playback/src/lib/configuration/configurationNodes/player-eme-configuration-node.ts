import { StoreNode } from '../../utils/store';
import type { PlayerEmeConfiguration } from '../../types/configuration.declarations';
import { getPlayerEmeConfigurationDefaults } from '../configuration-defaults';

export default class PlayerEmeConfigurationImpl extends StoreNode<PlayerEmeConfiguration> {
  public static default(): PlayerEmeConfigurationImpl {
    return new PlayerEmeConfigurationImpl(getPlayerEmeConfigurationDefaults());
  }
}
