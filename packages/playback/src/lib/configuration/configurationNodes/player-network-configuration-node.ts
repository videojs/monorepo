import { StoreNode } from '../../utils/store';
import type { NetworkConfiguration, PlayerNetworkConfiguration } from '../../types/configuration.declarations';
import { RequestType } from '../../consts/request-type';
import { getNetworkConfigurationDefaults } from '../configuration-defaults';

class NetworkConfigurationImpl extends StoreNode<NetworkConfiguration> {
  public static default(): NetworkConfigurationImpl {
    return new NetworkConfigurationImpl(getNetworkConfigurationDefaults());
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
