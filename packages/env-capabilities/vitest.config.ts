import { defineConfig, mergeConfig } from 'vitest/config';
import baseConfig from '../../vitest.config.base';

export default mergeConfig(
  baseConfig,
  defineConfig({
    test: {
      coverage: {
        reportsDirectory: './coverage',
        thresholds: {
          lines: 90,
          functions: 90,
          branches: 90,
        },
      },
    },
  })
);
