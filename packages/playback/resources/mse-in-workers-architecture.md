# MSE in Workers Architecture

<!-- TOC -->
* [MSE in Workers Architecture](#mse-in-workers-architecture)
  * [Trade-offs](#trade-offs)
  * [API overview](#api-overview)
    * [Version API](#version-api)
      * [Notes](#notes)
    * [Debug API](#debug-api)
      * [Notes](#notes-1)
    * [Configuration API](#configuration-api)
      * [Notes](#notes-2)
      * [Events API](#events-api)
      * [Notes](#notes-3)
      * [Interceptors API](#interceptors-api)
      * [Notes](#notes-4)
    * [EnvCapabilities API](#envcapabilities-api)
      * [Notes](#notes-5)
    * [LifeCycle API](#lifecycle-api)
      * [Notes](#notes-6)
      * [Playback API](#playback-api)
      * [Notes](#notes-7)
      * [architecture considerations](#architecture-considerations)
<!-- TOC -->

## Trade-offs

- DX
  - Runtime customizations
- Bundle sizes
- Client's code main thread
  - Interceptors


## API overview

### Debug API

```ts
interface Player {
  //...
  getLoggerLevel(): LoggerLevel;
  setLoggerLevel(level: LoggerLevel): void;
  //...
}

enum LoggerLevel {
  Debug,
  Info,
  Warn,
  Error,
  Off,
}
```

#### Notes
> `Debug API` should operate **both main thread and worker thread** and does require communication with the worker thread.
>
> This introduces a minor (~40lines of code) `bundle-size trade-off` where we duplicate logger class and include it in both (main and worker) bundles.
>
> Additional communication requires during `setLoggerLevel`:
>
> We should update logger level for the main thread logger and send a message to the worker thread logger via `postMessage`.
>
> `getLoggerLevel` should simply return the logger level of the main thread logger:
>
> We expect the worker thread logger to be in sync with the main thread logger.
>
> Worker thread Loggers should have default `Player >` prefix:
>
> So for example if we have HlsLoader class, it's logger should have `Player > HlsLoader` prefix.


### Configuration API

```ts
interface Player {
  //...
  getConfigurationSnapshot(): PlayerConfiguration;
  updateConfiguration(configurationChunk: DeepPartial<PlayerConfiguration>): void;
  resetConfiguration(): void;
  //...
}

interface PlayerConfiguration {
  //...
  network: PlayerNetworkConfiguration;
  //...
}
```

#### Notes
> `Configuration API` should operate on **the main thread only** and does require communication with the worker thread.
>
> Initial configuration should be created in worker thread (minor `bundle-size trade-off`).
>
> `getConfigurationSnapshot` should return a snapshot of the current state of the configuration's manager on the main thread.
>
> `updateConfiguration` should update the configuration's manager on the main thread and send a message via `postMessage` to the worker thread with a copy of the updated configuration (`postMessage` will do deep copy for us).
>
> `resetConfiguration` should reset the configuration's manager on the main thread and send a message via `postMessage` to the worker thread with a copy of the updated(default) configuration (`postMessage` will do deep copy for us).


#### Events API

```ts
interface Player {
  //...
  addEventListener<K extends PlayerEventType>(type: K, listener: EventListener<EventTypeToEventMap[K]>): void;
  once<K extends PlayerEventType>(type: K, listener: EventListener<EventTypeToEventMap[K]>): void;
  removeEventListener<K extends PlayerEventType>(type: K, listener: EventListener<EventTypeToEventMap[K]>): void;
  removeAllEventListenersForType<K extends PlayerEventType>(type: K): void;
  removeAllEventListeners(): void;
  //...
}
```

#### Notes
> `Events API` should operate on **the main thread only** and does require communication with the worker thread.
>
> All listed operations should manage internal EventEmitter on the main thread.
>
> Once the worker thread wants to emit event it should send a message to the main thread via `postMessage({ type: 'EMIT_EVENT', event: eventObject })`
>
> The main thread should listen to `message` event with `data.type === EMIT_EVENT` and trigger internal `eventEmitter.emit(event)`


#### Interceptors API

```ts
interface Player {
  //...
  addInterceptor<K extends InterceptorType>(interceptorType: K, interceptor: InterceptorTypeToInterceptorMap[K]): void;
  removeInterceptor<K extends InterceptorType>(interceptorType: K, interceptor: InterceptorTypeToInterceptorMap[K]): void;
  removeAllInterceptorsForType<K extends InterceptorType>(interceptorType: K): void;
  removeAllInterceptors(): void;
  //...
}
```

#### Notes
> `Interceptors API` should operate on **the main thread only** and does require communication with the worker thread.
>
> All listed operations should manage internal InterceptorStorage on the main thread.
>
> Once the worker thread wants to run interceptors for a specific type it should send a message to the main thread via
>
> `postMessage({ type: 'RUN_INTERCEPTORS', executionId: "unique Id", interceptorType: interceptorType, payload: data })`
>
> AND it should **await** message `{ type: 'INTERCEPTORS_EXECUTED', executionId: "unique Id", payload: data }` with matching `executionId` from the main thread with updated data to proceed with the next step.
>
> Ideally, worker should implement some abstraction like `sendAndAwait<T>`
>
> The main thread should listen to `message` event with `data.type === RUN_INTERCEPTORS` and await internal `interceptorStorage.execute(interceptorType, payload)`
>
> Once client's interceptors executed, the main thread should send a message to the worker thread via `postMessage({ type: 'INTERCEPTORS_EXECUTED', executionId: "unique Id", payload: data })`
>
> This introduces a `performance-trade-off` since **the worker thread has to wait for the client's code to be executed** (which we do not control) from the main thread to execute interceptors and send a message back to the worker thread.
>
> We should emphasize this limitation in the documentation.

### LifeCycle API

```ts
interface Player {
  //...
  // constructor()
  dispose(): void;

  attach(videoElement: HTMLVideoElement): void;
  detach(): void;
  getCurrentVideoElement(): HTMLVideoElement | null;

  load(source: ILoadRemoteSource | ILoadLocalSource): void;
  stop(reason?: string): void;
  getCurrentSource(): IPlayerSource | null;
  //...
}
```

#### Notes
> `LifeCycle API` should operate on **the main thread only** and does require communication with the worker thread.
>
> `attach` should first check existance of the previous video element instance and detach it first. It should store the video element reference and add listeners.
>
> Each listener should notify the worker thread about status change.
>
> For example `timeupdate` event should notify worker thread with an updated current time value.
>
> That way the worker thread should be in sync even though video element is not available directly.
>
> `detach` should call `stop` and remove all listeners and remove video element reference. It should also notify the worker thread, so it can reset everything to the default state.
>
> `getCurrentVideoElement` is just a getter for the main thread to get the current video element reference.
>
> `stop` should send a message to the worker thread to stop the playback and reset everything to the default state.
>
> `dispose` should call `detach` and prepare player to be garbage collected. This means it should destroy worker.
>
> `load` should be go throught 3 ordered steps:
>
> 1) (main thread) it should check client's registered pipeline loaders on the main thread, if we have matching loader - use it.
>
> 2) (worker) it should check worker-supported info (it should be injected during bundling) if we have matching loader - use just send a message to the worker with a load payload.
>
> 3) (main thread) it should fall back to the native pipeline on the main thread
>
> `getCurrentSource` is just a getter for the main thread to get the current source reference. Please Note that getters are not transferable via `postMessage`, so source model should be created on the worker thread.

#### Playback API

```ts
interface Player {
  //...
  play(): void;
  pause(): void;
  seek(seekTarget: number): boolean;
  getCurrentTime(): number;

  getPlaybackRate(): number;
  setPlaybackRate(rate: number): void;

  mute(): void;
  unmute(): void;
  getIsMuted(): boolean;

  getVolumeLevel(): number;
  setVolumeLevel(volumeLevel: number): void;

  getDuration(): number;

  getPlaybackState(): PlaybackState;

  getPlaybackStats(): IPlaybackStats;

  getSeekableRanges(): Array<IPlayerTimeRange>;
  getActiveSeekableRange(): IPlayerTimeRange | null;

  getBufferedRanges(): Array<IPlayerTimeRange>;
  getActiveBufferedRange(): IPlayerTimeRange | null;

  getQualityLevels(): Array<IQualityLevel>;
  getActiveQualityLevel(): IQualityLevel | null;
  selectQualityLevel(id: string): boolean;
  selectAutoQualityLevel(): boolean;

  getAudioTracks(): Array<IPlayerAudioTrack>;
  getActiveAudioTrack(): IPlayerAudioTrack | null;
  selectAudioTrack(id: string): boolean;

  getTextTracks(): Array<IPlayerTextTrack>;
  getActiveTextTrack(): IPlayerTextTrack | null;
  selectTextTrack(id: string): boolean;
  addRemoteTextTrack(remoteTextTrackOptions: RemoteTextTrackOptions): boolean;
  removeRemoteTextTrack(id: string): boolean;

  getMetadataTracks(): Array<IPlayerMetadataTrack>;

  getThumbnailTracks(): Array<IPlayerThumbnailTrack>;
  getActiveThumbnailTrack(): IPlayerThumbnailTrack | null;
  selectThumbnailTrack(id: string): boolean;
  addRemoteThumbnailTrack(options: IRemoteVttThumbnailTrackOptions): boolean;
  removeRemoteThumbnailTrack(id: string): boolean;


  //...
}
```
#### Notes
> `Playback API` should operate on **the main thread only** and does require communication with the worker thread.
>
> Player should have internal state for all getters. The worker thread should notify when some state related info has changed, so player can update its internal counterpart.
>
> Actions like play/pause/mute/select/add/remove/setters should notify the worker thread about the action.


#### architecture considerations

Idea:
Use everything in workers by default and use mse-in-workers by default if available.
If not fallback to mse on the main thread.
Reasoning:
we already use workers for
- Transmuxing ts to mp4,
- Extracting cea608/708,
- Extracting id3 metadata,
- Parsing mp4 boxes
- Aes decryption

So, why not just move to the worker leftover parts (it is not that many):
- Fetching playlist/manifest
- Parsing playlist/manifest
- Fetching segments

Regarding interceptors:
On the main thread we still await customers interceptors
On worker thread we will do the same, so it should not be that different performance wise.

that way we will simplify codebase, since we will have only worker player.
So we can simply provide multiple bundles, or provde CLI to create a custom bundle.

We can of course go ahead and do the following:

create abstract class Player with shared logic
create Main thread Player which will extend Player and implement all main thread logic
create Worker Player which will extend Player and implement all worker thread logic (eg listen to message events and coordinate postMessage)
we should design services that will be re-used on both main and worker thread (eg pipelines, parsers, network manager, etc)
to not expect  that services that are available only on main the (eg: configuration manager, interceptros storage, event emitter etc..) to be injected
We should desing it with generic callbacks or functions, or objects...
example:
so instead of passing interceptorsStorate to the networkManager, we should pass just executeInterceptors function.

I am not sure if we want to provide alternative main-thread only, because it will use only main thread for EVERYTHING.
but probably would be nice to have such alternative to estimate worker performance gain.
and probably main-thread only would have better customizability, since it will be easier to override service during runtime.

every service is a small standalone tool, with a separate entry point, and predictable dependencies (and or static members)

for example:

import { HlsLoader } from '@videojs/playback/hls/loader';
import { HlsVodPipeline } from '@videojs/playback/hls/vod/pipeline';


### Customizations Strategies

#### Default Bundles

##### Use Case

`@videojs/playback` is shipped with default bundles with popular combinations, like
- HLS CMAF + VOD
- HLS CMAF + LIVE
- HLS CMAF + VOD + LIVE
- HLS TS + VOD
- HLS TS + LIVE
- HLS TS + VOD + LIVE
- HLS CMAF + TS + VOD
- HLS CMAF + TS + LIVE
- HLS CMAF + TS + VOD + LIVE
- etc...
This is the easiest and straightforward way for users to start building their app around this lib.
- They simply import the default bundle (NPM usage) or include script (CDN usage).

##### Pros

It is simple and straightforward and does not require any additional setup.

##### Cons

It is not very flexible in terms of feature-set and users may end up using bundle with features they do not need.


#### CLI tool

##### Use Case

`@videojs/playback` includes CLI tool that allows users to create custom bundles with only features they need.

For example there might questions like:
- Select the protocol you want to use:
  - HLS
  - DASH
  - both
- Select the type of content you want to play for HLS:
  - vod
  - live
  - both
- Select the type of content you want to play for DASH:
  - vod
  - live
  - both
- Select segment container format for HLS:
  - TS
  - CMAF
  - both

##### Pros

If users know ahead of time exact requirement for playback engine, they can create custom bundles and use it, which will result in smaller bundle size possible.

##### Cons

if users want to migrate to a new version (patch, minor, major) they will have to re-run the CLI tool to create a new bundle and update their code base.


#### Runtime Customizations

##### Use Case

`@videojs/playback` allows users to customize the playback engine at runtime.

If users don't know ahead of time what type of the content they will play and they don't want to include all possible features in the bundle they can use dynamic imports and include stuff in run-time.

if they use main thread player they can simply import() with es mules for dynamic imports.

if they use worker thread player they can pass IIFE bundle path via player api, player will send post message with the path and the worker will use importScripts() to load it.

Rare case:
Since runtime customizations are in user's control, it allows custom implementations.

For example if users want to use its own HLS Loader implementation (or any other service) they can pass it to the player via player's api.

##### Pros

It is very flexible and allows users to include only features they need at runtime.

##### Cons

Same tradeoff as use dynamic imports or not (eg: critical performance during playback start...)
Since it requires separate bundles, users require to upload this bundles to the user's servers and managing them.

