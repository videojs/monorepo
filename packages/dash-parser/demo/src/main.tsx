/* eslint-disable no-console */
import { FullManifestParser, ProgressiveParser } from '../../src';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

console.dir(FullManifestParser);
console.dir(ProgressiveParser);

const root = document.getElementById('root')!;

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>
);
