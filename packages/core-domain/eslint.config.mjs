// @ts-check
/**
 * ESLint flat config for @evolith/core-domain (ESLint 9+).
 *
 * Migrated from the legacy `.eslintrc.js` + `--no-eslintrc` invocation, which is
 * incompatible with ESLint 9 (the `--no-eslintrc` flag was removed and the legacy
 * eslintrc loader broke eslint-plugin-boundaries with "Cannot set properties of
 * undefined (setting defaultMeta)").
 *
 * Enforces two architectural guards:
 *
 *  1. Layer boundaries — core-domain is a pure inner package. Imports may only
 *     flow inward across the layer hierarchy:
 *
 *       common / types
 *         └─ domain        (entities, value objects, domain services)
 *             └─ application (use cases)
 *                 └─ infrastructure (adapters)
 *
 *  2. Stateless Core (GT-377 / ADR-0101) — Core is a stateless Evaluation Engine.
 *     `product` / `initiative` / `evidence` / `decision` are CONTEXT, never
 *     persisted entities, so a `*Repository` for any of them must NEVER appear in
 *     this package. The `no-restricted-syntax` rule below fails the build (and CI)
 *     if such an identifier is declared, imported, or referenced.
 */
import boundaries from 'eslint-plugin-boundaries';
import tseslint from 'typescript-eslint';
// Shared (CommonJS) so the negative regression test enforces the EXACT same rule.
import guards from './eslint.guards.cjs';

const { STATELESS_CORE_REPOSITORY_BAN } = guards;

export default tseslint.config(
  {
    ignores: [
      'dist/**',
      'coverage/**',
      'node_modules/**',
      '**/*.js',
      '**/*.cjs',
      '**/*.mjs',
    ],
  },
  {
    files: ['src/**/*.ts'],
    plugins: {
      '@typescript-eslint': tseslint.plugin,
      boundaries,
    },
    languageOptions: {
      parser: tseslint.parser,
      ecmaVersion: 2022,
      sourceType: 'module',
    },
    settings: {
      'boundaries/elements': [
        { type: 'common', pattern: 'src/common/**/*' },
        { type: 'domain', pattern: 'src/domain/**/*' },
        { type: 'application', pattern: 'src/application/**/*' },
        { type: 'infrastructure', pattern: 'src/infrastructure/**/*' },
        { type: 'gates', pattern: 'src/gates/**/*' },
        { type: 'phases', pattern: 'src/phases/**/*' },
        { type: 'tenancy', pattern: 'src/tenancy/**/*' },
        { type: 'providers', pattern: 'src/providers/**/*' },
        { type: 'evidence', pattern: 'src/evidence/**/*' },
        { type: 'evaluation', pattern: 'src/evaluation/**/*' },
      ],
      'boundaries/ignore': ['src/**/*.spec.ts', 'src/**/*.test.ts'],
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
            {
              from: 'infrastructure',
              allow: ['infrastructure', 'application', 'domain', 'common'],
            },

            // gates/phases/tenancy/providers/evidence: cross-cutting within this package
            { from: 'gates', allow: ['gates', 'domain', 'application', 'common'] },
            { from: 'phases', allow: ['phases', 'domain', 'application', 'common'] },
            { from: 'tenancy', allow: ['tenancy', 'domain', 'common'] },
            {
              from: 'providers',
              allow: ['providers', 'infrastructure', 'domain', 'common'],
            },
            { from: 'evidence', allow: ['evidence', 'domain', 'application', 'common'] },

            // evaluation: stateless Core Evaluation Engine (GT-377/ADR-0101) —
            // canonical contracts + orchestrator; composes domain + application.
            {
              from: 'evaluation',
              allow: ['evaluation', 'domain', 'application', 'common'],
            },
          ],
        },
      ],

      // Stateless-Core guard (GT-377 AC-3 / ADR-0101): no business-entity repositories.
      'no-restricted-syntax': ['error', STATELESS_CORE_REPOSITORY_BAN],
    },
  },
);
