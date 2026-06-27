/**
 * ESLint boundaries configuration for @evolith/core-domain.
 *
 * Enforces that core-domain is a pure inner layer:
 *   - NO imports from apps/ (core-api, etc.)
 *   - NO imports from packages/mcp-server
 *   - Only intra-layer (domain, application, infrastructure) imports allowed
 *
 * Layer hierarchy for this package:
 *   common / types
 *     └─ domain        (entities, value objects, domain services)
 *         └─ application (use cases)
 *             └─ infrastructure (adapters)
 */

'use strict';

module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint', 'boundaries'],
  extends: ['plugin:boundaries/recommended'],

  settings: {
    'import/resolver': {
      node: { extensions: ['.js', '.jsx', '.ts', '.tsx'] },
    },

    'boundaries/elements': [
      { type: 'common',         pattern: 'src/common/**/*' },
      { type: 'domain',         pattern: 'src/domain/**/*' },
      { type: 'application',    pattern: 'src/application/**/*' },
      { type: 'infrastructure', pattern: 'src/infrastructure/**/*' },
      { type: 'gates',          pattern: 'src/gates/**/*' },
      { type: 'phases',         pattern: 'src/phases/**/*' },
      { type: 'tenancy',        pattern: 'src/tenancy/**/*' },
      { type: 'providers',      pattern: 'src/providers/**/*' },
      { type: 'evidence',       pattern: 'src/evidence/**/*' },
    ],
    'boundaries/ignore': [
      'src/**/*.spec.ts',
      'src/**/*.test.ts',
    ],
  },

  rules: {
    '@typescript-eslint/no-explicit-any': 'warn',

    'boundaries/element-types': [
      'error',
      {
        default: 'disallow',
        rules: [
          // common: no internal imports
          { from: 'common', allow: [] },

          // domain: innermost — only common
          { from: 'domain', allow: ['domain', 'common'] },

          // application: use cases — domain + common
          { from: 'application', allow: ['application', 'domain', 'common'] },

          // infrastructure: adapters — can use all inner layers
          { from: 'infrastructure', allow: ['infrastructure', 'application', 'domain', 'common'] },

          // gates/phases/tenancy/providers/evidence: cross-cutting within this package
          { from: 'gates',      allow: ['gates', 'domain', 'application', 'common'] },
          { from: 'phases',     allow: ['phases', 'domain', 'application', 'common'] },
          { from: 'tenancy',    allow: ['tenancy', 'domain', 'common'] },
          { from: 'providers',  allow: ['providers', 'infrastructure', 'domain', 'common'] },
          { from: 'evidence',   allow: ['evidence', 'domain', 'application', 'common'] },
        ],
      },
    ],

    // External npm packages are allowed everywhere
    'boundaries/no-external': 'off',
  },

  ignorePatterns: [
    'dist/',
    'node_modules/',
    'coverage/',
    '**/*.js',
  ],
};
