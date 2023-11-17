import baseBuilder from '../../bun.build.base';

await baseBuilder({
  entrypoints: ['./src/player.ts', './src/hls-pipeline.ts', './src/dash-pipeline.ts'],
  outdir: './dist',
});
