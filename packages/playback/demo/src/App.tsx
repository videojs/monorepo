import type { JSX } from 'react';
import { useEffect } from 'react';
import reactLogo from './assets/react.svg';
import viteLogo from '/vite.svg';
import './App.css';

import { Player as MainThreadOnlyPlayer } from '../../src/entry-points/main-only-core';
import { Player as MainThreadWithWorkerPlayer } from '../../src/entry-points/main-with-worker-core';

const mainThreadOnlyPlayer = MainThreadOnlyPlayer.create();
const mainThreadWithWorkerPlayer = MainThreadWithWorkerPlayer.create();

const MAIN_THREAD_ONLY_VIDEO_ID = 'main-thread-only-player';
const MAIN_THREAD_WITH_WORKER_VIDEO_ID = 'main-thread-with-worker-player';

/**
 *
 */
function App(): JSX.Element {
  useEffect(() => {
    const mainThreadOnlyPlayerElem = document.getElementById(MAIN_THREAD_ONLY_VIDEO_ID) as HTMLVideoElement;
    const mainThreadWithWorkerPlayerElem = document.getElementById(
      MAIN_THREAD_WITH_WORKER_VIDEO_ID
    ) as HTMLVideoElement;

    mainThreadOnlyPlayer.updateConfiguration({ mse: { requiredBufferDuration: 15 } });
    mainThreadWithWorkerPlayer.updateConfiguration({ mse: { requiredBufferDuration: 15 } });

    mainThreadOnlyPlayer.attach(mainThreadOnlyPlayerElem);
    mainThreadWithWorkerPlayer.attach(mainThreadWithWorkerPlayerElem);

    return (): void => {
      mainThreadOnlyPlayer.detach();
      mainThreadWithWorkerPlayer.detach();
    };
  }, []);

  return (
    <>
      <div>
        <a href="https://vitejs.dev" target="_blank">
          <img src={viteLogo} className="logo" alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <h1>@videojs/playback Demo</h1>
      <div className="card">
        <p>Open the console to see Player's Factory</p>
      </div>

      <div className="player-container">
        <h1>Main Thread Only Player</h1>
        <video id="main-thread-only-player"></video>
      </div>
      <div className="player-container">
        <h1>Main Thread With Worker Player</h1>
        <video id="main-thread-with-worker-player"></video>
      </div>
    </>
  );
}

export default App;
