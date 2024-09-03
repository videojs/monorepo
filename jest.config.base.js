export default {
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
