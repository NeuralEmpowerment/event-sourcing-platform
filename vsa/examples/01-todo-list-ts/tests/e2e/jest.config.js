export default {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>'],
  testMatch: ['**/*.e2e.test.ts'],
  setupFilesAfterEnv: ['<rootDir>/setup.ts'],
  collectCoverageFrom: [],
  verbose: true,
  testTimeout: 30000,
};

