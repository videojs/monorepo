/* eslint-disable no-console */
import { EnvCapabilitiesProvider } from '../../src';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

console.dir(EnvCapabilitiesProvider);

const envCapabilitiesProvider = EnvCapabilitiesProvider.create();

envCapabilitiesProvider.probe().then(console.log);

const root = document.getElementById('root')!;

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>
);
