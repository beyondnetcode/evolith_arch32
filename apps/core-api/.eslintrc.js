/**
 * ESLint boundaries configuration for core-api (top-level app).
 *
 * core-api is the outermost layer:
 *   - MAY import from @evolith/core-domain and @evolith/mcp-server
 *   - All internal layers may import from packages below them
 *
 * Internal layer hierarchy:
 *   application (use cases / services)
 *     └─ infrastructure (DB, HTTP clients, external integrations)
 *         └─ presentation (controllers, DTOs)
 *   openapi (API spec / decorators — cross-cutting)
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
      { type: 'application',    pattern: 'src/application/**/*' },
      { type: 'infrastructure', pattern: 'src/infrastructure/**/*' },
      { type: 'presentation',   pattern: 'src/presentation/**/*' },
      { type: 'openapi',        pattern: 'src/openapi/**/*' },
    ],
    'boundaries/ignore': [
      'src/**/*.spec.ts',
      'src/**/*.test.ts',
      'test/**/*',
    ],
  },

  rules: {
    '@typescript-eslint/no-explicit-any': 'warn',

    'boundaries/element-types': [
      'error',
      {
        default: 'disallow',
        rules: [
          // application: innermost app layer
          { from: 'application', allow: ['application'] },

          // infrastructure: adapters — may use application
          { from: 'infrastructure', allow: ['infrastructure', 'application'] },

          // presentation: controllers — outermost, may use all
          { from: 'presentation', allow: ['presentation', 'infrastructure', 'application', 'openapi'] },

          // openapi: cross-cutting decorators/specs
          { from: 'openapi', allow: ['openapi', 'application'] },
        ],
      },
    ],

    // External npm packages (including @evolith/* workspace packages) are allowed
    'boundaries/no-external': 'off',
  },

  ignorePatterns: [
    'dist/',
    'node_modules/',
    'coverage/',
    '**/*.js',
    'test/',
  ],
};
