import { StoreNode } from '../../utils/store';
import type { NetworkConfiguration, PlayerNetworkConfiguration } from '../../types/configuration.declarations';
import { RequestType } from '../../consts/requestType';

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
      [RequestType.DashManifest]: NetworkConfigurationImpl.default(),
      [RequestType.HlsPlaylist]: NetworkConfigurationImpl.default(),
      [RequestType.License]: NetworkConfigurationImpl.default(),
      [RequestType.Key]: NetworkConfigurationImpl.default(),
      [RequestType.InitSegment]: NetworkConfigurationImpl.default(),
      [RequestType.MediaSegment]: NetworkConfigurationImpl.default(),
    });
  }
}
