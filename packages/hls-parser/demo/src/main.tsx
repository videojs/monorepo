/* eslint-disable no-console */
import { FullPlaylistParser, ChunkPlaylistParser } from '../../src';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

console.dir(FullPlaylistParser);
console.dir(ChunkPlaylistParser);

const root = document.getElementById('root')!;

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>
);
