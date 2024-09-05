export type DeepPartial<T> = T extends object
  ? {
      [P in keyof T]?: DeepPartial<T[P]>;
    }
  : T;

export interface NetworkConfiguration {
  maxAttempts: number;
  delay: number;
  delayFactor: number;
  fuzzFactor: number;
  timeout: number;
}

export type NetworkConfigurationChunk = DeepPartial<NetworkConfiguration>;

export interface PlayerConfiguration {
  network: {
    manifest: NetworkConfiguration;
    segment: NetworkConfiguration;
    license: NetworkConfiguration;
  };
}

export type PlayerConfigurationChunk = DeepPartial<PlayerConfiguration>;
