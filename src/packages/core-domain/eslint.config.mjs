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
 * Real-enforcement notes (element patterns + resolver) — get either wrong and the
 * rule degrades to a SILENT no-op that reports nothing and exits 0:
 *
 *  - Element patterns name the layer FOLDER (`src/domain`), never a recursive
 *    file glob. Element descriptors match folders, so a recursive glob makes
 *    every *sub-folder* its own element and leaves the files sitting directly
 *    in `src/<layer>/` unclassified (type: null) — the hole that silences the
 *    rule. eslint-plugin-boundaries v6 papered over that with `mode: 'file'`;
 *    v7 deprecates `mode` (elements are always folder-based) and a future major
 *    removes it, so the workaround is gone from this config rather than left to
 *    expire underneath us. These folder patterns were verified to classify the
 *    same file set the old `mode: 'file'` descriptors did.
 *  - The `import/resolver` extension list lets boundaries resolve extensionless
 *    `.ts` import targets so cross-layer imports are actually detected.
 *
 * Because a broken config fails OPEN, changes here must be re-verified with a
 * deliberate violation (a value import across a forbidden layer must exit 1)
 * and with its `import type` twin (which must still exit 0).
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

/** Every layer this package classifies — the domain of the type-only exception below. */
const ALL_LAYERS = [
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
];

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
        { type: 'common', pattern: 'src/common' },
        { type: 'domain', pattern: 'src/domain' },
        { type: 'application', pattern: 'src/application' },
        { type: 'infrastructure', pattern: 'src/infrastructure' },
        { type: 'gates', pattern: 'src/gates' },
        { type: 'phases', pattern: 'src/phases' },
        { type: 'tenancy', pattern: 'src/tenancy' },
        { type: 'providers', pattern: 'src/providers' },
        { type: 'evidence', pattern: 'src/evidence' },
        { type: 'evaluation', pattern: 'src/evaluation' },
      ],
      'boundaries/ignore': ['src/**/*.spec.ts', 'src/**/*.test.ts'],
    },
    rules: {
      'boundaries/dependencies': [
        'error',
        {
          default: 'disallow',
          // Folder-based elements make every intra-layer import "internal", and
          // internal dependencies are NOT checked by default. Under the previous
          // file-based elements each file was its own element, so intra-layer
          // imports WERE checked — `checkInternals: true` keeps it that way.
          // Without it the `common` policy below (which allows nothing, not even
          // `common` itself) would quietly stop applying.
          checkInternals: true,
          policies: [
            // common: no internal imports
            { from: { element: { type: 'common' } }, allow: { to: { element: { type: [] } } } },

            // domain: innermost — only common
            {
              from: { element: { type: 'domain' } },
              allow: { to: { element: { type: ['domain', 'common'] } } },
            },

            // application: use cases — domain + common
            {
              from: { element: { type: 'application' } },
              allow: { to: { element: { type: ['application', 'domain', 'common'] } } },
            },

            // infrastructure: adapters — can use all inner layers
            {
              from: { element: { type: 'infrastructure' } },
              allow: {
                to: { element: { type: ['infrastructure', 'application', 'domain', 'common'] } },
              },
            },

            // gates/phases/tenancy/providers/evidence: cross-cutting within this package
            {
              from: { element: { type: 'gates' } },
              allow: { to: { element: { type: ['gates', 'domain', 'application', 'common'] } } },
            },
            {
              from: { element: { type: 'phases' } },
              allow: { to: { element: { type: ['phases', 'domain', 'application', 'common'] } } },
            },
            {
              from: { element: { type: 'tenancy' } },
              allow: { to: { element: { type: ['tenancy', 'domain', 'common'] } } },
            },
            {
              from: { element: { type: 'providers' } },
              allow: {
                to: { element: { type: ['providers', 'infrastructure', 'domain', 'common'] } },
              },
            },
            {
              from: { element: { type: 'evidence' } },
              allow: { to: { element: { type: ['evidence', 'domain', 'application', 'common'] } } },
            },

            // evaluation: stateless Core Evaluation Engine (GT-377/ADR-0101) —
            // canonical contracts + orchestrator; composes domain + application.
            {
              from: { element: { type: 'evaluation' } },
              allow: {
                to: { element: { type: ['evaluation', 'domain', 'application', 'common'] } },
              },
            },

            // Type-only imports are permitted across all layers: erased at compile
            // time, no runtime coupling. VALUE imports stay strictly governed above.
            // `dependency.kind` is the supported selector for this (it replaced the
            // legacy rule-level `importKind`, which v7 deprecates). Policies are
            // last-match-wins, so this blanket allowance must stay LAST.
            {
              from: { element: { type: ALL_LAYERS } },
              dependency: { kind: 'type' },
              allow: { to: { element: { type: ALL_LAYERS } } },
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
