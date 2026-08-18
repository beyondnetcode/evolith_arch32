/**
 * GT-707 — the single place this CLI resolves `conf`.
 *
 * Same shape and same reason as `infrastructure/prompts/clack.ts`: `conf@15.1.0` is
 * `"type": "module"`, Node can `require()` it and a `pkg` snapshot cannot, so the
 * packaged binary failed on it too. It was NOT in this row's first evidence, because
 * that measurement probed `require('<dep>/package.json')` — which `conf` refuses with
 * `ERR_PACKAGE_PATH_NOT_EXPORTED`, an error that reads like "fine". Reading the
 * manifests from disk instead found three ESM-only direct dependencies, of which two
 * are actually loaded at runtime.
 *
 * The package is tried FIRST so `jest.mock('conf', …)` in `config.service.spec.ts`
 * keeps intercepting the same specifier it always has; the vendored CommonJS build is
 * the fallback only a snapshot reaches.
 */

import type ConfType from 'conf';

type ConfCtor = typeof ConfType;

/**
 * The INSTANCE type, re-exported so call sites can keep writing
 * `private config: ConfInstance<…>` without importing the ESM package for a type.
 */
export type ConfInstance<T extends Record<string, unknown>> = ConfType<T>;

function loadConf(): ConfCtor {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('conf');
    return (mod?.default ?? mod) as ConfCtor;
  } catch (packageError) {
    // Any load failure falls through — see the note in `prompts/clack.ts`: a snapshot
    // reports the same cause as `MODULE_NOT_FOUND` under one packager and
    // `ERR_REQUIRE_ESM` under another, so matching on a code is how this breaks again.
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const mod = require('../../vendor/conf.cjs');
      return (mod?.default ?? mod) as ConfCtor;
    } catch (vendorError) {
      throw new Error(
        `conf could not be loaded. Package: ${(packageError as Error)?.message}. ` +
          `Vendored CommonJS build: ${(vendorError as Error)?.message}.`,
      );
    }
  }
}

/** The `conf` constructor, however this process is able to load it. */
export const Conf: ConfCtor = loadConf();
