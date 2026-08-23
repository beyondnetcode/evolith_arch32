// @ts-check
/**
 * ESLint flat config for @beyondnet/evolith-mcp (ESLint 9+).
 *
 * Migrated from the legacy `.eslintrc.js` + `--no-eslintrc -c .eslintrc.js`
 * invocation, which is incompatible with ESLint 9 (the `--no-eslintrc` flag was
 * removed and the legacy eslintrc loader broke eslint-plugin-boundaries with
 * "Cannot set properties of undefined (setting defaultMeta)"). Mirrors the
 * boundary-focused flat config adopted for @beyondnet/evolith-core-domain (GT-377 AC-3).
 *
 * Enforces that mcp-server sits between core-domain and apps:
 *   - MAY import from @beyondnet/evolith-core-domain (external npm package — unrestricted)
 *   - MUST NOT import from apps/ (core-api)
 *
 * Internal layer hierarchy (imports may only flow inward):
 *   domain     (local MCP domain models)
 *     └─ mcp / tools / resources / watcher (MCP adapters)
 *         └─ bootstrap (composition root: main.ts, app.module.ts, tracing.ts)
 *   core       (local cross-cutting helpers, importable by any layer above)
 *
 * There is no `application` layer in this package — MCP use cases live directly
 * in the adapter layers. Descriptors for `src/application` and `src/core` were
 * declared here for a long time, but NEITHER FOLDER HAS EVER EXISTED, so both
 * policies were dead. Worse, the three folders that do exist (`src/common`,
 * `src/utils`, `src/test-doubles`) had no descriptor at all, so their files were
 * unclassified and `boundaries/dependencies` governed neither imports out of
 * them nor imports into them — silently, because a boundaries misconfiguration
 * fails OPEN (reports nothing, exits 0). Fixed by pointing `core` at the folders
 * that actually hold the cross-cutting helpers, dropping the `application`
 * descriptor rather than backing it with an invented empty folder, classifying
 * the `src/*.ts` composition root as `bootstrap`, and ignoring `src/test-doubles`
 * (test scaffolding, like the *.spec.ts files it exists to serve).
 *
 * Requires eslint-plugin-boundaries v7 (declared as ^7.2.0 in package.json).
 * The v7-native settings/selectors below (`boundaries/files`, `policies`, entity
 * selectors) are rejected outright by v6 with a schema error, so a stale v6
 * install fails LOUD (exit 2) rather than silently disabling the guard.
 *
 * Boundary-focused on purpose: this is the `lint:boundaries` config, so it loads
 * only the TypeScript parser (to read import graphs) + eslint-plugin-boundaries,
 * both already declared in package.json. It intentionally does NOT pull in
 * `@typescript-eslint/eslint-plugin` (undeclared here) — general code-quality
 * rules belong in a separate full lint pass, not the architecture guard.
 */
import boundaries from 'eslint-plugin-boundaries';
import tsParser from '@typescript-eslint/parser';

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
      // Test doubles are scaffolding for the specs above (a stub
      // @nestjs/cache-manager), not a production layer — ignore, don't classify.
      'src/test-doubles/**',
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
      // Resolve TypeScript imports so boundaries can classify each import target.
      // The default node resolver only tries .js/.json, leaving extensionless
      // `.ts` imports unresolved (target type: null) — which silently disables
      // cross-layer detection. eslint-plugin-boundaries bundles
      // eslint-import-resolver-node; we just widen its extension list.
      'import/resolver': {
        node: { extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'] },
      },
      // Elements are FOLDERS in v7: a descriptor names the layer folder and every
      // file beneath it belongs to that layer. (v6 needed `mode: 'file'` to stop
      // the old default from treating each sub-folder as its own element; v7
      // deprecated `mode`, and plain folder patterns give the layer semantics we
      // want directly.)
      'boundaries/elements': [
        { type: 'domain', pattern: 'src/domain' },
        { type: 'mcp', pattern: 'src/mcp' },
        { type: 'tools', pattern: 'src/tools' },
        { type: 'resources', pattern: 'src/resources' },
        { type: 'watcher', pattern: 'src/watcher' },
        // Cross-cutting helpers. Two folders, one layer: `common` holds the
        // envelope/error/logging primitives and `utils` the path-security
        // helpers; both depend only on node builtins and npm packages.
        { type: 'core', pattern: 'src/common' },
        { type: 'core', pattern: 'src/utils' },
      ],
      // Composition root: main.ts, app.module.ts, tracing.ts sit directly in
      // `src/` and so belong to no layer folder. They are classified with a FILE
      // descriptor rather than an element one — element patterns are folder
      // patterns, and a file-extension pattern like `src/*.ts` in
      // `boundaries/elements` is exactly what v7 warns about.
      'boundaries/files': [{ pattern: 'src/*.ts', category: 'bootstrap' }],
      'boundaries/ignore': ['src/**/*.spec.ts', 'src/**/*.test.ts', 'src/test-doubles/**'],
    },
    rules: {
      'boundaries/dependencies': [
        'error',
        {
          default: 'disallow',
          // v7: `policies` (was `rules`), and every selector is an ENTITY
          // selector — `{ element: { type } }` / `{ file: { category } }` —
          // rather than the bare `{ type }` shorthand v6 accepted.
          policies: [
            // domain: innermost local models. Deliberately NOT allowed to reach
            // `core`: keeping the `core -> domain` edge one-way avoids declaring
            // a cycle. (Neither direction is exercised today.)
            { from: { element: { type: 'domain' } }, allow: { to: { element: { type: ['domain'] } } } },

            // mcp/tools/resources/watcher: adapters — may use all inner layers
            // plus the cross-cutting `core` helpers.
            // `mcp` is also the module composition point: `mcp.module.ts` wires
            // the adapter NestJS modules (e.g. `imports: [ToolsModule]`), so
            // `mcp` is allowed to import `tools` for that module composition.
            {
              from: { element: { type: 'mcp' } },
              allow: { to: { element: { type: ['mcp', 'domain', 'tools', 'core'] } } },
            },
            {
              from: { element: { type: 'tools' } },
              allow: { to: { element: { type: ['tools', 'domain', 'mcp', 'core'] } } },
            },
            {
              from: { element: { type: 'resources' } },
              allow: { to: { element: { type: ['resources', 'domain', 'mcp', 'core'] } } },
            },
            {
              from: { element: { type: 'watcher' } },
              allow: { to: { element: { type: ['watcher', 'domain', 'core'] } } },
            },

            // core: cross-cutting helpers. May not reach any adapter layer —
            // that is the edge the missing descriptor used to let through.
            { from: { element: { type: 'core' } }, allow: { to: { element: { type: ['core', 'domain'] } } } },

            // bootstrap: the composition root wires everything, so it may reach
            // every layer. Selected by file CATEGORY (it has no element type),
            // and nothing may import it back (default: disallow).
            {
              from: { file: { categories: ['bootstrap'] } },
              allow: {
                to: {
                  element: { type: ['mcp', 'tools', 'resources', 'watcher', 'domain', 'core'] },
                },
              },
            },
            { from: { file: { categories: ['bootstrap'] } }, allow: { to: { file: { categories: ['bootstrap'] } } } },

            // Type-only imports are permitted across all layers: they are erased
            // at compile time and create NO runtime coupling, so they don't
            // breach the architecture's dependency direction. The guard still
            // enforces VALUE (runtime) imports strictly via the policies above.
            {
              from: { element: { type: ['domain', 'mcp', 'tools', 'resources', 'watcher', 'core'] } },
              dependency: { kind: 'type' },
              allow: {
                to: { element: { type: ['domain', 'mcp', 'tools', 'resources', 'watcher', 'core'] } },
              },
            },
            {
              from: { element: { type: ['domain', 'mcp', 'tools', 'resources', 'watcher', 'core'] } },
              dependency: { kind: 'type' },
              allow: { to: { file: { categories: ['bootstrap'] } } },
            },
          ],
        },
      ],
    },
  },
];
