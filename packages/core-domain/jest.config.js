module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/*.spec.ts', '**/*.test.ts'],
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      tsconfig: 'packages/core-domain/tsconfig.json',
      diagnostics: false,
    }],
  },
  moduleNameMapper: {
    '\\.\\./\\.\\./\\.\\./test/mocks': '<rootDir>/../../sdk/cli/src/test/mocks/index.ts',
  },
};
