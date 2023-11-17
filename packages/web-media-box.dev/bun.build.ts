import baseBuilder from '../../bun.build.base';

await baseBuilder({ entrypoints: ['./src/index.ts'], outdir: './dist' });
