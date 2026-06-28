/**
 * Jest configuration for @evolith/core contract/smoke tests.
 *
 * The barrel (src/index.ts) re-exports symbols from @evolith/core-domain
 * subpaths. Those subpaths resolve through package.json `exports` to the
 * compiled `dist/` of core-domain, which is not guaranteed to exist when the
 * test runs standalone. To keep this suite dependency-light and runnable
 * without a prior build step, we map the core-domain subpaths to their
 * TypeScript source so ts-jest can resolve and transform them in-place.
 */
const path = require('path');

const coreDomainSrc = path.resolve(__dirname, '../core-domain/src');

module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/*.spec.ts', '**/*.test.ts'],
  moduleFileExtensions: ['ts', 'js', 'json', 'node'],
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      tsconfig: '<rootDir>/tsconfig.spec.json',
      diagnostics: false,
    }],
  },
  moduleNameMapper: {
    // Map specific core-domain subpaths to TS source (resolved by ts-jest),
    // so the contract test exercises the real re-export graph without needing
    // core-domain to be pre-built.
    '^@evolith/core-domain/(.*)$': `${coreDomainSrc}/$1`,
    '^@evolith/core-domain$': `${coreDomainSrc}/index`,
  },
};
