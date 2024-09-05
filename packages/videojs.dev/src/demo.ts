/* eslint-disable no-console */
import { FullPlaylistParser as HlsFullParser, ProgressiveParser as HlsProgressiveParser } from '@videojs/hls-parser';
import { FullManifestParser as DashFullParser, ProgressiveParser as DashProgressiveParser } from '@videojs/dash-parser';
import { Player } from '@videojs/playback';

console.log(HlsFullParser);
console.log(HlsProgressiveParser);
console.log(DashFullParser);
console.log(DashProgressiveParser);
console.log(Player);
