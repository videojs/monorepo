import PlayerError from './basePlayerError';
import { ErrorCategory, NetworkErrorCodes } from '../consts/errors';

abstract class NetworkError extends PlayerError {
  public readonly category = ErrorCategory.Network;
}

export class NoNetworkManagerRegisteredForProtocolError extends NetworkError {
  public readonly code = NetworkErrorCodes.NoNetworkManagerRegisteredForProtocol;
  public readonly critical = true;
  public readonly protocol: string;

  public constructor(protocol: string) {
    super();
    this.protocol = protocol;
  }
}
