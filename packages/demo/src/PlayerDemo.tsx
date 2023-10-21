import React, { useRef, useEffect, useState } from 'react';
import { Player } from 'web-media-box/player';
import playIcon from './play.svg';
import pauseIcon from './pause.svg';

interface PlayerDemoProps {
  player: Player;
}

const PlayerDemo: React.FC<PlayerDemoProps> = ({ player }) => {
  const videoElementRef = useRef<HTMLVideoElement>(null);
  const [manifestUrl, setManifestUrl] = useState<string>('');

  useEffect(() => {
    if (!videoElementRef.current) return;

    player.attach(videoElementRef.current);

    player.on(Player.Events.Error, (errorEvent) => {
      // eslint-disable-next-line no-console
      console.error('Player error:', errorEvent);
    });

    return () => {
      player.detach();
    };
  }, [player]);

  const handleLoadClick = (): void => {
    const mimeType = manifestUrl.endsWith('.mpd') ? 'application/dash+xml' : 'application/x-mpegURL'; // assuming only DASH and HLS for simplicity
    player.loadRemoteAsset(manifestUrl, mimeType);
  };

  return (
    <div className="videoContainer">
      <video ref={videoElementRef}></video>
      <div className="controls">
        <button onClick={(): void | Promise<void> => videoElementRef.current?.play()}>
          <img src={playIcon} alt="Play" />
        </button>
        <button onClick={(): void => videoElementRef.current?.pause()}>
          <img src={pauseIcon} alt="Pause" />
        </button>
      </div>
      <div className="manifestLoader">
        <input
          type="text"
          value={manifestUrl}
          onChange={(e): void => setManifestUrl(e.target.value)}
          placeholder="Enter DASH/HLS manifest URL"
        />
        <button onClick={handleLoadClick}>Load</button>
      </div>
    </div>
  );
};

export default PlayerDemo;
