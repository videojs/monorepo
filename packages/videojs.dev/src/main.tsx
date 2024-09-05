/* eslint-disable no-console */
import { FullPlaylistParser as HlsFullParser, ProgressiveParser as HlsProgressiveParser } from '@videojs/hls-parser';
import { FullManifestParser as DashFullParser, ProgressiveParser as DashProgressiveParser } from '@videojs/dash-parser';
import { Player } from '@videojs/playback';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

console.dir(HlsFullParser);
console.dir(HlsProgressiveParser);
console.dir(DashFullParser);
console.dir(DashProgressiveParser);
console.dir(Player);

const root = document.getElementById('root')!;

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>
);
