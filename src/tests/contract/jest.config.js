module.exports = {
  rootDir: '../..',
  testMatch: ['<rootDir>/tests/contract/**/*.spec.ts'],
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      tsconfig: '<rootDir>/tests/contract/tsconfig.json',
      // This suite compiles three full DI graphs (CLI + core-api + mcp) under a
      // single isolated tsconfig. Their own `npm run build` (per-package tsconfigs)
      // is the authority on type-safety; here we only need to RUN them and compare
      // ADR-0073 envelopes across surfaces. ts-jest still type-checks and emits the
      // NestJS decorator metadata DI needs — but stricter cross-graph type
      // diagnostics (e.g. Provider-union inference) become warnings, not failures.
      diagnostics: { warnOnly: true },
    }],
  },
  // No moduleNameMapper for nest-commander-testing: it hoists to the repo-root
  // node_modules, which the moduleDirectories walk-up below already resolves.
  //
  // The compiled CLI DI graph statically imports ESM-only packages (`@clack/prompts`,
  // `conf`, `chokidar`) that jest's CommonJS runtime cannot `require`. Reuse the
  // CLI's own test doubles (the same mocks its unit suite maps) so the graph loads.
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
  // The mcp-server carries manual mocks for node_modules packages (cache-manager,
  // @nestjs/cache-manager) under __mocks__. jest auto-applies node_modules manual
  // mocks found anywhere in the haste map, which would replace the REAL
  // cache-manager the core-api DI graph needs (breaking @CacheTTL/CacheInterceptor).
  // Those mocks belong to mcp-server's own suite; ignore them (and the built dist,
  // whose duplicate copies also trip jest-haste-map) so this suite uses the real deps.
  modulePathIgnorePatterns: [
    '<rootDir>/packages/mcp-server/dist/',
    '<rootDir>/packages/mcp-server/src/__mocks__/',
  ],
  testEnvironment: 'node',
  testTimeout: 120000,
  forceExit: true,
  verbose: true,
};
