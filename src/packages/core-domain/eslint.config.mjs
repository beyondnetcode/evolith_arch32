// @ts-check
/**
 * ESLint flat config for @beyondnet/evolith-core-domain (ESLint 9+).
 *
 * Migrated from the legacy `.eslintrc.js` + `--no-eslintrc -c .eslintrc.js`
 * invocation, which is incompatible with ESLint 9 (the `--no-eslintrc` flag was
 * removed and the legacy eslintrc loader broke eslint-plugin-boundaries). Same
 * boundary-focused flat config adopted for @beyondnet/evolith-mcp and core-api.
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
      'boundaries/dependencies': [
        'error',
        {
          default: 'disallow',
          rules: [
            // common: no internal imports
            { from: { type: 'common' }, allow: { to: { type: [] } } },

            // domain: innermost — only common
            { from: { type: 'domain' }, allow: { to: { type: ['domain', 'common'] } } },

            // application: use cases — domain + common
            { from: { type: 'application' }, allow: { to: { type: ['application', 'domain', 'common'] } } },

            // infrastructure: adapters — can use all inner layers
            {
              from: { type: 'infrastructure' },
              allow: { to: { type: ['infrastructure', 'application', 'domain', 'common'] } },
            },

            // gates/phases/tenancy/providers/evidence: cross-cutting within this package
            { from: { type: 'gates' }, allow: { to: { type: ['gates', 'domain', 'application', 'common'] } } },
            { from: { type: 'phases' }, allow: { to: { type: ['phases', 'domain', 'application', 'common'] } } },
            { from: { type: 'tenancy' }, allow: { to: { type: ['tenancy', 'domain', 'common'] } } },
            {
              from: { type: 'providers' },
              allow: { to: { type: ['providers', 'infrastructure', 'domain', 'common'] } },
            },
            { from: { type: 'evidence' }, allow: { to: { type: ['evidence', 'domain', 'application', 'common'] } } },

            // evaluation: stateless Core Evaluation Engine (GT-377/ADR-0101) —
            // canonical contracts + orchestrator; composes domain + application.
            {
              from: { type: 'evaluation' },
              allow: { to: { type: ['evaluation', 'domain', 'application', 'common'] } },
            },

            // Type-only imports are permitted across all layers: erased at compile
            // time, no runtime coupling. VALUE imports stay strictly governed above.
            // (v6: selector-level dependency.kind replaces the legacy rule-level importKind.)
            {
              from: {
                type: [
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
              dependency: { kind: 'type' },
              allow: {
                to: {
                  type: [
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
              },
            },
          ],
        },
      ],

      // Stateless-Core guard (GT-377 AC-3 / ADR-0101): no business-entity repositories.
      'no-restricted-syntax': ['error', STATELESS_CORE_REPOSITORY_BAN],
    },
  },

  // GT-588 — no cryptographic primitives in the domain layer.
  //
  // `boundaries/dependencies` governs imports BETWEEN layers of this package; it has
  // nothing to say about a Node builtin, so before this block "the domain owns the
  // contract, an adapter owns the implementation" was a convention a reviewer had to
  // notice rather than a rule the build applied. The transparency layer is the case
  // that made the difference concrete: the RFC 9162 tree math is domain logic and
  // must be readable without a crypto library in it, while SHA-256 and Ed25519 sit
  // behind `IHasher` / `IStatementSigner` in `infrastructure/transparency`.
  {
    files: ['src/domain/**/*.ts'],
    ignores: [
      '**/*.spec.ts',
      '**/*.test.ts',
      // PRE-EXISTING DEBT, carved out rather than silently un-enforced:
      // `violation.ts` computes its fingerprint with `createHash` directly. Fixing it
      // means threading a digest port through every enforcer adapter that builds a
      // Violation, which is a change of a different shape from this gap. Named here
      // so the exception is visible and countable instead of implied by the rule's
      // absence.
      'src/domain/violation.ts',
    ],
    rules: {
      'no-restricted-imports': ['error', {
        paths: [
          {
            name: 'crypto',
            message:
              'Cryptography is an adapter concern. The domain declares a port (see ' +
              'domain/transparency/ports/hasher.port.ts) and infrastructure/ implements it.',
          },
          {
            name: 'node:crypto',
            message:
              'Cryptography is an adapter concern. The domain declares a port (see ' +
              'domain/transparency/ports/hasher.port.ts) and infrastructure/ implements it.',
          },
        ],
      }],
    },
  },
];
