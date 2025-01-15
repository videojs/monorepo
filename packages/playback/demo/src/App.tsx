import type { JSX } from 'react';
import { useEffect } from 'react';
import reactLogo from './assets/react.svg';
import viteLogo from '/vite.svg';
import './App.css';

import { Player } from '../../src/entry-points/player';
import { Player as PlayerWithWorker } from '../../src/entry-points/player-with-worker';

const player = Player.create();
const playerWithWorker = PlayerWithWorker.create();

const PLAYER_ID = 'player';
const PLAYER_WITH_WORKER_ID = 'player-with-worker';

/**
 *
 */
function App(): JSX.Element {
  useEffect(() => {
    const playerElem = document.getElementById(PLAYER_ID) as HTMLVideoElement;
    const playerWithWorkerElem = document.getElementById(PLAYER_WITH_WORKER_ID) as HTMLVideoElement;

    player.updateConfiguration({ mse: { requiredBufferDuration: 15 } });
    playerWithWorker.updateConfiguration({ mse: { requiredBufferDuration: 15 } });

    player.attach(playerElem);
    playerWithWorker.attach(playerWithWorkerElem);

    return (): void => {
      player.detach();
      playerWithWorker.detach();
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
        <h1>Player</h1>
        <video id="player"></video>
      </div>
      <div className="player-container">
        <h1>Player with worker</h1>
        <video id="player-with-worker"></video>
      </div>
    </>
  );
}

export default App;
