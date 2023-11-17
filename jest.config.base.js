/** @type {import('ts-jest').JestConfigWithTsJest} */
const config = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  coverageThreshold: {
    global: {
      branches: 5,
      functions: 5,
      lines: 5,
    },
  },
};

export default config;
