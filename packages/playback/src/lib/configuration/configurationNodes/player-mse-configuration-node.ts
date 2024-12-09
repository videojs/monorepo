import { StoreNode } from '../../utils/store';
import type { PlayerMseConfiguration } from '../../types/configuration.declarations';
import { getPlayerMseConfigurationDefaults } from '../configuration-defaults';

export default class PlayerMseConfigurationImpl extends StoreNode<PlayerMseConfiguration> {
  public static default(): PlayerMseConfigurationImpl {
    return new PlayerMseConfigurationImpl(getPlayerMseConfigurationDefaults());
  }
}
