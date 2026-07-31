/**
 * Jest configuration for @beyondnet/evolith-repo-facts.
 *
 * The extractor imports the canonical `RepoFacts` contract from
 * `@beyondnet/evolith-core-domain/evaluation/contracts`. That subpath resolves
 * through package.json `exports` to core-domain's compiled `dist/`, which is not
 * guaranteed to exist when this suite runs standalone, so we map the core-domain
 * subpaths to their TypeScript source and let ts-jest transform them in place —
 * mirroring @beyondnet/evolith-agent-runtime's jest config.
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
