module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/*.spec.ts', '**/*.test.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/main.ts',
    '!src/test/**',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
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
    '^@clack/prompts$': '<rootDir>/src/test/__mocks__/clack-prompts.ts',
    '^conf$': '<rootDir>/src/test/__mocks__/conf.ts',
    '^chokidar$': '<rootDir>/src/test/__mocks__/chokidar.ts',
  },
  setupFilesAfterEnv: [],
  testTimeout: 10000,
  verbose: true,
};
