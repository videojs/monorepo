// interface NetworkConfiguration {
//   maxAttempts: number;
//   delay: number;
//   delayFactor: number;
//   fuzzFactor: number;
//   timeout: number;
// }
//
// interface StreamingConfiguration {
//   network: NetworkConfiguration;
// }
//
// interface HlsConfiguration extends StreamingConfiguration {}
//
// interface DashConfiguration extends StreamingConfiguration {}
//
// export interface PlayerConfiguration {
//   hls: HlsConfiguration;
//   dash: DashConfiguration;
// }

interface PlayerConfiguration {}

export const createDefaultConfiguration = (): PlayerConfiguration => ({});
