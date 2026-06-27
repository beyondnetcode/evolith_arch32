/**
 * ESLint boundaries configuration for @evolith/mcp-server.
 *
 * Enforces that mcp-server sits between core-domain and apps:
 *   - MAY import from @evolith/core-domain
 *   - MUST NOT import from apps/ (core-api)
 *
 * Internal layer hierarchy:
 *   domain  (local MCP domain models)
 *     └─ application (MCP use cases)
 *         └─ mcp / tools / resources / watcher (MCP adapters)
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
      { type: 'domain',      pattern: 'src/domain/**/*' },
      { type: 'application', pattern: 'src/application/**/*' },
      { type: 'mcp',         pattern: 'src/mcp/**/*' },
      { type: 'tools',       pattern: 'src/tools/**/*' },
      { type: 'resources',   pattern: 'src/resources/**/*' },
      { type: 'watcher',     pattern: 'src/watcher/**/*' },
      { type: 'core',        pattern: 'src/core/**/*' },
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
          // domain: innermost local models
          { from: 'domain', allow: ['domain'] },

          // application: may use local domain
          { from: 'application', allow: ['application', 'domain'] },

          // mcp/tools/resources/watcher: adapters — may use all inner layers
          { from: 'mcp',       allow: ['mcp', 'application', 'domain'] },
          { from: 'tools',     allow: ['tools', 'application', 'domain', 'mcp'] },
          { from: 'resources', allow: ['resources', 'application', 'domain', 'mcp'] },
          { from: 'watcher',   allow: ['watcher', 'application', 'domain'] },
          { from: 'core',      allow: ['core', 'domain'] },
        ],
      },
    ],

    // External npm packages (including @evolith/core-domain) are allowed
    'boundaries/no-external': 'off',
  },

  ignorePatterns: [
    'dist/',
    'node_modules/',
    'coverage/',
    '**/*.js',
  ],
};
