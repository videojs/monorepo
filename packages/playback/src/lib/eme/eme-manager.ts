import type { IEmeManager, IEmeManagerDependencies, IKeySessionMetadata } from '../types/eme-manager.declarations';
import type { INetworkManager } from '../types/network.declarations';
import type { ILogger } from '../types/logger.declarations';
import type { IKeySystemConfig, IPlayerSource } from '../types/source.declarations';
import type { IEventEmitter } from '../types/event-emitter.declarations';
import type {
  EventTypeToEventMap,
  PrivateEventTypeToEventMap,
} from '../types/mappers/event-type-to-event-map.declarations';
import { PlayerEventType } from '../consts/events';
import { RequestType } from '../consts/request-type';
import {
  InvalidServerCertificateError,
  KeySessionClosedError,
  KeySessionCreateError,
  LicenseRequestError,
  LicenseResponseRejectedError,
  MediaKeyCreateError,
  MissingEmeSupportError,
  MissingServerCertificateError,
  SourceMissingKeySystemsError,
  SourceNotSetError,
} from '../errors/eme-errors';
import { ErrorEvent } from '../events/player-events';
import {
  KeySessionClosedEvent,
  KeySessionCreatedEvent,
  KeySessionUpdatedEvent,
  KeyStatusesUpdatedEvent,
  KeySystemAccessRequestedEvent,
} from '../events/eme-events';
import type { PlayerEmeConfiguration } from '../types/configuration.declarations';
import { bufferToString, toUTF16 } from './string-utils';
import { toHex, areBuffersEqual, toUint8, toDataView } from './buffer-utils';
import { isFairPlayKeySystem, isPlayReadyKeySystem } from './eme-utils';

const IS_EDGE = navigator.userAgent.indexOf('Edg') > -1;

// Minimum HDCP versions will exist in the manifests

/**
 * Eme Manager should be shipped as a separate bundle and included in the player as opt-in feature
 */
export class EmeManager implements IEmeManager {
  protected readonly networkManager_: INetworkManager;
  protected readonly logger_: ILogger;
  protected readonly eventEmitter_: IEventEmitter<EventTypeToEventMap>;
  protected readonly privateEventEmitter_: IEventEmitter<PrivateEventTypeToEventMap>;
  protected readonly configuration_: PlayerEmeConfiguration;

  protected activeVideoElement_: HTMLVideoElement | null = null;
  protected activeSource_: IPlayerSource | null = null;
  protected activeMediaKeys_: MediaKeys | null = null;
  protected activeKeySystem_: string | null = null;
  protected activeKeySystemConfig_: MediaKeySystemConfiguration | null = null;
  protected activeSessions_ = new Map<string, IKeySessionMetadata>();
  protected storedSessions_ = new Map<string, IKeySessionMetadata>();
  protected currentKeyStatuses_ = new Map<string, string>();

  public constructor(dependencies: IEmeManagerDependencies) {
    this.networkManager_ = dependencies.networkManager;
    this.logger_ = dependencies.logger;
    this.eventEmitter_ = dependencies.eventEmitter;
    this.privateEventEmitter_ = dependencies.privateEventEmitter;
    this.configuration_ = dependencies.configuration;
  }

  public setSource(source: IPlayerSource): void {
    this.activeSource_ = source;
  }

  public setInitData(type: string, data: ArrayBuffer): void {
    // As of now, this is only being called on encrypted event
    // We will probably want to call this on parse events as well

    // can receive from both pssh or encrypted event

    // Check if init data is already set!!

    if (!this.activeSource_) {
      this.eventEmitter_.emitEvent(new ErrorEvent(new SourceNotSetError(false)));
      return;
    }

    this.getKeySystemAccess_().then((keySystemAccess) => {
      this.selectKeySystem_(keySystemAccess).then((keySystem) => {
        if (!keySystem || !this.activeKeySystemConfig_) {
          // error, there is no selected key system
          return;
        }

        // Key system was successfully added to the video element

        // Set server certificate if we have it from the source config
        const activeKeySystemConfig = this.activeSource_?.keySystems[this.activeKeySystem_ as string];
        const activeKeySystemCertificate = activeKeySystemConfig?.serverCertificate;

        // TODO: handle all configs in activeKeySystemConfig

        if (activeKeySystemCertificate) {
          // TODO: use then()??
          // TODO: handle making a request for the server certificate.
          this.setServerCertificate_(activeKeySystemCertificate);
        }

        // Create a session and init a request
        // This kicks off the whole process of setting event listeners, which
        // is where the bulk of the logic occurs.
        this.createKeySession_(new Uint8Array(data), type).then(() => {
          // key session was successfully created
        });
      });
    });
  }

  public handleWaitingForKey(): void {
    if (!this.activeVideoElement_) {
      return;
    }

    this.activeSessions_.forEach((sessionMetadata) => {
      if (!sessionMetadata.loaded) {
        // This means `status-pending` was set on any value in sessionMetadata.session.keyStatuses
      }
    });

    // TODO: check if we have pending request or init one if we have init data
  }

  public stop(): void {
    for (const [id] of this.activeSessions_) {
      this.closeKeySession_(id);
    }

    this.activeMediaKeys_ = null;
    this.activeKeySystem_ = null;
    this.activeKeySystemConfig_ = null;
    this.activeSessions_.clear();
    this.storedSessions_.clear();
    this.currentKeyStatuses_.clear();
    this.activeSource_ = null;
  }

  public attach(videoElement: HTMLVideoElement): void {
    if (this.activeVideoElement_ !== null) {
      this.detach();
    }

    this.activeVideoElement_ = videoElement;

    this.initEmeManager_();
  }

  public detach(): void {
    this.activeVideoElement_ = null;
  }

  public dispose(): void {
    this.stop();
    this.detach();
    this.privateEventEmitter_.removeAllEventListeners();
  }

  private initEmeManager_(): void {
    this.privateEventEmitter_.addEventListener(PlayerEventType.HlsPlaylistParsed, this.handleParsedManifestEvent_);
    this.privateEventEmitter_.addEventListener(PlayerEventType.DashManifestParsed, this.handleParsedManifestEvent_);
  }

  private getMediaKeySystemConfig_(): Record<string, MediaKeySystemConfiguration> {
    // TODO: Write logic to get this info from manifests and segment data
    // We will probably need to pass in a list of key systems

    return {
      'com.widevine.alpha': {
        videoCapabilities: [
          {
            contentType: 'video/webm; codecs="vp9"',
            robustness: 'SW_SECURE_CRYPTO',
          },
        ],
        audioCapabilities: [
          {
            contentType: 'audio/webm; codecs="vorbis"',
            robustness: 'SW_SECURE_CRYPTO',
          },
        ],
        sessionTypes: ['persistent-license'],
      },
    };
  }

  /**
   * Converts the parsed manifest data to keySystemConfig values.
   */
  private handleParsedManifestEvent_(): void {
    // let mediaKeySystemAccess = {} as MediaKeySystemAccess;
    // TODO: update this function to take in parsed data and turn it into keySystemConfig values
    // We may need diffrent functions for DASH and HLS
    // We may want to call `setInitData` in here
  }

  /**
   * First, this function creates keySystemConfigurations for each key system
   * the source allows. Once those are created, we request a MediaKeySystemAccess
   * using the aforementioned config. This method returns a promise containing
   * a MediaKeySystemAccess instance.
   * @returns A promise containing the MediaKeySystemAccess
   */
  private async getKeySystemAccess_(): Promise<MediaKeySystemAccess> {
    let mediaKeySystemAccess = {} as MediaKeySystemAccess;

    const keySystems = this.activeSource_?.keySystems;

    if (!keySystems) {
      this.eventEmitter_.emitEvent(new ErrorEvent(new SourceMissingKeySystemsError(false)));
      return mediaKeySystemAccess;
    }

    // If `requestMediaKeySystemAccess` is missing report an error
    if (
      navigator.requestMediaKeySystemAccess === undefined ||
      typeof navigator.requestMediaKeySystemAccess !== 'function'
    ) {
      this.eventEmitter_.emitEvent(new ErrorEvent(new MissingEmeSupportError(false)));
      return mediaKeySystemAccess;
    }

    // Sort key systems by priority
    const keySystemsArray = Object.keys(keySystems).map((key) => [key, keySystems[key]]);

    keySystemsArray.sort((a, b) => {
      const keySystemPriorityA = (a[1] as IKeySystemConfig).priority;
      const keySystemPriorityB = (b[1] as IKeySystemConfig).priority;

      if (!keySystemPriorityA && !keySystemPriorityB) {
        return 0;
      } else if (!keySystemPriorityA) {
        return 1;
      } else if (!keySystemPriorityB) {
        return -1;
      }

      return keySystemPriorityA - keySystemPriorityB;
    });

    keySystemsArray.forEach(async (keySystemArr) => {
      const keySystem = keySystemArr[0] as string;
      // const keySystemConfig = keySystemArr[1] as IKeySystemConfig;
      // TODO: Pass in key system info
      const mediaKeySystemConfig = this.getMediaKeySystemConfig_();

      try {
        this.eventEmitter_.emitEvent(new KeySystemAccessRequestedEvent(keySystem));
        this.logger_.debug('EME: Requesting media key system access.');

        mediaKeySystemAccess = await navigator.requestMediaKeySystemAccess(keySystem, [mediaKeySystemConfig]);

        return mediaKeySystemAccess;
      } catch (error) {
        // Warn about a failed request, but loop should continue.
        this.logger_.warn(
          `EME: Media key system access request failed. Key System: ${keySystem} Error: ${error as Error}`
        );
      }
    });

    return mediaKeySystemAccess;
  }

  /**
   * Creates media keys and adds them to the video element.
   * @param keySystemAccess The media key system access
   * @returns A promise containing the Key System name or null if no key system was valid.
   */
  private async selectKeySystem_(keySystemAccess: MediaKeySystemAccess): Promise<string | null> {
    // Return early if the mediaKeys are already set.
    if (this.activeVideoElement_?.mediaKeys) {
      this.activeMediaKeys_ = this.activeVideoElement_.mediaKeys;
      this.activeKeySystem_ = keySystemAccess.keySystem;
      this.activeKeySystemConfig_ = this.activeSource_?.keySystems[this.activeKeySystem_] || null;
      return this.activeKeySystem_;
    }

    return new Promise((resolve, reject) => {
      keySystemAccess
        .createMediaKeys()
        .then((mediaKeys) => {
          this.activeKeySystem_ = keySystemAccess.keySystem;
          this.activeMediaKeys_ = mediaKeys;
          this.activeKeySystemConfig_ = this.activeSource_?.keySystems[this.activeKeySystem_] || null;

          if (!this.activeVideoElement_) {
            this.logger_.warn(`EME: Attempting to set media keys on an invalid media element.`);
            Promise.resolve();
            return;
          }

          return this.activeVideoElement_.setMediaKeys(this.activeMediaKeys_);
        })
        .then(() => {
          this.logger_.debug(`Successfully set media keys in the video element for ${this.activeKeySystem_}.`);
          resolve(this.activeKeySystem_);
        })
        .catch((error) => {
          this.eventEmitter_.emitEvent(new ErrorEvent(new MediaKeyCreateError(false, error)));
          reject();
        });
    });
  }

  /**
   * Creates a key session on the active media keys.
   * @param initData The init data to generate a license request
   * @param initDataType The init data format
   * @returns An empty promise
   */
  private async createKeySession_(initData: Uint8Array, initDataType: string): Promise<void> {
    // TODO: Do we need keySystemConfig in this function?

    if (!this.activeKeySystem_ || !this.activeMediaKeys_) {
      // error
      return;
    }

    if (!this.activeMediaKeys_?.createSession) {
      // issue with createSession, error
      return;
    }

    const sessionType = this.activeSource_?.keySystems[this.activeKeySystem_]?.sessionType;

    let mediaKeySession: MediaKeySession | undefined;

    try {
      // Pass in the session type from the source if it exists.
      mediaKeySession = this.activeMediaKeys_.createSession(sessionType || undefined);
    } catch (error) {
      this.eventEmitter_.emitEvent(new ErrorEvent(new KeySessionCreateError(false, error as Error)));
      return;
    }

    if (!mediaKeySession) {
      return;
    }

    if (initData !== null && initDataType !== null) {
      const allInitData = this.getAllInitData_();

      allInitData.forEach((data) => {
        if (areBuffersEqual(initData, data)) {
          this.logger_.debug('Received duplicate initData. The key session will not be created.');
          return;
        }
      });

      // Received new init data/type

      // Do we need this?? Can we just store the initData in the array of activeSessions?
      // this.logger_.debug(
      //   `Updating init data: previous(${type}, length: ${data.byteLength}) --> new(${type}, length: ${data.byteLength})`
      // );
    }

    const sessionId = mediaKeySession.sessionId;

    mediaKeySession.addEventListener('keystatuseschange', (event) =>
      this.onKeyStatusesChange_(event as ExtendableEvent)
    );
    mediaKeySession.addEventListener('message', (event) => this.onSessionMessage_(event));

    // Register callback for session closed Promise
    mediaKeySession.closed.then(() => {
      this.removeSession_(sessionId);
      this.logger_.debug('EME Key Session closed. sessionId: ' + sessionId);
      this.eventEmitter_.emitEvent(new KeySessionClosedEvent(sessionId));
    });

    const metadata = {
      initData,
      initDataType,
      loaded: false,
      type: sessionType,
      session: mediaKeySession,
    };

    this.activeSessions_.set(mediaKeySession.sessionId, metadata);

    // Transform the initData if FairPlay is being used
    if (isFairPlayKeySystem(this.activeKeySystem_)) {
      const activeKeySystemConfig = this.activeSource_?.keySystems[this.activeKeySystem_ as string];
      const activeKeySystemCertificate = activeKeySystemConfig?.serverCertificate;

      initData = this.initDataTransform_(
        initData,
        initDataType,
        activeKeySystemCertificate as BufferSource
      ) as Uint8Array;
    }

    mediaKeySession
      .generateRequest(initDataType, initData)
      .then(() => {
        this.logger_.debug('EME: Session created.  SessionID: ' + sessionId);
        this.eventEmitter_.emitEvent(new KeySessionCreatedEvent(sessionId));
      })
      .catch((error) => {
        this.removeSession_(sessionId);
        this.eventEmitter_.emitEvent(new ErrorEvent(new KeySessionCreateError(false, error as Error)));
      });
  }

  /**
   * Sets the server certificate on the active media keys.
   * @param certificate The server certificate
   * @returns an empty promise.
   */
  private async setServerCertificate_(certificate: Uint8Array): Promise<void> {
    if (!certificate) {
      this.logger_.warn('EME: There was attempt to set an invalid server certificate on the active media keys.');
      return;
    }

    if (!this.activeMediaKeys_) {
      this.logger_.warn('EME: There was attempt to set a server certificate when the media keys do not exist.');
      return;
    }

    try {
      const isSupported = await this.activeMediaKeys_?.setServerCertificate(certificate);

      if (!isSupported) {
        this.logger_.warn('EME: The key system does not support server certificates. Ignoring this certificate.');
      }

      return;
    } catch (error) {
      this.eventEmitter_.emitEvent(new ErrorEvent(new InvalidServerCertificateError(false, error as Error)));
    }
  }

  /**
   * Event to handle key status changes event on session.
   * @param event The event containing the media key session
   */
  private onKeyStatusesChange_(event: ExtendableEvent): void {
    const session = event.target as MediaKeySession;
    const activeSession = this.activeSessions_.get(session.sessionId);
    const keyStatusMap = session.keyStatuses;

    let hasExpiredKeys = false;

    keyStatusMap.forEach((status, keyId) => {
      // Edge has the order of these values swaped from the spec.
      // We need to account for this
      if (typeof keyId === 'string') {
        const tmp = keyId;
        keyId = status as unknown as BufferSource;
        status = tmp as unknown as MediaKeyStatus;
      }

      // Edge uses little endian for Key IDs IDs
      // https://bit.ly/2thuzXu

      // NOTE: Skip if byteLength != 16.
      // Edge uses single-byte dummy key IDs. Tizen doesn't have this problem.
      if (this.activeKeySystem_ && isPlayReadyKeySystem(this.activeKeySystem_) && keyId.byteLength === 16 && IS_EDGE) {
        // Get little-endian values:
        const dataView = toDataView(keyId) as DataView | null;

        // If KeyID was invalid, ignore the current key and continue
        if (dataView) {
          const le0 = dataView.getUint32(0, true);
          const le1 = dataView.getUint16(4, true);
          const le2 = dataView.getUint16(6, true);
          // Write it back in big-endian
          dataView.setUint32(0, le0, false);
          dataView.setUint16(4, le1, false);
          dataView.setUint16(6, le2, false);
        }
      }

      const keyIdHexString = toHex(keyId);

      if (!activeSession) {
        if (status === 'usable') {
          this.logger_.warn(
            `A usable key was found on a closed session. Session ID: ${session.sessionId} Key ID: ${keyIdHexString}`
          );
        }
        return;
      }

      if (status !== 'status-pending') {
        activeSession.loaded = true;
      }

      if (status === 'expired') {
        hasExpiredKeys = true;
      }

      this.currentKeyStatuses_.set(keyIdHexString, status);

      // TODO: How do we want ot use these stored keys? We probably need to handle the ones with status-pending
      // See shaka onKeyStatus on their player (they use a timer)
    });

    // Close session when it has expired keys.
    const timeUntilExpiration = session.expiration - Date.now();
    if (timeUntilExpiration < 0 || (hasExpiredKeys && timeUntilExpiration < 1000)) {
      // TODO: Do we need to handle a promise on the session like Shaka?
      // if (activeSession && !isSessionActive.updatePromise) {
      this.logger_.debug(`Session has expired. Session ID: ${session.sessionId}`);
      this.activeSessions_.delete(session.sessionId);

      this.closeKeySession_(session.sessionId);
    }

    if (!this.areAllSessionsLoaded_()) {
      return;
    }

    this.privateEventEmitter_.emitEvent(new KeyStatusesUpdatedEvent(this.currentKeyStatuses_));
    // TODO: Resolve all unloaded sessions.
  }

  /**
   * On a message event, we get the key session from the event and update the session
   * with the license that was requested,
   * @param event The media key message event
   * @returns An empty promise
   */
  private async onSessionMessage_(event: MediaKeyMessageEvent): Promise<void> {
    const customLicenseRequest = this.activeSource_?.keySystems[this.activeKeySystem_ as string].getLicense;
    const customContentIdTransform = this.activeSource_?.keySystems[this.activeKeySystem_ as string].getContentId;
    const session = event.target as MediaKeySession;

    if (!session) {
      this.logger_.warn('EME: A message event was received but it did not contain the session.');
      return;
    }

    // All other types will be handled by keystatuseschange
    if (!['license-request', 'license-renewal', 'individualization-request'].includes(event.messageType)) {
      return;
    }

    this.logger_.debug(`Sending license request for session ${session.sessionId} of type ${event.messageType}`);

    if (customLicenseRequest) {
      this.logger_.debug(
        `A custom license request function was configured for KeySystem: ${this.activeKeySystem_} for Session: ${session.sessionId}`
      );

      const initData = this.activeSessions_.get(session.sessionId)?.initData;
      const initDataType = this.activeSessions_.get(session.sessionId)?.initDataType;

      let contentId = '';

      if (customContentIdTransform) {
        contentId = customContentIdTransform(initData as Uint8Array);
      } else {
        // TODO: Is this the correct content id?
        contentId = initDataType || '';
      }

      const licenseResponse = customLicenseRequest(contentId, event);

      try {
        // TODO: Handle this for different DRM scenarios
        session.update(licenseResponse);
        this.privateEventEmitter_.emitEvent(new KeySessionUpdatedEvent(session.sessionId, event.messageType));
      } catch (error) {
        this.eventEmitter_.emitEvent(new ErrorEvent(new LicenseResponseRejectedError(false, error as Error)));
      }

      return;
    }

    let licenseServerUri = this.activeSource_?.keySystems[this.activeKeySystem_ as string].licenseServerUri;
    const individualizationSever =
      this.activeSource_?.keySystems[this.activeKeySystem_ as string].individualizationServerUri;

    if (event.messageType === 'individualization-request' && individualizationSever) {
      this.logger_.debug(`Using individualization server for license request: ${individualizationSever}`);
      licenseServerUri = individualizationSever;
    }

    // TODO: We may want to add things to the request (sessionId, drmInfo, messageType, etc.)
    const message = ArrayBuffer.isView(event.message) ? event.message.buffer : event.message;

    const payload = {
      url: licenseServerUri as unknown as URL,
      mapper: (): ArrayBufferLike => message,
      requestType: RequestType.License,
    };

    const licenseRequest = this.networkManager_.post(payload);

    licenseRequest.done
      .then((response) => {
        try {
          // TODO: Handle this for different DRM scenarios
          session.update(response);
          this.logger_.debug(
            `EME: Key session updated with new license. SessionID: ${session.sessionId} MessageType: ${event.messageType}`
          );
          this.privateEventEmitter_.emitEvent(new KeySessionUpdatedEvent(session.sessionId, event.messageType));
        } catch (error) {
          this.eventEmitter_.emitEvent(new ErrorEvent(new LicenseResponseRejectedError(false, error as Error)));
        }
      })
      .catch((error) => {
        this.eventEmitter_.emitEvent(new ErrorEvent(new LicenseRequestError(false, error)));
      });
  }

  /**
   * Removes the selected session from the list of active sessions.
   * @param sessionId Key session ID
   */
  private removeSession_(sessionId: string): void {
    this.activeSessions_.delete(sessionId);
  }

  /**
   * Closes the chosen media key session and removes all listeners.
   * @param sessionId Key session ID
   */
  private async closeKeySession_(sessionId: string): Promise<void> {
    if (!sessionId) {
      return Promise.resolve();
    }

    // Send our request to the key session
    const activeSession = this.activeSessions_.get(sessionId)?.session;

    if (!activeSession) {
      return Promise.resolve();
    }

    // Remove event listeners
    activeSession.removeEventListener('keystatuseschange', (event) =>
      this.onKeyStatusesChange_(event as ExtendableEvent)
    );
    activeSession.removeEventListener('message', (event) => this.onSessionMessage_(event));

    // Send our request to the key session
    return activeSession
      .close()
      .then(() => {
        this.logger_.debug(`Key session sucessfully closed. Session ID: ${sessionId}`);
      })
      .catch((error) => {
        this.removeSession_(sessionId);
        this.eventEmitter_.emitEvent(new ErrorEvent(new KeySessionClosedError(false, sessionId, error)));
      });
  }

  /**
   * A helper function that returns a list of all init data currently active.
   * @returns A list of init data for all active sessions.
   */
  private getAllInitData_(): Array<Uint8Array> {
    const initDataArray: Array<Uint8Array> = [];
    for (const session of this.activeSessions_.values()) {
      if (session.initData) {
        initDataArray.push(session.initData);
      }
    }
    return initDataArray;
  }

  /**
   * @returns Whether or not all key sessions are loaded.
   */
  private areAllSessionsLoaded_(): boolean {
    this.activeSessions_.forEach((sessionMetadata) => {
      if (!sessionMetadata.loaded) {
        return false;
      }
    });

    return true;
  }

  /**
   * Transforms the init data buffer using the given data. The format is:
   * [4 bytes] initDataSize
   * [initDataSize bytes] initData
   * [4 bytes] contentIdSize
   * [contentIdSize bytes] contentId
   * [4 bytes] certSize
   * [certSize bytes] cert
   * @param initData The initData to transform
   * @param contentId The content ID containing information about the stream
   * @param cert The certificate for the license
   * @returns The transformed init data
   */
  private initDataTransform_(
    initData: BufferSource,
    contentId: BufferSource | string,
    cert: BufferSource
  ): BufferSource {
    if (!cert || !cert.byteLength) {
      this.eventEmitter_.emitEvent(new ErrorEvent(new MissingServerCertificateError(false)));
      return initData;
    }

    let contentIdArray;

    const customContentIdTransform = this.activeSource_?.keySystems[this.activeKeySystem_ as string].getContentId;

    if (customContentIdTransform) {
      contentId = customContentIdTransform(initData as ArrayBuffer);
    }

    if (typeof contentId == 'string') {
      contentIdArray = toUTF16(contentId, true);
    } else {
      contentIdArray = contentId;
    }

    // The init data we get is a UTF-8 string; convert that to a UTF-16 string.
    const skdUri = bufferToString(initData);

    if (!skdUri) {
      // There was a failure getting the SDK URI. Return original init data.
      return initData;
    }

    const utf16 = toUTF16(skdUri, true);

    const newData = new Uint8Array(12 + utf16.byteLength + contentIdArray.byteLength + cert.byteLength);

    let offset = 0;

    // Add to the new data and update the offset considering byte length.
    const addToNewData = (array: BufferSource): void => {
      const view = toDataView(newData);

      if (!view) {
        // error converting newData to DataView
        return;
      }

      const value = array.byteLength;
      (view as DataView).setUint32(offset, value, true);
      offset += 4;

      newData.set(toUint8(array), offset);
      offset += array.byteLength;
    };

    addToNewData(utf16);
    addToNewData(contentIdArray);
    addToNewData(cert);

    if (offset !== newData.length) {
      this.logger_.warn('EME: Transformed init data length does not match the original.');
    }

    return newData;
  }
}
