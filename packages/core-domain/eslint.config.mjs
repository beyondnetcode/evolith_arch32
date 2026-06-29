// @ts-check
/**
 * ESLint flat config for @evolith/core-domain (ESLint 9+).
 *
 * Migrated from the legacy `.eslintrc.js` + `--no-eslintrc -c .eslintrc.js`
 * invocation, which is incompatible with ESLint 9 (the `--no-eslintrc` flag was
 * removed and the legacy eslintrc loader broke eslint-plugin-boundaries). Same
 * boundary-focused flat config adopted for @evolith/mcp-server and core-api.
 *
 * Enforces two architectural guards:
 *
 *  1. Layer boundaries — core-domain is a pure inner package. Runtime (VALUE)
 *     imports may only flow inward across the layer hierarchy:
 *
 *       common
 *         └─ domain        (entities, value objects, domain services)
 *             └─ application (use cases)
 *                 └─ infrastructure (adapters)
 *
 *     plus the cross-cutting groups (gates/phases/tenancy/providers/evidence/
 *     evaluation). Type-only imports are permitted across layers — they are
 *     erased at compile time and create NO runtime coupling.
 *
 *  2. Stateless Core (GT-377 / ADR-0101) — Core is a stateless Evaluation Engine.
 *     `product` / `initiative` / `evidence` / `decision` are CONTEXT, never
 *     persisted entities, so a `*Repository` for any of them must NEVER appear in
 *     this package. The `no-restricted-syntax` rule below fails the build (and CI)
 *     if such an identifier is declared, imported, or referenced.
 *
 * Real-enforcement notes (mode + resolver) — without these the rule is a silent
 * no-op: `mode: 'file'` classifies each .ts file as an instance of its layer
 * (default 'folder' mode leaves files in `src/<layer>/` unclassified), and the
 * `import/resolver` extension list lets boundaries resolve extensionless `.ts`
 * import targets so cross-layer imports are actually detected.
 */
import boundaries from 'eslint-plugin-boundaries';
import tsParser from '@typescript-eslint/parser';

// Stateless-Core guard (GT-377 AC-3 / ADR-0101): bans any identifier shaped like
// a repository for a business entity that Core treats as pure context. Matches
// `ProductRepository`, `IInitiativeRepository`, `EvidenceRepositoryPort`,
// `InMemoryDecisionRepository`, … while leaving legitimate infrastructure
// repositories (`AuditRepository`, `SubscriptionRepository`, …) untouched.
const STATELESS_CORE_REPOSITORY_BAN = {
  selector: 'Identifier[name=/(Product|Initiative|Evidence|Decision)Repository/]',
  message:
    'GT-377/ADR-0101: Core is a stateless Evaluation Engine. product/initiative/evidence/decision are context, not entities — a *Repository for them must not appear in core-domain.',
};

export default [
  {
    ignores: [
      'dist/**',
      'coverage/**',
      'node_modules/**',
      // Tests are not subject to layer boundaries (mirrors the original
      // `boundaries/ignore`). Excluding them at the ESLint level also avoids
      // "rule not found" errors from inline eslint-disable directives that may
      // reference plugins not loaded by this boundary-only config.
      '**/*.spec.ts',
      '**/*.test.ts',
      '**/*.js',
      '**/*.cjs',
      '**/*.mjs',
    ],
  },
  {
    files: ['src/**/*.ts'],
    plugins: {
      boundaries,
    },
    languageOptions: {
      parser: tsParser,
      ecmaVersion: 2022,
      sourceType: 'module',
    },
    settings: {
      'import/resolver': {
        node: { extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'] },
      },
      'boundaries/elements': [
        { type: 'common', mode: 'file', pattern: 'src/common/**/*' },
        { type: 'domain', mode: 'file', pattern: 'src/domain/**/*' },
        { type: 'application', mode: 'file', pattern: 'src/application/**/*' },
        { type: 'infrastructure', mode: 'file', pattern: 'src/infrastructure/**/*' },
        { type: 'gates', mode: 'file', pattern: 'src/gates/**/*' },
        { type: 'phases', mode: 'file', pattern: 'src/phases/**/*' },
        { type: 'tenancy', mode: 'file', pattern: 'src/tenancy/**/*' },
        { type: 'providers', mode: 'file', pattern: 'src/providers/**/*' },
        { type: 'evidence', mode: 'file', pattern: 'src/evidence/**/*' },
        { type: 'evaluation', mode: 'file', pattern: 'src/evaluation/**/*' },
      ],
      'boundaries/ignore': ['src/**/*.spec.ts', 'src/**/*.test.ts'],
    },
    rules: {
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

            // Type-only imports are permitted across all layers: erased at compile
            // time, no runtime coupling. VALUE imports stay strictly governed above.
            {
              from: [
                'common',
                'domain',
                'application',
                'infrastructure',
                'gates',
                'phases',
                'tenancy',
                'providers',
                'evidence',
                'evaluation',
              ],
              importKind: 'type',
              allow: [
                'common',
                'domain',
                'application',
                'infrastructure',
                'gates',
                'phases',
                'tenancy',
                'providers',
                'evidence',
                'evaluation',
              ],
            },
          ],
        },
      ],

      // Stateless-Core guard (GT-377 AC-3 / ADR-0101): no business-entity repositories.
      'no-restricted-syntax': ['error', STATELESS_CORE_REPOSITORY_BAN],

      // External npm packages are allowed everywhere.
      'boundaries/no-external': 'off',
    },
  },
];
