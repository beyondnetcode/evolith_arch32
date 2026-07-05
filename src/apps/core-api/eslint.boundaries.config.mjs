// @ts-check
/**
 * ESLint flat config for core-api ARCHITECTURE BOUNDARIES (ESLint 9+).
 *
 * Dedicated, boundary-focused config consumed by the `lint:boundaries` script
 * (`eslint <src ts glob> -c eslint.boundaries.config.mjs`). It replaces the
 * legacy `.eslintrc.js` + `--no-eslintrc` invocation, which is incompatible with
 * ESLint 9 (the `--no-eslintrc` flag was removed and the legacy eslintrc loader
 * broke eslint-plugin-boundaries). Mirrors the boundary-only pattern adopted for
 * @beyondnet/evolith-core-domain (GT-377 AC-3) and @beyondnet/evolith-mcp.
 *
 * Why a SEPARATE file (not folded into the existing `eslint.config.mjs`):
 * core-api's `eslint.config.mjs` is a full type-checked config (recommended
 * type-checked + prettier + complexity) consumed by the `lint` script with
 * `--fix`. Running it over `src` without `--fix` surfaces hundreds of
 * pre-existing formatting/type findings that are unrelated to architecture
 * boundaries — so the boundary GATE must not depend on that backlog. This config
 * only parses the import graph (no type-aware services) and enforces the layer
 * rules: fast, deterministic, and green independent of lint debt.
 *
 * core-api is the outermost layer:
 *   - MAY import from @beyondnet/evolith-core-domain and @beyondnet/evolith-mcp (external npm)
 *   - Internal layers may import only from layers below them.
 *
 * Internal layer hierarchy (imports may only flow inward):
 *   application (use cases / services)
 *     └─ infrastructure (DB, HTTP clients, external integrations)
 *         └─ presentation (controllers, DTOs)
 *   openapi (API spec / decorators — cross-cutting)
 */
import boundaries from 'eslint-plugin-boundaries';
import tseslint from 'typescript-eslint';

export default [
  {
    ignores: [
      'dist/**',
      'coverage/**',
      'node_modules/**',
      'test/**',
      // Tests are not subject to layer boundaries (mirrors the original
      // `boundaries/ignore`). Excluding them at the ESLint level also avoids
      // "rule not found" errors from inline eslint-disable directives that
      // reference plugins (e.g. @typescript-eslint/*) loaded only by the full
      // `lint` config, not by this boundary-only config.
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
      parser: tseslint.parser,
      ecmaVersion: 2022,
      sourceType: 'module',
    },
    settings: {
      // Resolve TypeScript imports so boundaries can classify the *target* of
      // each import. The default node resolver only tries .js/.json, leaving
      // extensionless `.ts` imports unresolved (target type: null) — which
      // silently disables cross-layer detection. eslint-plugin-boundaries bundles
      // eslint-import-resolver-node; we just widen its extension list.
      'import/resolver': {
        node: { extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'] },
      },
      // mode: 'file' — each .ts file is an element instance of its layer. The
      // default 'folder' mode treats every *sub-folder* as a separate element and
      // leaves files sitting directly in `src/<layer>/` unclassified (type: null),
      // silently turning `boundaries/element-types` into a no-op. 'file' is the
      // correct mode for layer-based boundaries and makes the guard actually fire.
      'boundaries/elements': [
        { type: 'application', mode: 'file', pattern: 'src/application/**/*' },
        { type: 'infrastructure', mode: 'file', pattern: 'src/infrastructure/**/*' },
        { type: 'presentation', mode: 'file', pattern: 'src/presentation/**/*' },
        { type: 'openapi', mode: 'file', pattern: 'src/openapi/**/*' },
      ],
      'boundaries/ignore': ['src/**/*.spec.ts', 'src/**/*.test.ts'],
    },
    rules: {
      'boundaries/dependencies': [
        'error',
        {
          default: 'disallow',
          rules: [
            // application: innermost app layer
            { from: { type: 'application' }, allow: { to: { type: ['application'] } } },

            // infrastructure: adapters — may use application
            {
              from: { type: 'infrastructure' },
              allow: { to: { type: ['infrastructure', 'application'] } },
            },

            // presentation: controllers — outermost, may use all
            {
              from: { type: 'presentation' },
              allow: { to: { type: ['presentation', 'infrastructure', 'application', 'openapi'] } },
            },

            // openapi: cross-cutting decorators/specs
            { from: { type: 'openapi' }, allow: { to: { type: ['openapi', 'application'] } } },

            // Type-only imports are permitted across all layers: they are erased
            // at compile time and create NO runtime coupling, so they don't
            // breach the architecture's dependency direction. The guard still
            // enforces VALUE (runtime) imports strictly via the rules above.
            // (e.g. an application service may reference a DTO/`z.infer` type
            // from another layer via `import type`, but never import its values.)
            {
              from: { type: ['application', 'infrastructure', 'presentation', 'openapi'] },
              dependency: { kind: 'type' },
              allow: { to: { type: ['application', 'infrastructure', 'presentation', 'openapi'] } },
            },
          ],
        },
      ],
    },
  },
];
