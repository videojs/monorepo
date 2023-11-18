/* eslint-disable no-console */
import { FullPlaylistParser as HlsFullParser, ProgressiveParser as HlsProgressiveParser } from '@videojs/hls-parser';
import { FullManifestParser as DashFullParser, ProgressiveParser as DashProgressiveParser } from '@videojs/dash-parser';
import { Player } from '@videojs/playback/player';

declare global {
  interface Window {
    Player: new () => Player;
    player: Player;
    hlsFullParser: HlsFullParser;
    hlsProgressiveParser: HlsProgressiveParser;
    dashFullParser: DashFullParser;
    dashProgressiveParser: DashProgressiveParser;
  }
}

const player = new Player();

const hlsFullParser = new HlsFullParser({});
const hlsProgressiveParser = new HlsProgressiveParser({});

const dashFullParser = new DashFullParser({});
const dashProgressiveParser = new DashProgressiveParser({});

window.Player = Player;
window.player = player;
window.hlsFullParser = hlsFullParser;
window.hlsProgressiveParser = hlsProgressiveParser;
window.dashFullParser = dashFullParser;
window.dashProgressiveParser = dashProgressiveParser;

/**
 * Our goal is to create a fully typed/robust/next-gen player
 * During hack week we implemented NetworkManager, Hls-Parser, Dash-Parser
 * NetworkManager:
 * Based on fetch api
 * Supports Request/Response interceptors by RequestType
 * Request Interceptor can modify any information and can be async
 * Supports robust fault tolerance system: Retry mechanism, Backoff mechanism
 * Supports progressive loading
 * HLS-Parser:
 * Based on State Machine (single loop)
 * At this moment supports ~95% of the latest version of the HLS spec
 * Supports progressive parsing (by chunks)
 * Support both buffer and string parsing
 * Fully typed
 * ~17kb size (5.1kb gzipped), we can probably make it even less. m3u8-parser is ~60kb
 * Dash-Parser:
 * Based on State Machine (single loop)
 * At this moment support ~40% of the latest version of the Dash spec
 * Supports progressive parsing (by chunks). There is not open-source player which supports this.
 * Support both buffer and string parsing
 * Fully typed
 * ~10.2kb size (3.7kb gzipped), we can probably make it even less. mpd-parser is ~100kb
 */

/**
 * 0. Player Architecture Demo
 * 0.1 Player Diagram
 * 0.2 Implemented parts from the diagram
 * 0.3 Modularity in-mind diagram (build your own player)
 *
 * 1. NetworkManager Demo
 * 1.1 Async request interceptors and response handlers by request type:
 * 1.2 Progressive loading
 * 1.3 Backoff/Retry
 *
 * 2. HLS-Parser Demo
 * 2.1 State Machine Diagram
 * 2.2 Full Parser
 * 2.3 Progressive Parser
 *
 * 3 Dash-Parser Demo
 * 3.1 State Machine Diagram
 * 3.2 Full Parser
 * 3.3 Progressive Parser
 *
 */

// Copy each snippet, paste into the console in the index.html running on your local server
// uncomment this snippet in the console and run hit enter
// describe what is happening in the console
// PS: Refresh the page after before each snippet

// 1.1 Async request interceptors and response handlers by request type:

// console.log('1.1 Async Request Interceptors and Response Handlers by Request Type Demo:');
//
// const net = player.getNetworkManager();
//
// // read/write Request instance
// net.addRequestInterceptor(Player.RequestType.HlsPlaylist, (request) => {
//   console.log('async hls-playlist request interceptor 1: ', request);
//
//   return Promise.resolve(request.clone());
// });
//
// // read/write Request instance
// net.addRequestInterceptor(Player.RequestType.HlsPlaylist, (request) => {
//   console.log('async hls-playlist request interceptor 2: ', request);
//
//   return Promise.resolve(request.clone());
// });
//
// // read/write Request instance
// net.addRequestInterceptor(Player.RequestType.HlsPlaylist, (request) => {
//   console.log('async hls-playlist request interceptor 3: ', request);
//
//   return Promise.resolve(request.clone());
// });
//
// // for response interceptor we allow only reading Response object
// net.addResponseHandler(Player.RequestType.HlsPlaylist, (response) => {
//   console.log('response handler for hls-playlist 1: ', response);
// });
//
// // for response interceptor we allow only Reading response object
// net.addResponseHandler(Player.RequestType.HlsPlaylist, (response) => {
//   console.log('response handler for hls-playlist 2: ', response);
// });
//
// // for response interceptor we allow only Reading response object
// net.addResponseHandler(Player.RequestType.HlsPlaylist, (response) => {
//   console.log('response handler for hls-playlist 3: ', response);
// });
//
// const url = 'https://demo.unified-streaming.com/k8s/live/scte35.isml/scte35-audio_eng=64000-video=500000.m3u8';
// const requestType = Player.RequestType.HlsPlaylist;
// const requestInit = {};
// const retryOptions = { maxAttempts: 3, delay: 2_000, delayFactor: 0.5, fuzzFactor: 0.1 };
// const timeout = 20_000;
// const responseMapper = (buffer) => buffer;
//
// const { done, abort } = net.get(url, requestType, requestInit, retryOptions, timeout, responseMapper);
//
// done.then(
//   (responseData) => console.log('Response Data: ', responseData),
//   (networkManagerError) => console.error('Error: ', networkManagerError)
// );

// 1.2 Progressive loading:
// Highlight here, that we do not wait full HTTP response to be received
// and emit chunk once part of the resopnse body is available via fetch response body readable stream

// console.log('1.2 Fetch progressive loading demo');
//
// const net = player.getNetworkManager();
//
// // read/write Request instance
// net.addRequestInterceptor(Player.RequestType.HlsPlaylist, (request) => {
//   console.log('async hls-playlist request interceptor 1: ', request);
//
//   return Promise.resolve(request.clone());
// });
//
// // read/write Request instance
// net.addRequestInterceptor(Player.RequestType.HlsPlaylist, (request) => {
//   console.log('async hls-playlist request interceptor 2: ', request);
//
//   return Promise.resolve(request.clone());
// });
//
// // read/write Request instance
// net.addRequestInterceptor(Player.RequestType.HlsPlaylist, (request) => {
//   console.log('async hls-playlist request interceptor 3: ', request);
//
//   return Promise.resolve(request.clone());
// });
//
// // for response interceptor we allow only reading Response object
// net.addResponseHandler(Player.RequestType.HlsPlaylist, (response) => {
//   console.log('response handler for hls-playlist 1: ', response);
// });
//
// // for response interceptor we allow only Reading response object
// net.addResponseHandler(Player.RequestType.HlsPlaylist, (response) => {
//   console.log('response handler for hls-playlist 2: ', response);
// });
//
// // for response interceptor we allow only Reading response object
// net.addResponseHandler(Player.RequestType.HlsPlaylist, (response) => {
//   console.log('response handler for hls-playlist 3: ', response);
// });
//
// const url = 'https://demo.unified-streaming.com/k8s/live/scte35.isml/scte35-audio_eng=64000-video=500000.m3u8';
// const requestType = Player.RequestType.HlsPlaylist;
// const requestInit = {};
// const retryOptions = { maxAttempts: 3, delay: 2_000, delayFactor: 0.5, fuzzFactor: 0.1 };
// const timeout = 20_000;
// const chunkHandler = (buffer) => {
//   console.log('chunk: ', buffer);
// };
//
// const { done, abort } = net.getProgressive(url, requestType, requestInit, retryOptions, timeout, chunkHandler);
//
// done.then(
//   () => console.log('Done!'),
//   (networkManagerError) => console.error('Error: ', networkManagerError)
// );

// 1.3 Backoff/Retry

// You can simpy re-use previous snippet, just replace header logging to "1.3 Backoff/Retry demo"
// you also need to block request url in the chrome dev-tools

// in the network panel find this m3u8 request, right click it and select "Block request URL"
// Once blocked, refresh the page and re-run the same snippet
// You should see that Network manager will try to send request <MaxAttempts> times (you can show network panel or logs)
// You should see from logs that each attempt has Delay, which is increasing by <DelayFactor>, starting from <InitialDelay>
// NextDelay = CurrentDelay * <DelayFactor>
// For example if <InitialDelay> = 2_000, and <DelayFactor> is 0.5,
// 2nd attempt will be: 2_000 + (2_000 * 0.5) = 3_000
// 3rd attempt will be 3_000 + (3_000 * 0.5) = 4_500
// You should also see that request time for each attempt is randomized based on <FuzzFactor>
// For example if <FuzzFactor> is 0.1 (10% deviation) and current Delay is 2_000 (10% is 200), it means that attempt will be a random time from 1_800 to 2_200
// If current Delay is 3_000 (10% is 300), it means that attempt will be a random time from 2_700 to 3_300
// If current Delay is 4_500 (10% is 450), it means that attempt will be a random time from 4_050 to 4_950
// You should also note, that we run request interceptor on each attempt

// 2.1 Hls-parser State Machine Diagram

// Show state machine diagram

// 2.2 HlsFullParser Demo

// console.log('2.2 hls full playlist parser demo');
// const net = player.getNetworkManager();

// const url = 'https://demo.unified-streaming.com/k8s/live/scte35.isml/scte35-audio_eng=64000-video=500000.m3u8';
// const requestType = Player.RequestType.HlsPlaylist;
// const requestInit = {};
// const retryOptions = { maxAttempts: 3, delay: 2_000, delayFactor: 0.5, fuzzFactor: 0.1 };
// const timeout = 20_000;
// const responseMapper = (buffer) => buffer;
//
// const { done, abort } = net.get(url, requestType, requestInit, retryOptions, timeout, responseMapper);
//
// done.then(
//   (responseData) => console.log('Parsed Hls Playlist: ', hlsFullParser.parseFullPlaylistBuffer(responseData)),
//   (networkManagerError) => console.error('Error: ', networkManagerError)
// );

// 2.3 HlsProgressiveParser Demo
// You can highlight here, that we do not wait for a full HTTP response,
// we parse each packet that fetch api provides us via response body readable stream

// console.log('2.3 hls progressinve playlist parser demo');
// const net = player.getNetworkManager();

// const url = 'https://demo.unified-streaming.com/k8s/live/scte35.isml/scte35-audio_eng=64000-video=500000.m3u8';
// const requestType = Player.RequestType.HlsPlaylist;
// const requestInit = {};
// const retryOptions = { maxAttempts: 3, delay: 2_000, delayFactor: 0.5, fuzzFactor: 0.1 };
// const timeout = 20_000;
// const chunkHandler = (buffer) => {
//   console.log('parse chunk: ', buffer);
//   hlsProgressiveParser.pushBuffer(buffer);
// };
//
// const { done, abort } = net.getProgressive(url, requestType, requestInit, retryOptions, timeout, chunkHandler);
//
// done.then(
//   () => console.log('Parsed Hls Playlist: ', hlsProgressiveParser.done()),
//   (networkManagerError) => console.error('Error: ', networkManagerError)
// );

// 3.1 Dash State Machine Diagram

// Show state machine diagram
// you can say that we use state machine approach to support progressive parsing for dash,
// and because it is pretty challenging most of the player uses DomParser().parseFromString()
// but it requires full response to be loaded

// 3.2 Dash full parser Demo

// console.log('3.2 Dash full parser demo.');
// const net = player.getNetworkManager();

// const url = 'https://dash.akamaized.net/akamai/bbb_30fps/bbb_30fps.mpd';
// const requestType = Player.RequestType.DashManifest;
// const requestInit = {};
// const retryOptions = { maxAttempts: 3, delay: 2_000, delayFactor: 0.5, fuzzFactor: 0.1 };
// const timeout = 20_000;
// const responseMapper = (buffer) => buffer;
//
// const { done, abort } = net.get(url, requestType, requestInit, retryOptions, timeout, responseMapper);
//
// done.then(
//   (responseData) => console.log('Parsed Dash Manifest: ', dashFullParser.parseFullManifestBuffer(responseData)),
//   (networkManagerError) => console.error('Error: ', networkManagerError)
// );

// 3.3 Dash Progressive parser Demo

// console.log('3.3 Dash progressive parser demo.');
// const net = player.getNetworkManager();

// const url = 'https://dash.akamaized.net/akamai/bbb_30fps/bbb_30fps.mpd';
// const requestType = Player.RequestType.DashManifest;
// const requestInit = {};
// const retryOptions = { maxAttempts: 3, delay: 2_000, delayFactor: 0.5, fuzzFactor: 0.1 };
// const timeout = 20_000;
// const chunkHandler = (buffer) => {
//   console.log('parse chunk: ', buffer);
//   dashProgressiveParser.pushBuffer(buffer);
// };
//
// const { done, abort } = net.getProgressive(url, requestType, requestInit, retryOptions, timeout, chunkHandler);
//
// done.then(
//   () => console.log('Parsed Dash Manifest: ', dashProgressiveParser.done()),
//   (networkManagerError) => console.error('Error: ', networkManagerError)
// );
