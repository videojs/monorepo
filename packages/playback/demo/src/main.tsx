/* eslint-disable no-console */
import { Player } from '../../src/entry-points/main-core';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

console.dir(Player);

const root = document.getElementById('root')!;

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>
);
