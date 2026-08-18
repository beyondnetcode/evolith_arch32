/**
 * GT-707 — the single place this CLI resolves `@clack/prompts`.
 *
 * ## Why this file exists
 *
 * `@clack/prompts@1.5.1` is `"type": "module"` and exports exactly one entry point,
 * `./dist/index.mjs`. Node can `require()` that (require(esm) is on by default from
 * Node 20.19 / 22.12), so the npm-installed CLI has always worked. A `pkg` snapshot
 * cannot: its bootstrap replaces `Module.require` with an implementation that has no
 * ESM loader at all, so every packaged binary died with
 *
 *   Error [ERR_REQUIRE_ESM]: require() of ES Module …/@clack/prompts/dist/index.mjs
 *     at Object.<anonymous> (…/dist/infrastructure/prompts/prompt.service.js)
 *
 * before it parsed a single argument — `--help` failed exactly like `init`. Measured:
 * this is the ONLY ESM-only dependency the CLI has (`chalk` 4, `ora` 5, `inquirer` 8
 * and `cli-table3` are all CommonJS), which is why one module can fix it.
 *
 * ## Why the specifier is still `@clack/prompts` on the primary path
 *
 * Roughly two dozen spec files call `jest.mock('@clack/prompts')` by that exact
 * specifier. A shim that loaded a vendored copy FIRST would silently unmock every one
 * of them: the tests would keep passing while asserting against the real library. So
 * the order here is not cosmetic — the package is tried first, and the vendored build
 * is the fallback that only a snapshot ever reaches.
 *
 * ## What the fallback is
 *
 * `scripts/vendor-clack.mjs` runs at build time and writes `dist/vendor/clack.cjs`:
 * the same library bundled to CommonJS by esbuild (~107 kB). It is a literal
 * `require` below so `pkg` includes it in the snapshot by static analysis.
 *
 * If both paths fail the error is re-thrown as-is. A prompt library that cannot load
 * is not something to degrade around: `PromptService` is the CLI's only prompt
 * channel, and pretending otherwise would turn a broken build into a mysteriously
 * non-interactive one.
 */

import type { Option } from '@clack/prompts';

export type { Option };

type Clack = typeof import('@clack/prompts');

function loadClack(): Clack {
  try {
    // The npm path, and the path every test takes. `jest.mock('@clack/prompts')`
    // intercepts THIS require, which is why the mocks keep working unchanged.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('@clack/prompts') as Clack;
  } catch (packageError) {
    // ANY load failure falls through, deliberately. The first version of this file
    // matched on `ERR_REQUIRE_ESM` alone and was measured failing: inside a snapshot
    // the same package answers `MODULE_NOT_FOUND` — "Cannot find module
    // …/@clack/prompts/dist/index.mjs" — because the loader resolves the export map
    // before it discovers it cannot load ESM. Two packagers, two error codes, one
    // cause, and a condition that enumerates codes gets this wrong again next time.
    try {
      // The snapshot path. A literal require so `pkg` includes it by static analysis.
      // `../../vendor/…` and not `./vendor/…`: this file compiles to
      // `dist/infrastructure/prompts/clack.js` while the bundle is written to
      // `dist/vendor/`. The first version got that wrong, the fallback threw
      // MODULE_NOT_FOUND of its own, and the rethrow below hid it behind the package's
      // error — which is why the rethrow now names both.
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      return require('../../vendor/clack.cjs') as Clack;
    } catch (vendorError) {
      // Both paths failed, so neither error alone explains it. Naming both is the
      // difference between a five-minute diagnosis and the one that cost this row a
      // packaging round trip.
      throw new Error(
        `@clack/prompts could not be loaded. Package: ${(packageError as Error)?.message}. ` +
          `Vendored CommonJS build: ${(vendorError as Error)?.message}.`,
      );
    }
  }
}

/**
 * The prompt library, however this process is able to load it.
 *
 * Imported as `import { clack as p } from './clack'` so the call sites keep reading
 * `p.intro(...)`, `p.spinner()`, `p.isCancel(...)` exactly as they did against the
 * package itself.
 */
export const clack: Clack = loadClack();
