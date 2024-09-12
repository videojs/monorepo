import PlayerNetworkConfigurationImpl from './playerNetworkConfigurationNode';
import { StoreNode } from '../../utils/store';
import type { PlayerConfiguration } from '../../types/configuration.declarations';

export default class PlayerConfigurationImpl extends StoreNode<PlayerConfiguration> {
  public static default(): PlayerConfigurationImpl {
    return new PlayerConfigurationImpl({
      network: PlayerNetworkConfigurationImpl.default(),
    });
  }
}
