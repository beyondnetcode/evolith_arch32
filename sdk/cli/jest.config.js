module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/*.test.ts'],
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
  },
  setupFilesAfterEnv: [],
  testTimeout: 10000,
  verbose: true,
};