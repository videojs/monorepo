import type { BuildConfig } from 'bun';

interface PackageConfig {
  entrypoints: Array<string>;
  outdir: string;
}

interface CreateConfigOptions extends PackageConfig {
  minify: boolean;
  naming: string;
}

const createConfig = ({ minify, naming, entrypoints, outdir }: CreateConfigOptions): BuildConfig => ({
  target: 'browser',
  format: 'esm',
  sourcemap: 'external',
  entrypoints,
  outdir,
  minify,
  naming,
});

const debugDefaults = {
  minify: false,
  naming: '[dir]/[name].debug.[ext]',
};

const prodDefaults = {
  minify: true,
  naming: '[dir]/[name].[ext]',
};

export default async (config: PackageConfig): Promise<void> => {
  const debugConfig = createConfig({ ...debugDefaults, ...config });
  const prodConfig = createConfig({ ...prodDefaults, ...config });

  await Promise.all([Bun.build(debugConfig), Bun.build(prodConfig)]);
};
