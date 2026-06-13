/**
 * ESLint configuration for Evolith Smart CLI.
 *
 * Enforces Hexagonal Architecture layer boundaries as mandated by
 * ADR-0002 (Clean Architecture) and architectural-directives.md §3.
 *
 * Layer hierarchy (inner → outer):
 *   types / config
 *     └─ domain          (entities, value objects, domain services)
 *         └─ application (use cases)
 *             └─ infrastructure (adapters, external integrations)
 *   core                 (cross-cutting: DI, observability, MCP, errors)
 *   commands             (CLI entry points — primary adapters)
 *
 * CRITICAL invariant: domain MUST NOT import from application,
 * infrastructure, or commands. All other pragmatic shortcuts are
 * documented as known allowances for the CLI context.
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
    // Teach eslint-module-utils to resolve TypeScript paths (required for
    // boundaries/element-types to trace relative .ts imports between layers).
    'import/resolver': {
      node: { extensions: ['.js', '.jsx', '.ts', '.tsx'] },
    },

    'boundaries/elements': [
      { type: 'types',          pattern: 'src/types/**/*' },
      { type: 'config',         pattern: 'src/config/**/*' },
      { type: 'domain',         pattern: 'src/domain/**/*' },
      { type: 'application',    pattern: 'src/application/**/*' },
      { type: 'infrastructure', pattern: 'src/infrastructure/**/*' },
      { type: 'core',           pattern: 'src/core/**/*' },
      { type: 'commands',       pattern: 'src/commands/**/*' },
    ],
    'boundaries/ignore': [
      'src/**/*.spec.ts',
      'src/**/*.test.ts',
      'src/test/**/*',
    ],
  },

  rules: {
    /**
     * Surface explicit `any` so new code is steered toward typed boundaries.
     * Enabled as a warning (GT-49): strict null/implicit-any enforcement now lives
     * in the compiler; the remaining explicit `: any` sit at genuine dynamic
     * boundaries (logger varargs, OPA/JSON payloads, catalog data).
     */
    '@typescript-eslint/no-explicit-any': 'warn',

    /**
     * Boundary rules for Hexagonal Architecture enforcement.
     *
     * Default is 'disallow' — every allowed import must be explicit.
     *
     * Key constraint (from ADR-0002 and architectural-directives.md §2.5):
     *   "The Domain layer must contain zero references to cloud SDKs,
     *    ORM libraries, or HTTP frameworks. Violation of this rule
     *    automatically fails Architecture Gate validation."
     */
    'boundaries/element-types': [
      'error',
      {
        default: 'disallow',
        rules: [
          // -----------------------------------------------------------------
          // types: primitive declarations — no internal imports
          // -----------------------------------------------------------------
          {
            from: 'types',
            allow: [],
          },

          // -----------------------------------------------------------------
          // config: only types
          // -----------------------------------------------------------------
          {
            from: 'config',
            allow: ['types'],
          },

          // -----------------------------------------------------------------
          // domain: INNERMOST — only core abstractions and types.
          // MUST NOT import from application, infrastructure, or commands.
          // Intra-layer imports (domain→domain) are permitted for index files
          // and internal service composition.
          // -----------------------------------------------------------------
          {
            from: 'domain',
            allow: ['domain', 'types'],
          },

          // -----------------------------------------------------------------
          // application: use cases.
          // Can import domain + core + infrastructure.
          // Note: direct infra import is a known pragmatic CLI allowance
          //   (no full port/adapter injection for simple CLI use cases).
          //   To tighten toward strict hexagonal: remove 'infrastructure'.
          // -----------------------------------------------------------------
          {
            from: 'application',
            allow: ['application', 'domain', 'core', 'types'],
          },

          // -----------------------------------------------------------------
          // infrastructure: adapters.
          // Can import domain + core. MUST NOT import application or commands.
          // -----------------------------------------------------------------
          {
            from: 'infrastructure',
            allow: ['infrastructure', 'application', 'domain', 'core', 'types'],
          },

          // -----------------------------------------------------------------
          // core: cross-cutting (DI, observability, MCP, validators).
          // Can import infrastructure (CLI execution), domain, config, types.
          // MUST NOT import application or commands.
          // Intra-layer imports (core→core) permitted for sub-module composition
          // (e.g. mcp/tools importing mcp/resources).
          // -----------------------------------------------------------------
          {
            from: 'core',
            allow: ['core', 'domain', 'infrastructure', 'config', 'types'],
          },

          // -----------------------------------------------------------------
          // commands: primary adapters / CLI entry points.
          // May import any lower layer — they are the outermost boundary.
          // -----------------------------------------------------------------
          {
            from: 'commands',
            allow: [
              'application',
              'domain',
              'infrastructure',
              'core',
              'config',
              'types',
            ],
          },
        ],
      },
    ],

    // Disable the noisy 'no external' rule — npm packages are allowed everywhere
    'boundaries/no-external': 'off',
  },

  ignorePatterns: [
    'dist/',
    'node_modules/',
    'coverage/',
    '**/*.js',
    '**/*.spec.ts',
    '**/*.test.ts',
    'src/test/',
    'examples/',
    'shell/',
    'templates/',
  ],
};
