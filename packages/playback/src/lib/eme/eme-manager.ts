import type {
  IEmeManager,
  IEmeManagerDependencies,
  IKeySystemConfiguration
} from '../types/eme-manager.declarations';
import type { INetworkManager } from '../types/network.declarations';
import type { ILogger } from '../types/logger.declarations';
import type { IPlayerSource } from '../types/source.declarations';
import { IEventEmitter } from '../types/event-emitter.declarations';
import { PrivateEventTypeToEventMap } from '../types/mappers/event-type-to-event-map.declarations';
import { PlayerEventType } from '../consts/events';
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
  protected initDataType_: string | null = null;
  protected initData_: ArrayBuffer | null = null;
  protected activeMediaKeys_: MediaKeys | null = null;
  protected activeKeySystem_: string | null = null;
  protected activeKeySystemConfig_: IKeySystemConfiguration | null = null;

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

        // Create a session and init a request
        this.createKeySession_(this.activeKeySystemConfig_).then(() => {
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

    // TODO: setCertificate logic

    if (this.initDataType_ !== null && this.initData_ !== null) {
      if (this.initDataType_ === type && EmeManager.areInitDataEqual_(this.initData_, data)) {
        // received duplicate
        return;
      }

      // received new init data/type
      this.logger_.debug(
        `updating init data: previous(${this.initDataType_}, length: ${this.initData_.byteLength}) --> new(${type}, length: ${data.byteLength})`
      );

      // TODO: implement update
    }

    this.initDataType_ = type;
    this.initData_ = data;

    // TODO: implement handling of initData
  }

  public handleWaitingForKey(): void {
    // TODO: check if we have pending request or init one if we have init data
  }

  public stop(): void {
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

  private getKeySystemConfig_(): Record<string, IKeySystemConfiguration> {
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
      // const keySystemConfig = this.getKeySystemConfig_(keySystem);

      try {
        // TODO: Create an event for request media key system
        this.logger_.debug();

        const mediaKeySystemAccess = await navigator.requestMediaKeySystemAccess(keySystem, [keySystemConfig]);
        return mediaKeySystemAccess;
      } catch (error) {
        // Warn about a failed request, but loop should continue.
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
   * Creates a key session.
   * 
   * @param keySystemConfig 
   * @returns an empty promise
   */
  private async createKeySession_(keySystemConfig: IKeySystemConfiguration): Promise<void> {
    if (!this.activeKeySystem_ || !this.activeMediaKeys_){
      // error
      return;
    }

    if (!this.activeMediaKeys_?.createSession) {
      // issue with createSession, error
      return;
    }

    // TODO: We may want to pass in sessionType from the list of sessionTypes from the config.
    const mediaKeySession = this.activeMediaKeys_.createSession();
    
    // TODO: create a session token to handle key status changes and other stuff
    // TODO: generateRequest with keySystemConfig to initialize a request.
  }
}
