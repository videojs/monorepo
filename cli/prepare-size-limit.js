import { readFileSync } from 'node:fs';

const getSizeLimitJson = (packageName) => {
  try {
    return readFileSync(`packages/${packageName}/.size-limit-output.json`, 'utf8');
  } catch (e) {
    // ignore
    return '[]';
  }
};

const result = ['dash-parser', 'hls-parser', 'playback', 'env-capabilities']
  .map((packageName) => {
    try {
      const json = JSON.parse(getSizeLimitJson(packageName));
      json.forEach((check) => {
        check.name = check.name
          .split(',')
          .map((part) => `${packageName}/${part.trim()}`)
          .join(', ');
      });

      return json;
    } catch (e) {
      return [];
    }
  })
  .reduce((acc, val) => acc.concat(val), []);

// eslint-disable-next-line no-console
console.log(JSON.stringify(result));
