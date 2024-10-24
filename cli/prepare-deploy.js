/* eslint-disable no-console */
import { cp, mkdir } from 'node:fs';

const copyFromPackage = (packageName, folder) => {
  cp(`packages/${packageName}/dist-${folder}`, `deploy/${folder}/${packageName}`, { recursive: true }, (err) => {
    if (err) {
      console.log(`Failed to copy ${packageName} api reference dist. See error: `, err);
    }
  });
};

mkdir('deploy', () => {
  cp('packages/videojs.dev/dist', 'deploy/', { recursive: true }, (err) => {
    if (err) {
      console.log(`Failed to copy videojs.dev dist. See error: `, err);
    }
  });

  ['dash-parser', 'hls-parser', 'playback', 'env-capabilities'].forEach((packageName) => {
    copyFromPackage(packageName, 'api-reference');
    copyFromPackage(packageName, 'demo');
  });
});
