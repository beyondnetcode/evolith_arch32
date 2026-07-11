/**
 * Jest configuration for @beyondnet/evolith-agent-runtime.
 *
 * The runtime imports the canonical Core Evaluation contracts from
 * `@beyondnet/evolith-core-domain/evaluation/contracts`. Those subpaths resolve through
 * package.json `exports` to core-domain's compiled `dist/`, which is not
 * guaranteed to exist when this suite runs standalone. We therefore map the
 * core-domain subpaths to their TypeScript source so ts-jest resolves and
 * transforms them in-place — mirroring @beyondnet/evolith-core's jest config.
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
    '^@beyondnet/evolith-core-domain/(.*)$': `${coreDomainSrc}/$1`,
    '^@beyondnet/evolith-core-domain$': `${coreDomainSrc}/index`,
  },
};
