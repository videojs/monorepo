import React, { useRef, useEffect } from 'react';
import { Box } from '@mui/material';

interface VideoPlayerProps {
  url: string; // URL of the video source
  onError?: (error: string) => void; // Optional error handler
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({ url, onError }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const videoElement = videoRef.current;

    if (!videoElement) return;

    videoElement.load();

    const handlePlaybackError = () => {
      const errorMessage =
        videoElement.error?.message || 'An unknown error occurred during playback.';

      if (onError) onError(errorMessage);
    };

    // Attach error event listener
    videoElement.addEventListener('error', handlePlaybackError);

    // Cleanup event listener
    return () => {
      videoElement.removeEventListener('error', handlePlaybackError);
    };
  }, [url, onError]);

  return (
    <Box
      sx={{
        width: '100%',
        maxWidth: 900,
        padding: 5,
      }}
    >
      <video
        ref={videoRef}
        controls
        autoPlay={false}
        preload="auto"
        style={{
          width: '100%',
          height: '100%',
        }}
      >
        <source src={url} />
        Your browser does not support the video tag.
      </video>
    </Box>
  );
};

export default VideoPlayer;
