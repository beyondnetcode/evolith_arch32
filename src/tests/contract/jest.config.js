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
  // Los dobles de mcp-server ya NO viven en `__mocks__/`: se renombraron a
  // `src/test-doubles/` (mcp-server los cablea explicitamente por
  // moduleNameMapper en su propio jest.config, nunca dependio del auto-descubrimiento).
  // Mientras se llamaban `__mocks__`, jest los auto-aplicaba a CUALQUIER suite que
  // los tuviera en su haste map: aqui `require.resolve` devolvia el paquete real y
  // `require()` el mock, que no exporta CacheTTL -> "CacheTTL is not a function" al
  // cargar el controller de core-api. `modulePathIgnorePatterns` no lo evitaba:
  // filtra rutas de modulo, no el registro de mocks.
  modulePathIgnorePatterns: [
    '<rootDir>/packages/mcp-server/dist/',
  ],
  testEnvironment: 'node',
  testTimeout: 120000,
  forceExit: true,
  verbose: true,
};
