// Isolated jest project for the exploratory cross-surface test agent. Mirrors
// src/tests/contract/jest.config.js: it compiles the CLI + core-api + mcp DI graphs
// under a single tsconfig and drives them in-process. Only *.spec.ts run as tests;
// the library modules (catalog/executors/oracles/…) are imported by the spec.
module.exports = {
  rootDir: '../..',
  testMatch: ['<rootDir>/tests/exploration/**/*.spec.ts'],
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      tsconfig: '<rootDir>/tests/exploration/tsconfig.json',
      // We only need to RUN the graphs and compare ADR-0073 envelopes across
      // surfaces; per-package `npm run build` is the type-safety authority. Stricter
      // cross-graph diagnostics become warnings, not failures.
      diagnostics: { warnOnly: true },
    }],
  },
  moduleNameMapper: {
    '^@clack/prompts$': '<rootDir>/sdk/cli/src/test/__mocks__/clack-prompts.ts',
    '^conf$': '<rootDir>/sdk/cli/src/test/__mocks__/conf.ts',
    '^chokidar$': '<rootDir>/sdk/cli/src/test/__mocks__/chokidar.ts',
  },
  moduleDirectories: [
    'node_modules',
    '<rootDir>/node_modules',
    '<rootDir>/sdk/cli/node_modules',
    '<rootDir>/apps/core-api/node_modules',
    '<rootDir>/packages/mcp-server/node_modules',
  ],
  // The mcp-server carries node_modules manual mocks (cache-manager, etc.) that jest
  // would otherwise auto-apply, breaking the real core-api DI graph. Ignore them and
  // the built dist duplicates (haste-map collisions) — same as the contract suite.
  modulePathIgnorePatterns: [
    '<rootDir>/packages/mcp-server/dist/',
    '<rootDir>/packages/mcp-server/src/__mocks__/',
  ],
  testEnvironment: 'node',
  testTimeout: 180000,
  forceExit: true,
  verbose: true,
};
