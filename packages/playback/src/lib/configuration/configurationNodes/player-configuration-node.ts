import PlayerNetworkConfigurationImpl from './player-network-configuration-node';
import { StoreNode } from '../../utils/store';
import type { PlayerConfiguration } from '../../types/configuration.declarations';
import PlayerMseConfigurationImpl from './player-mse-configuration-node';
import PlayerHlsConfigurationImpl from './player-hls-configuration-node';

export default class PlayerConfigurationImpl extends StoreNode<PlayerConfiguration> {
  public static default(): PlayerConfigurationImpl {
    return new PlayerConfigurationImpl({
      network: PlayerNetworkConfigurationImpl.default(),
      mse: PlayerMseConfigurationImpl.default(),
      hls: PlayerHlsConfigurationImpl.default(),
    });
  }
}
