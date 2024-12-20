# Walkthrough

<!-- TOC -->
* [Walkthrough](#walkthrough)
  * [Folder Structure](#folder-structure)
    * [`src/entry-points`](#srcentry-points)
    * [`src/lib`](#srclib)
  * [Player](#player)
  * [Worker-Main Thread Communication](#worker-main-thread-communication)
      * [Pipelines](#pipelines)
<!-- TOC -->

## Folder Structure

There are 2 main folders in the `playback` package:

### `src/entry-points`

> [!Note]
>
> Do not include implementations in this folder. Only re-export public APIs from `lib` folder.

  - We re-export only public API here
  - We use files from this folder to produce final bundles:
    - Debug: cjs/es/iife
    - Production: cjs/es/iife
    - Types
    - generated API Reference

### `src/lib`
  - We put only implementations files here


## Player

The main entry point is the base `Player` class: `src/lib/player/base/base-player.ts`

There are 2 classes that extend the base `Player` class:


```mermaid
classDiagram
    BasePlayer <|-- MainThreadOnlyPlayer
    BasePlayer <|-- MainThreadWithWorkerPlayer
```

Both subclasses are intended to be used on the main thread.

`MainThreadOnlyPlayer`: `src/lib/player/main-thread-only/main-thread-only-player.ts` does not have web worker and run fully on main thread.

> [!Note]
>
> `MainThreadOnlyPlayer` is a public API and should be re-exported in the `src/entry-points/main-core.ts`.


`MainThreadWithWorkerPlayer`: `src/lib/player/main-thread-with-worker/main-thread-with-worker-player.ts` creates WebWorker and delegates most of the work to the worker thread, except work that is required to be executed on main thread (eg: EME, MSE is not available on worker thread, etc...).

```mermaid
flowchart LR
  MainThreadWithWorkerPlayer -->|creates| WebWorker
```

> [!Note]
>
> `MainThreadWithWorkerPlayer` is a public API and should be re-exported in the `src/entry-points/main-with-worker-core.ts`.
>
> This bundle is also listed as a main entry-point for the package in the `package.json` file.

The WebWorker script is available at `src/lib/player/main-thread-with-worker/worker/worker-script.ts` and this is the main entry point for all worker thread processes.

Worker Script is injected into `MainThreadWithWorkerPlayer` bundle during the build process in the following manner:

```typescript

    // __WORKER_CODE is the content of the worker-script.ts bundle and will be replaced during the build process
    const workerScriptBlob = new Blob([__WORKER_CODE], { type: 'application/javascript' });
    const workerScriptBlobUrl = URL.createObjectURL(workerScriptBlob);
    const worker = new Worker(workerScriptBlobUrl);

```

> [!Note]
>
> By default `worker-script` bundle is injected into the `MainThreadWithWorkerPlayer` bundle. But we still want to expose it as a separate bundle, so we re-export it in the `src/entry-points/worker-script.ts`.

## Worker-Main Thread Communication

There are 2 classes that abstract the communication between the worker and the main thread:

- `MainToWorkerThreadMessageChannel`: `src/lib/player/main-thread-with-worker/messages/main-to-worker-thread-messages.ts`
- `WorkerToMainThreadMessageChannel`: `src/lib/player/main-thread-with-worker/messages/worker-to-main-thread-messages.ts`


#### Pipelines

// TODO: add pipelines section
