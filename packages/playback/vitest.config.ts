import { defineConfig, mergeConfig } from 'vitest/config';
import baseConfig from '../../vitest.config.base';

export default mergeConfig(
  baseConfig,
  defineConfig({
    test: {
      coverage: {
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
