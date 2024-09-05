import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    browser: {
      provider: 'playwright',
      name: 'chromium',
      headless: true,
    },
    coverage: {
      include: ['src/**'],
    },
  },
});
