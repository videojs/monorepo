import type {
  NetworkConfiguration,
  NetworkConfigurationChunk,
  PlayerConfiguration,
  PlayerConfigurationChunk,
} from '../types/configuration';

abstract class Configuration<T> {
  public abstract update(chunk: Partial<T>): void;
  public abstract deepCopy(): T;
}

class NetworkConfigurationImpl extends Configuration<NetworkConfiguration> {
  public static readonly defaultMaxAttempts = 3;
  public static readonly defaultDelay = 2_000;
  public static readonly defaultDelayFactor = 0.2;
  public static readonly defaultFuzzFactor = 0.2;
  public static readonly defaultTimeout = 20_000;

  public static default(): NetworkConfigurationImpl {
    return new NetworkConfigurationImpl({
      maxAttempts: NetworkConfigurationImpl.defaultMaxAttempts,
      delay: NetworkConfigurationImpl.defaultDelay,
      delayFactor: NetworkConfigurationImpl.defaultDelayFactor,
      fuzzFactor: NetworkConfigurationImpl.defaultFuzzFactor,
      timeout: NetworkConfigurationImpl.defaultTimeout,
    });
  }

  private readonly configuration_: NetworkConfiguration;

  protected constructor(configuration: NetworkConfiguration) {
    super();
    this.configuration_ = configuration;
  }

  public update(chunk: NetworkConfigurationChunk): void {
    if (chunk.maxAttempts !== undefined) {
      this.configuration_.maxAttempts = chunk.maxAttempts;
    }

    if (chunk.delay !== undefined) {
      this.configuration_.delay = chunk.delay;
    }

    if (chunk.delayFactor !== undefined) {
      this.configuration_.delayFactor = chunk.delayFactor;
    }

    if (chunk.fuzzFactor !== undefined) {
      this.configuration_.fuzzFactor = chunk.fuzzFactor;
    }

    if (chunk.timeout !== undefined) {
      this.configuration_.timeout = chunk.timeout;
    }
  }

  public deepCopy(): NetworkConfiguration {
    return { ...this.configuration_ };
  }
}

class PlayerConfigurationImpl extends Configuration<PlayerConfiguration> {
  public static default(): PlayerConfigurationImpl {
    return new PlayerConfigurationImpl({
      network: {
        manifest: NetworkConfigurationImpl.default(),
        segment: NetworkConfigurationImpl.default(),
        license: NetworkConfigurationImpl.default(),
      },
    });
  }

  private readonly network_: {
    manifest: NetworkConfigurationImpl;
    license: NetworkConfigurationImpl;
    segment: NetworkConfigurationImpl;
  };

  protected constructor(configuration: {
    network: {
      manifest: NetworkConfigurationImpl;
      license: NetworkConfigurationImpl;
      segment: NetworkConfigurationImpl;
    };
  }) {
    super();
    this.network_ = configuration.network;
  }

  public update(chunk: PlayerConfigurationChunk): void {
    if (chunk.network?.manifest) {
      this.network_.manifest.update(chunk.network.manifest);
    }

    if (chunk.network?.segment) {
      this.network_.segment.update(chunk.network.segment);
    }

    if (chunk.network?.license) {
      this.network_.license.update(chunk.network.license);
    }
  }
  public deepCopy(): PlayerConfiguration {
    return {
      network: {
        manifest: this.network_.manifest.deepCopy(),
        segment: this.network_.segment.deepCopy(),
        license: this.network_.license.deepCopy(),
      },
    };
  }
}

export default class ConfigurationManager {
  private currentConfiguration_ = PlayerConfigurationImpl.default();

  public getConfiguration(): PlayerConfiguration {
    return this.currentConfiguration_.deepCopy();
  }

  public updateConfiguration(chunk: PlayerConfigurationChunk): void {
    this.currentConfiguration_.update(chunk);
  }

  public reset(): void {
    this.currentConfiguration_ = PlayerConfigurationImpl.default();
  }
}
