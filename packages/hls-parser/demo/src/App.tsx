import type { JSX } from 'react';
import reactLogo from './assets/react.svg';
import viteLogo from '/vite.svg';
import './App.css';

/**
 *
 */
function App(): JSX.Element {
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
      <h1>@videojs/hls-parser Demo</h1>
      <div className="card">
        <p>Open the console to see HLS Parser Factories</p>
      </div>
    </>
  );
}

export default App;
