import { PlayerError } from './base-player-errors';
import { ErrorCategory, ErrorCode } from '../consts/errors';

abstract class EmeError extends PlayerError {
  public readonly category = ErrorCategory.Eme;
}

export class SourceNotSetError extends EmeError {
  public readonly code = ErrorCode.SourceNotSet;
  public readonly isFatal: boolean;

  public constructor(isFatal: boolean) {
    super();
    this.isFatal = isFatal;
  }
}

export class SourceMissingKeySystemsError extends EmeError {
  public readonly code = ErrorCode.SourceMissingKeySystems;
  public readonly isFatal: boolean;

  public constructor(isFatal: boolean) {
    super();
    this.isFatal = isFatal;
  }
}

export class KeySessionClosedError extends EmeError {
  public readonly code = ErrorCode.KeySessionClosed;
  public readonly isFatal: boolean;
  public readonly sessionId: string;
  public readonly reason: Error;

  public constructor(isFatal: boolean, sessionId: string, reason: Error) {
    super();
    this.isFatal = isFatal;
    this.sessionId = sessionId;
    this.reason = reason;
  }
}

export class KeySessionCreateError extends EmeError {
  public readonly code = ErrorCode.KeySessionCreateFailed;
  public readonly isFatal: boolean;
  public readonly reason: Error;

  public constructor(isFatal: boolean, reason: Error) {
    super();
    this.isFatal = isFatal;
    this.reason = reason;
  }
}

export class InvalidServerCertificateError extends EmeError {
  public readonly code = ErrorCode.InvalidServerCertificate;
  public readonly isFatal: boolean;
  public readonly reason: Error;

  public constructor(isFatal: boolean, reason: Error) {
    super();
    this.isFatal = isFatal;
    this.reason = reason;
  }
}

export class LicenseResponseRejectedError extends EmeError {
  public readonly code = ErrorCode.LicenseResponseRejected;
  public readonly isFatal: boolean;
  public readonly reason: Error;

  public constructor(isFatal: boolean, reason: Error) {
    super();
    this.isFatal = isFatal;
    this.reason = reason;
  }
}

export class LicenseRequestError extends EmeError {
  public readonly code = ErrorCode.LicenseRequestFailed;
  public readonly isFatal: boolean;
  public readonly reason: Error;

  public constructor(isFatal: boolean, reason: Error) {
    super();
    this.isFatal = isFatal;
    this.reason = reason;
  }
}

export class MediaKeyCreateError extends EmeError {
  public readonly code = ErrorCode.MediaKeyCreateFailed;
  public readonly isFatal: boolean;
  public readonly reason: Error;

  public constructor(isFatal: boolean, reason: Error) {
    super();
    this.isFatal = isFatal;
    this.reason = reason;
  }
}

export class EmeManagerMissingError extends EmeError {
  public readonly code = ErrorCode.EmeManagerMissing;
  public readonly isFatal: boolean;

  public constructor(isFatal: boolean) {
    super();
    this.isFatal = isFatal;
  }
}

export class MissingEmeSupportError extends EmeError {
  public readonly code = ErrorCode.MissingEmeSupport;
  public readonly isFatal: boolean;

  public constructor(isFatal: boolean) {
    super();
    this.isFatal = isFatal;
  }
}
