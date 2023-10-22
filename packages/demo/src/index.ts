/* eslint-disable no-console */
import Hls from 'web-media-box/hls-parser';
import Dash from 'web-media-box/dash-parser';
import { Player } from 'web-media-box/player';
import { HlsPipeline } from 'web-media-box/pipelines/mse/hls';
import { DashPipeline } from 'web-media-box/pipelines/mse/dash';

// import * as ReactDOM from 'react-dom/client';
// import App from './App';

console.log('hls-parser: ', Hls);
console.log('dash-parser: ', Dash);
console.log('player: ', Player);
console.log('Hls-pipeline: ', HlsPipeline);
console.log('Dash-pipeline: ', DashPipeline);

// const player = new Player();
// const networkManager = player.getN

// const root = ReactDOM.createRoot(document.getElementById('root')!);
// root.render(<App />);
