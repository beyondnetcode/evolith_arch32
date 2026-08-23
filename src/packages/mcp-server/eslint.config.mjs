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
 *   domain            (local MCP domain models)
 *     └─ mcp / tools / resources / watcher (MCP adapters)
 *   common, utils     (cross-cutting helpers — depend on nothing local)
 *
 * This list is the FOLDERS THAT EXIST, deliberately. It previously described an
 * `application` use-case layer and a `core` helper layer, neither of which is on
 * disk; their descriptors matched nothing, so their policies were dead letters.
 * Meanwhile `src/common` and `src/utils` — which do exist and are imported by
 * `mcp` and `tools` — had no descriptor at all, so their files were unclassified
 * (type: null) and `boundaries/dependencies` did not govern a single import into
 * or out of them. A layer named here that is not a folder is not a harmless
 * aspiration: it is a rule that cannot fire.
 *
 * `src/test-doubles` is NOT a layer. It is excluded from tsconfig and wired only
 * through jest's `moduleNameMapper`, so it never enters the compiled graph; it is
 * ignored below rather than classified.
 *
 * Boundary-focused on purpose: this is the `lint:boundaries` config, so it loads
 * only the TypeScript parser (to read import graphs) + eslint-plugin-boundaries,
 * both already declared in package.json. It intentionally does NOT pull in
 * `@typescript-eslint/eslint-plugin` (undeclared here) — general code-quality
 * rules belong in a separate full lint pass, not the architecture guard.
 */
import boundaries from 'eslint-plugin-boundaries';
import tsParser from '@typescript-eslint/parser';

/** Every layer this package classifies — the domain of the type-only exception below. */
const ALL_LAYERS = ['domain', 'mcp', 'tools', 'resources', 'watcher', 'common', 'utils'];

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
      // Test-only doubles: excluded from tsconfig, wired via jest moduleNameMapper.
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
      // Each pattern names the layer FOLDER, never a recursive file glob. Element
      // descriptors match folders, so a recursive glob would make every
      // *sub-folder* its own element and leave the files sitting directly in
      // `src/<layer>/` unclassified (type: null) — silently turning
      // `boundaries/dependencies` into a no-op. eslint-plugin-boundaries v6
      // papered over that with `mode: 'file'`; v7 deprecates `mode` (elements are
      // always folder-based) and a future major removes it, so the workaround is
      // gone from this config rather than left to expire underneath us. These
      // folder patterns were verified to classify the same file set the old
      // `mode: 'file'` descriptors did.
      //
      // Because a broken config fails OPEN, changes here must be re-verified with
      // a deliberate violation (a value import across a forbidden layer must exit
      // 1) and with its `import type` twin (which must still exit 0).
      'boundaries/elements': [
        { type: 'domain', pattern: 'src/domain' },
        { type: 'mcp', pattern: 'src/mcp' },
        { type: 'tools', pattern: 'src/tools' },
        { type: 'resources', pattern: 'src/resources' },
        { type: 'watcher', pattern: 'src/watcher' },
        { type: 'common', pattern: 'src/common' },
        { type: 'utils', pattern: 'src/utils' },
      ],
      'boundaries/ignore': ['src/**/*.spec.ts', 'src/**/*.test.ts', 'src/test-doubles/**'],
    },
    rules: {
      'boundaries/dependencies': [
        'error',
        {
          default: 'disallow',
          // Folder-based elements make every intra-layer import "internal", and
          // internal dependencies are NOT checked by default. Under the previous
          // file-based elements each file was its own element, so intra-layer
          // imports WERE checked — `checkInternals: true` keeps it that way, so
          // the policies below stay the complete description of what is allowed.
          checkInternals: true,
          policies: [
            // domain: innermost local models
            { from: { element: { type: 'domain' } }, allow: { to: { element: { type: ['domain'] } } } },

            // common / utils: cross-cutting helpers. Verified to import nothing
            // local outside themselves (only intra-folder relatives plus external
            // packages), so this is a description, not an aspiration.
            {
              from: { element: { type: 'common' } },
              allow: { to: { element: { type: ['common'] } } },
            },
            {
              from: { element: { type: 'utils' } },
              allow: { to: { element: { type: ['utils'] } } },
            },

            // mcp/tools/resources/watcher: adapters — may use all inner layers.
            // `mcp` is also the composition root: `mcp.module.ts` wires the
            // adapter NestJS modules (e.g. `imports: [ToolsModule]`), so `mcp`
            // is allowed to import `tools` for that module composition.
            {
              from: { element: { type: 'mcp' } },
              allow: { to: { element: { type: ['mcp', 'domain', 'tools', 'common'] } } },
            },
            {
              from: { element: { type: 'tools' } },
              allow: { to: { element: { type: ['tools', 'domain', 'mcp', 'common', 'utils'] } } },
            },
            {
              from: { element: { type: 'resources' } },
              allow: { to: { element: { type: ['resources', 'domain', 'mcp'] } } },
            },
            {
              from: { element: { type: 'watcher' } },
              allow: { to: { element: { type: ['watcher', 'domain'] } } },
            },

            // Type-only imports are permitted across all layers: they are erased
            // at compile time and create NO runtime coupling, so they don't
            // breach the architecture's dependency direction. The guard still
            // enforces VALUE (runtime) imports strictly via the policies above.
            // `dependency.kind` is the supported selector for this (it replaced
            // the legacy rule-level `importKind`, which v7 deprecates). Policies
            // are last-match-wins, so this blanket allowance must stay LAST.
            {
              from: { element: { type: ALL_LAYERS } },
              dependency: { kind: 'type' },
              allow: { to: { element: { type: ALL_LAYERS } } },
            },
          ],
        },
      ],
    },
  },
];
