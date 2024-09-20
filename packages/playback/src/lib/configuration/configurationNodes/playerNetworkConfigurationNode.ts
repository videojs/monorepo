import { StoreNode } from '../../utils/store';
import type { NetworkConfiguration, PlayerNetworkConfiguration } from '../../types/configuration.declarations';

class NetworkConfigurationImpl extends StoreNode<NetworkConfiguration> {
  public static default(): NetworkConfigurationImpl {
    return new NetworkConfigurationImpl({
      maxAttempts: 2,
      initialDelay: 2_000,
      delayFactor: 0.2,
      fuzzFactor: 0.2,
      timeout: 20_000,
    });
  }
}

export default class PlayerNetworkConfigurationImpl extends StoreNode<PlayerNetworkConfiguration> {
  public static default(): PlayerNetworkConfigurationImpl {
    return new PlayerNetworkConfigurationImpl({
      manifest: NetworkConfigurationImpl.default(),
      segment: NetworkConfigurationImpl.default(),
      license: NetworkConfigurationImpl.default(),
    });
  }
}
