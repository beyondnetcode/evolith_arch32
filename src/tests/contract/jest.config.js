module.exports = {
  rootDir: '../..',
  testMatch: ['<rootDir>/tests/contract/**/*.spec.ts'],
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: '<rootDir>/tests/contract/tsconfig.json' }],
  },
  moduleNameMapper: {
    '^nest-commander-testing$': '<rootDir>/sdk/cli/node_modules/nest-commander-testing',
  },
  moduleDirectories: [
    'node_modules',
    '<rootDir>/node_modules',
    '<rootDir>/sdk/cli/node_modules',
    '<rootDir>/apps/core-api/node_modules',
    '<rootDir>/packages/mcp-server/node_modules',
  ],
  testEnvironment: 'node',
  testTimeout: 120000,
  forceExit: true,
  verbose: true,
};
