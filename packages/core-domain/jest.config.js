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
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/index.ts',
    '!src/**/*.spec.ts',
    '!src/**/*.test.ts',
  ],
  coverageReporters: ['text', 'text-summary', 'lcov', 'json-summary'],
  coverageThreshold: {
    global: {
      statements: 60,
      lines: 60,
      functions: 55,
      branches: 55,
    },
  },
};
