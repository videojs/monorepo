import React, { useState, useEffect } from 'react';
import { Player } from 'web-media-box/player';
import PlayerDemo from './PlayerDemo';

function App(): JSX.Element {
  const [playerInstance, setPlayerInstance] = useState<Player | null>(null);

  useEffect(() => {
    const player = new Player();
    setPlayerInstance(player);

    return () => {
      player.dispose();
    };
  }, []);

  return (
    <div className="App">
      <header className="App-header">
        <h1>Player Demo</h1>
      </header>
      <main>{playerInstance && <PlayerDemo player={playerInstance} />}</main>
    </div>
  );
}

export default App;
