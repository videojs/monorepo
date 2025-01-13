import { defineConfig, mergeConfig, coverageConfigDefaults } from 'vitest/config';
import baseConfig from '../../vitest.config.base';

export default mergeConfig(
  baseConfig,
  defineConfig({
    test: {
      coverage: {
        exclude: ['src/entry-points/**', ...coverageConfigDefaults.exclude],
        reportsDirectory: './coverage',
        thresholds: {
          lines: 10,
          functions: 10,
          branches: 10,
        },
      },
    },
  })
);
