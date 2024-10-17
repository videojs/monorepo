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
<!-- TOC -->

## Trade-offs

- DX
  - Runtime customizations
- Bundle sizes
- Client's code main thread
  - Interceptors


## API overview

### Version API

```ts
interface Player {
  //...
  getVersionInfo(): VersionInfo;
  //...
}

interface VersionInfo {
  version: string;
  hash: string;
  isExperimental: boolean;
}
```

#### Notes
> `Version API` should operate on **the main thread only** and does not require communications with the worker thread.
>
> This API simpy returns data that is injected during bundling.
>
> Should be static.


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
> This introduces a `bundle-size trade-off` where we duplicate logger class and include it in both (main and worker) bundles.
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


### EnvCapabilities API

```ts
interface Player {
  //...
  probeEnvCapabilities(): Promise<ICapabilitiesProbeResult>;
  //...
}
```

#### Notes
> `EnvCapabilities API` should operate on **the main thread only** and does not require communication with the worker thread.
>
> This api is optional/complimentary for the player and probably should be moved to a separate bundle or even a separate package.
>
> Add support for SDR/HDR detection, use navigator.mediaCapabilities.decodingInfo instead of mse support. add HDCP support. add robustness level for DRM detection.


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
