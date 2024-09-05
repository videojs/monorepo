/* eslint-disable no-console */
import { cp, mkdir } from 'node:fs';

const copyApiReferences = (pckg) => {
  cp(`packages/${pckg}/dist-api-reference`, `deploy/api-references/${pckg}`, { recursive: true }, (err) => {
    if (err) {
      console.log(`Failed to copy ${pckg} api reference dist. See error: `, err);
    }
  });
};

mkdir('deploy', () => {
  cp('packages/videojs.dev/dist', 'deploy/', { recursive: true }, (err) => {
    if (err) {
      console.log(`Failed to copy videojs.dev dist. See error: `, err);
    }
  });

  copyApiReferences('dash-parser');
  copyApiReferences('hls-parser');
  copyApiReferences('playback');
});
