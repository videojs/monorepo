/* eslint-disable no-console */
import { execSync } from 'node:child_process';

let version = '';

try {
  version = execSync('git describe --exact-match --tags', { encoding: 'utf8' }).trim();

  if (!version) {
    console.log('Invalid tag info received from the git history.');
    process.exit(1);
  }
} catch (e) {
  console.log('Failed to get tag info from the git history.');
  process.exit(1);
}

const createEntryForPackage = (version, packageName) => {
  return `
### ${packageName}

### NPM
https://www.npmjs.com/package/${packageName}/v/${version}

### API reference / Docs
TBD

### Demo App
TBD
`;
};

const createAllEntries = (version) => {
  return `
Please, check the changelog in the root of the project.

${createEntryForPackage(version, '@videojs/hls-parser')}
${createEntryForPackage(version, '@videojs/dash-parser')}
${createEntryForPackage(version, '@videojs/playback')}
`;
};

console.log(createAllEntries(version));
