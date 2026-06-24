module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/*.spec.ts', '**/*.test.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/main.ts',
    '!src/test/**',
    '!src/infrastructure/mcp/tools/tool-utils.ts',
    '!src/infrastructure/providers/logger.provider.ts',
    '!src/commands/completion/completion.command.ts',
    '!**/index.ts',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html', 'json-summary'],
  // Enforce the normative coverage contract at the point of change (GT-50), not
  // only in the CI bash gate. Statements match the 80% CI threshold; branches
  // and functions ratchet just below the current floor so regressions fail the
  // local `npm run test:cov` instead of surfacing only after push.
  coverageThreshold: {
    global: {
      statements: 80,
      lines: 80,
      functions: 75,
      branches: 75,
    },
  },
  moduleDirectories: ['node_modules', 'src'],
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      tsconfig: 'tsconfig.test.json',
    }],
  },
  moduleNameMapper: {
    '^domain/(.*)$': '<rootDir>/src/domain/$1',
    '^infrastructure/(.*)$': '<rootDir>/src/infrastructure/$1',
    '^application/(.*)$': '<rootDir>/src/application/$1',
    '^core/(.*)$': '<rootDir>/src/core/$1',
    '^commands/(.*)$': '<rootDir>/src/commands/$1',
    '^test/(.*)$': '<rootDir>/src/test/$1',
    '^@evolith/core-domain/(.*)$': '<rootDir>/../../packages/core-domain/src/$1',
    '^@clack/prompts$': '<rootDir>/src/test/__mocks__/clack-prompts.ts',
    '^conf$': '<rootDir>/src/test/__mocks__/conf.ts',
    '^chokidar$': '<rootDir>/src/test/__mocks__/chokidar.ts',
  },
  setupFilesAfterEnv: [],
  testTimeout: 10000,
  verbose: true,
  // OPP-003: Suppress console noise during tests for cleaner output
  // Individual tests can still verify logging behavior via mocks
  silent: true,
  // OPP-008: Parallelize test execution for faster CI
  // Uses all available CPU cores (default behavior)
  maxWorkers: '100%',
  workerIdleMemoryLimit: '512MB',
};
