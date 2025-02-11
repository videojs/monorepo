import type {
  IEmeManager,
  IEmeManagerDependencies,
  IKeySessionMetadata
} from '../types/eme-manager.declarations';
import type { INetworkManager } from '../types/network.declarations';
import type { ILogger } from '../types/logger.declarations';
import type { IPlayerSource } from '../types/source.declarations';
import { IEventEmitter } from '../types/event-emitter.declarations';
import { PrivateEventTypeToEventMap } from '../types/mappers/event-type-to-event-map.declarations';
import { PlayerEventType } from '../consts/events';
import { RequestType } from '../consts/request-type';

const IS_EDGE = navigator.userAgent.indexOf("Edg") > -1

/**
 * Eme Manager should be shipped as a separate bundle and included in the player as opt-in feature
 */

export class EmeManager implements IEmeManager {
  private static areInitDataEqual_(a: ArrayBuffer, b: ArrayBuffer): boolean {
    if (a.byteLength !== b.byteLength) {
      return false;
    }

    const dataA = new Uint8Array(a);
    const dataB = new Uint8Array(b);
    const l = dataA.length;

    for (let i = 0; i < l; i++) {
      if (dataA[i] !== dataB[i]) {
        return false;
      }
    }

    return true;
  }

  protected readonly networkManager_: INetworkManager;
  protected readonly logger_: ILogger;
  protected readonly privateEventEmitter_: IEventEmitter<PrivateEventTypeToEventMap>;

  protected activeVideoElement_: HTMLVideoElement | null = null;
  protected activeSource_: IPlayerSource | null = null;
  protected activeMediaKeys_: MediaKeys | null = null;
  protected activeKeySystem_: string | null = null;
  protected activeKeySystemConfig_: MediaKeySystemConfiguration | null = null;
  protected activeSessions_: Map<string, IKeySessionMetadata> = new Map();
  protected storedSessions_:  Map<string, IKeySessionMetadata> = new Map();
  protected currentKeyStatuses_: Map<string, string> = new Map();

  public constructor(dependencies: IEmeManagerDependencies) {
    this.networkManager_ = dependencies.networkManager;
    this.logger_ = dependencies.logger;
    this.privateEventEmitter_ = dependencies.privateEventEmitter;
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
      // return error that source is not set
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

        if (activeKeySystemCertificate) {
          // TODO: use then()??
          // TODO: handle making a request for the server certificate.
          this.setServerCertificate_(activeKeySystemCertificate);
        }

        // Create a session and init a request
        // This kicks off the whole process of setting event listeners, which
        // is where the bulk of the logic occurs.
        this.createKeySession_(new Uint8Array(data), type, this.activeKeySystemConfig_).then(() => {
          //
        }).catch(() => {
          // error creating key session
        });
      }).catch(() => {
        // error while selecting the key system
      });
    }).catch(() => {
      // error while getting the key system access
    });

    // TODO: implement handling of initData
  }

  public handleWaitingForKey(): void {
    // TODO: check if we have pending request or init one if we have init data
  }

  public stop(): void {
    for (const [id, session] of this.activeSessions_) {
      this.closeKeySession_(id);
    }

    this.activeMediaKeys_= null;
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
    this.privateEventEmitter_.addEventListener(
      PlayerEventType.HlsPlaylistParsed,
      this.handleParsedManifestEvent_
    );
    this.privateEventEmitter_.addEventListener(
      PlayerEventType.DashManifestParsed,
      this.handleParsedManifestEvent_
    )
  }

  private getKeySystemConfig_(): Record<string, MediaKeySystemConfiguration> {
    // TODO: Write logic to get this info from manifests and segment data
    // We will probably need to pass in a list of key systems

    return {
      'com.widevine.alpha': {
        videoCapabilities: [{
          contentType: 'video/webm; codecs="vp9"',
          robustness: 'SW_SECURE_CRYPTO'
        }],
        audioCapabilities: [{
          contentType: 'audio/webm; codecs="vorbis"',
          robustness: 'SW_SECURE_CRYPTO'
        }]
      }
    };

  }

  private handleParsedManifestEvent_(): void {
    let mediaKeySystemAccess = {} as MediaKeySystemAccess;

    // TODO: update this function to take in parsed data and turn it into keySystemConfig values
    // We may need diffrent functions for DASH and HLS
    // We may want to call `setInitData` in here
  }

  /**
   * First, this function creates keySystemConfigurations for each key system
   * the source allows. Once those are created, we request a MediaKeySystemAccess
   * using the aforementioned config. This method returns a promise containing
   * a MediaKeySystemAccess instance.
   * 
   * @returns A promise containing the MediaKeySystemAccess
   */
  private async getKeySystemAccess_(): Promise<MediaKeySystemAccess> {
    let mediaKeySystemAccess = {} as MediaKeySystemAccess;

    const keySystems = this.activeSource_?.keySystems;

    if (!keySystems) {
      // TODO: thow error and ignore EME
      return mediaKeySystemAccess;
    }

    // If `requestMediaKeySystemAccess` report an error
    if (navigator.requestMediaKeySystemAccess === undefined ||
      typeof navigator.requestMediaKeySystemAccess !== 'function') {
      // trigger error 
      return mediaKeySystemAccess;
    }

    // TODO: Sort by priority before this 

    for (const keySystem in keySystems) {
      const keySystemConfig = this.getKeySystemConfig_();

      try {
        // TODO: Create an event for request media key system
        this.logger_.debug();

        const mediaKeySystemAccess = await navigator.requestMediaKeySystemAccess(keySystem, [keySystemConfig]);
        return mediaKeySystemAccess;
      } catch (error) {
        // TODO: Warn about a failed request, but loop should continue.
      }
    }

    return mediaKeySystemAccess;
  }

  /**
   * Creates media keys and adds them to the video element.
   * 
   * @param keySystemAccess
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
      keySystemAccess.createMediaKeys().then((mediaKeys) => {
        this.activeKeySystem_ = keySystemAccess.keySystem;
        this.activeMediaKeys_ = mediaKeys;
        this.activeKeySystemConfig_ = this.activeSource_?.keySystems[this.activeKeySystem_] || null;

        if (this.activeVideoElement_) {
          return this.activeVideoElement_.setMediaKeys(this.activeMediaKeys_);
        } else {
          this.logger_.warn(`WARNING: Attempting to set media keys on an invalid media element.`)
          Promise.resolve();
        }
      }).then(() => {
        this.logger_.debug(`Successfully set media keys in the video element for ${this.activeKeySystem_}.`)
        resolve(this.activeKeySystem_)
      }).catch(function () {
        reject();
         // error could not create media keys
      });
    })
  }

  /**
   * Creates a key session on the active media keys.
   * 
   * @param keySystemConfig 
   * @returns an empty promise
   */
  private async createKeySession_(initData: Uint8Array, initDataType: string, keySystemConfig: MediaKeySystemConfiguration): Promise<void> {
    if (!this.activeKeySystem_ || !this.activeMediaKeys_){
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
    } catch {
      // TODO: ERROR: Failed to create session
      return;
    }

    if (!mediaKeySession) {
      return;
    }

    if (initData !== null && initDataType !== null) {
      const allInitData = this.getAllInitData_();

      allInitData.forEach((data) => {
        if (EmeManager.areInitDataEqual_(initData, data)) {
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

    mediaKeySession.addEventListener('keystatuseschange', (event) => this.onKeyStatusesChange_(event as ExtendableEvent));
    mediaKeySession.addEventListener('message', (event) => this.onSessionMessage_(event));

    // Register callback for session closed Promise
    mediaKeySession.closed.then(() => {
      this.removeSession_(sessionId);
      this.logger_.debug('EME Key Session closed. sessionId: ' + sessionId);
      // TODO: KEY_SESSION_CLOSED event
      // eventBus.trigger(events.KEY_SESSION_CLOSED, { data: token.getSessionId() });
    });

    const metadata = {
      initData,
      initDataType,
      loaded: false,
      type: sessionType,
      session: mediaKeySession
    };

    this.activeSessions_.set(mediaKeySession.sessionId, metadata);

    mediaKeySession.generateRequest(initDataType, initData)
      .then(() => {
        this.logger_.debug('DRM: Session created.  SessionID = ' + sessionId);
        // TODO: KEY SESSION created event
        // eventBus.trigger(events.KEY_SESSION_CREATED, { data: sessionToken });
      })
      .catch((error) => {
        this.removeSession_(sessionId);
        // TODO: ERROR: KEY_SESSION_CREATED_FAILED
        // eventBus.trigger(events.KEY_SESSION_CREATED, {
        //     data: null,
        //     error: new DashJSError(ProtectionErrors.KEY_SESSION_CREATED_ERROR_CODE, ProtectionErrors.KEY_SESSION_CREATED_ERROR_MESSAGE + 'Error generating key request -- ' + error.name)
        // });
      });
  }

  /**
   * Sets the server certificate on the active media keys.
   * 
   * @param certificate
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
    } catch(exception) {
      // TODO: throw error for invalid server certificate
    }
  }

  /**
   * Event to handle key status changes event on session.
   * 
   * @param event 
   * @returns 
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

      // Microsoft's implementation in Edge seems to present key IDs as
      // little-endian UUIDs.
      // https://bit.ly/2thuzXu

      // NOTE: Skip if byteLength != 16.
      // Edge uses single-byte dummy key IDs. Tizen doesn't have this problem.
      // TODO: Do we want to check if it is PS4?
      if (this.activeKeySystem_ && this.isPlayReadyKeySystem_(this.activeKeySystem_) &&
        keyId.byteLength === 16 && IS_EDGE) {
        // Get little-endian values:
        const dataView = this.toDataView_(keyId);
        const le0 = dataView.getUint32(0, true);
        const le1 = dataView.getUint16(4, true);
        const le2 = dataView.getUint16(6, true);
        // Write it back in big-endian
        dataView.setUint32(0, le0, false);
        dataView.setUint16(4, le1, false);
        dataView.setUint16(6, le2, false);
      }

      if (!activeSession) {
        if (status === 'usable') {
          this.logger_.warn(`A usable key was found on a closed session. Session ID: ${session.sessionId} Key ID: ${keyId}`);
        }
        return;
      }

      if (status !== 'status-pending') {
        activeSession.loaded = true;
      }

      if (status === 'expired') {
        hasExpiredKeys = true;
      }

      const keyIdHexString = this.toHex(keyId);

      this.currentKeyStatuses_.set(keyIdHexString, status);

      // TODO: How do we want ot use these stored keys? We probably need to handle the ones with status-pending
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

    // TODO: Resolve all unloaded sessions.
  }

  /**
   * @param {!MediaKeyMessageEvent} event
   * @private
   */
  private async onSessionMessage_(event: MediaKeyMessageEvent): Promise<void> {
    const session = event.target as MediaKeySession;

    if(!session) {
      this.logger_.warn('EME: A message event was received but it did not contain the session.');
      return;
    }

    // All other types will be handled by keystatuseschange
    if (!['license-request', 'license-renewal', 'individualization-request'].includes(event.messageType)) {
      return;
    }

    this.logger_.debug(`Sending license request for session ${session.sessionId} of type ${event.messageType}`);

    let licenseServerUri = this.activeSource_?.keySystems[this.activeKeySystem_ as string].licenseServerUri;
    let individualizationSever = this.activeSource_?.keySystems[this.activeKeySystem_ as string].individualizationServerUri;

    if (event.messageType === 'individualization-request' && individualizationSever) {
      this.logger_.debug(`Using individualization server for license request: ${individualizationSever}`);
      licenseServerUri = individualizationSever;
    }

    // TODO: We may want to add things to the request (sessionId, drmInfo, messageType, etc.)
    let message = ArrayBuffer.isView(event.message) ? event.message.buffer : event.message;

    const payload = {
      url: licenseServerUri as unknown as URL,
      mapper: (body: Uint8Array) => message,
      requestType: RequestType.License
    }

    const licenseRequest = this.networkManager_.post(payload);

    licenseRequest.done.then((response) => {
      try {
        // TODO: Handle this for different DRM scenarios
        // TODO: Do we want to log this response in debug mode?
        session.update(response);
      } catch {
        // TODO: Error that the license response was rejected.
      }
    }).catch(() => {
      // TODO: Error that license request failed
    });

    // TODO: INTERNAL_KEY_MESSAGE Internal event that says we updated the session with the new license?
    // { data: new KeyMessage(this, message, undefined, event.messageType) });
  }

  /**
   * Removes the selected session from the list of active sessions.
   * 
   * @param sessionId 
   */
  private removeSession_(sessionId: string): void {
    this.activeSessions_.delete(sessionId);
  }

  /**
   * Closes the chosen media key session and removes all listeners.
   * 
   * @param sessionId 
   */
  private async closeKeySession_(sessionId: string): Promise<void> {
    if (!sessionId) {
      return Promise.resolve();
    }

    // Send our request to the key session
    const activeSession = this.activeSessions_.get(sessionId)?.session;

    if(!activeSession) {
      return Promise.resolve();
    }

    // Remove event listeners
    activeSession.removeEventListener('keystatuseschange', (event) => this.onKeyStatusesChange_(event as ExtendableEvent));
    activeSession.removeEventListener('message', (event) => this.onSessionMessage_(event));

    // Send our request to the key session
    return activeSession.close().then(() => {
      this.logger_.debug(`Key session sucessfully closed. Session ID: ${sessionId}`)
    }).catch(() => {
      this.removeSession_(sessionId);
      // TODO: KEYSESSIONCLOSED error
      // error: 'Error closing session (' + sessionToken.getSessionId() + ') ' + error.name
    });
  }

  /**
   * A helper function that returns a list of all init data currently active.
   * 
   * @returns A list of init data for all active sessions.
   */
  private getAllInitData_(): Array<Uint8Array> {
    const initDataArray: Array<Uint8Array> = [];
    for (const [id, session] of this.activeSessions_) {
        if (session.initData) {
          initDataArray.push(session.initData);
        }
    }
    return initDataArray;
  }

  /**
   * A helper method to determine if the keySystem is PlayReady 
   *
   * @param {string} keySystem
   * @return {boolean}
   */
  private isPlayReadyKeySystem_(keySystem: string) {
    if (keySystem) {
      return !!keySystem.match(/^com\.(microsoft|chromecast)\.playready/);
    }

    return false;
  }

  /**
   * A helper method to determine if the keySystem is ClearKey 
   *
   * @param {string} keySystem
   * @return {boolean}
   */
  private isClearKeySystem_(keySystem: string): boolean {
    return keySystem === 'org.w3.clearkey';
  }

  /**
   * Convert a buffer to a DataView type for additional utilities to deal with
   * different different array types.
   *
   * @param bufferSource 
   * @returns 
   */
  private toDataView_(bufferSource: BufferSource): DataView {
    const buffer = this.getArrayBuffer_(bufferSource);
    let bytesPerElement = 1;

    // TODO: Can this case ever happen??
    // if ('BYTES_PER_ELEMENT' in DataView) {
    //     bytesPerElement = DataView.BYTES_PER_ELEMENT;
    // }

    // Note: It can be implied that the byteOffset for an arrayBuffer is 0.
    const dataEnd = bufferSource.byteLength / bytesPerElement;
    const sourceStart = 0;
    const start = Math.floor(Math.max(0, Math.min(sourceStart, dataEnd)));
    const end = Math.floor(Math.min(start + Math.max(Infinity, 0), dataEnd));
    return new DataView(buffer, start, end - start);
  }

  /**
   * @param data 
   * @returns A hex string key ID
   */
  private toHex(data: BufferSource): string {
    const arrayBuffer = this.getArrayBuffer_(data);
    const arr = new Uint8Array(arrayBuffer);
    let hex = '';
    let stringValue;
    for (let value of arr) {
      stringValue = value.toString(16);
      if (stringValue.length === 1) {
        stringValue = '0' + stringValue;
      }
      hex += stringValue;
    }
    return hex;
  }

  /**
   * Get the array buffer even if it is inside the BufferSource.
   * 
   * @param source 
   * @returns The array buffer
   */
  private getArrayBuffer_(source: BufferSource): ArrayBuffer {
    if (source instanceof ArrayBuffer) {
        return source;
    } else {
        return source.buffer;
    }
  }

  /**
   * @returns Whether or not all key sessions are loaded.
   */
  private areAllSessionsLoaded_(): boolean {
    this.activeSessions_.forEach((sessionMetadata) => {
      if (!sessionMetadata.loaded) {
        return false;
      }
    })

    return true;
  }
}
