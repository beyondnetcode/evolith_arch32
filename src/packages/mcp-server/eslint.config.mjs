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
 *   domain  (local MCP domain models)
 *     └─ application (MCP use cases)
 *         └─ mcp / tools / resources / watcher (MCP adapters)
 *   core    (local cross-cutting helpers)
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
      // mode: 'file' — each .ts file is an element instance of its layer. The
      // default 'folder' mode treats every *sub-folder* as a separate element and
      // leaves files sitting directly in `src/<layer>/` unclassified (type: null),
      // which silently makes `boundaries/element-types` a no-op. 'file' is the
      // correct mode for layer-based boundaries and makes the guard actually fire.
      'boundaries/elements': [
        { type: 'domain', mode: 'file', pattern: 'src/domain/**/*' },
        { type: 'application', mode: 'file', pattern: 'src/application/**/*' },
        { type: 'mcp', mode: 'file', pattern: 'src/mcp/**/*' },
        { type: 'tools', mode: 'file', pattern: 'src/tools/**/*' },
        { type: 'resources', mode: 'file', pattern: 'src/resources/**/*' },
        { type: 'watcher', mode: 'file', pattern: 'src/watcher/**/*' },
        { type: 'core', mode: 'file', pattern: 'src/core/**/*' },
      ],
      'boundaries/ignore': ['src/**/*.spec.ts', 'src/**/*.test.ts'],
    },
    rules: {
      'boundaries/dependencies': [
        'error',
        {
          default: 'disallow',
          rules: [
            // domain: innermost local models
            { from: { type: 'domain' }, allow: { to: { type: ['domain'] } } },

            // application: may use local domain
            { from: { type: 'application' }, allow: { to: { type: ['application', 'domain'] } } },

            // mcp/tools/resources/watcher: adapters — may use all inner layers.
            // `mcp` is also the composition root: `mcp.module.ts` wires the
            // adapter NestJS modules (e.g. `imports: [ToolsModule]`), so `mcp`
            // is allowed to import `tools` for that module composition.
            { from: { type: 'mcp' }, allow: { to: { type: ['mcp', 'application', 'domain', 'tools'] } } },
            { from: { type: 'tools' }, allow: { to: { type: ['tools', 'application', 'domain', 'mcp'] } } },
            { from: { type: 'resources' }, allow: { to: { type: ['resources', 'application', 'domain', 'mcp'] } } },
            { from: { type: 'watcher' }, allow: { to: { type: ['watcher', 'application', 'domain'] } } },
            { from: { type: 'core' }, allow: { to: { type: ['core', 'domain'] } } },

            // Type-only imports are permitted across all layers: they are erased
            // at compile time and create NO runtime coupling, so they don't
            // breach the architecture's dependency direction. The guard still
            // enforces VALUE (runtime) imports strictly via the rules above.
            // (v6: selector-level dependency.kind replaces the legacy rule-level importKind.)
            {
              from: { type: ['domain', 'application', 'mcp', 'tools', 'resources', 'watcher', 'core'] },
              dependency: { kind: 'type' },
              allow: { to: { type: ['domain', 'application', 'mcp', 'tools', 'resources', 'watcher', 'core'] } },
            },
          ],
        },
      ],
    },
  },
];
