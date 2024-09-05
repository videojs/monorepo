import { defineConfig, mergeConfig } from 'vitest/config';
import baseConfig from '../../vitest.config.base';

export default mergeConfig(
  baseConfig,
  defineConfig({
    test: {
      coverage: {
        reportsDirectory: './coverage',
        thresholds: {
          lines: 5,
          functions: 5,
          branches: 5,
        },
      },
    },
  })
);
