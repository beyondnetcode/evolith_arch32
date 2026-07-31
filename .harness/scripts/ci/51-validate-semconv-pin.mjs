#!/usr/bin/env node

/**
 * GT-587 criterion 3 — the pinned OpenTelemetry semconv revision is DECLARED, and a
 * drift in it is a red build.
 *
 * ## Why a pin needs a guard at all
 *
 * The GenAI semantic conventions are Development-status: upstream may rename or drop an
 * attribute between releases. Evolith emits `gen_ai.*` and `mcp.*` names from
 * `src/packages/core-domain/src/evaluation/telemetry/semconv.ts`, as plain literals —
 * the Core is pure and must not import an observability SDK (rule HXA-05). Literals do
 * not move when upstream moves. So the failure this guard exists to catch is not loud:
 * the build stays green, the tests stay green, and the emitted telemetry quietly stops
 * being the standard it claims to be. That is a SECOND private vocabulary wearing the
 * costume of a standard one, which is worse than the private names it replaced.
 *
 * ## What it checks (three rules, each able to go red on its own)
 *
 *   1. **Version pin.** `SEMCONV_VERSION` must equal the `@opentelemetry/semantic-conventions`
 *      version resolved in `package-lock.json`. Reading the LOCKFILE, not `node_modules`,
 *      is deliberate: the lockfile is committed, so the check answers the same way on a
 *      machine that has never run `npm install`, and cannot be made green by local state.
 *   2. **Literal agreement.** Every symbol declared `exported` in `PINNED_SEMCONV_ATTRIBUTES`
 *      must exist in the installed package with EXACTLY our value. A rename upstream, or a
 *      typo here, fails.
 *   3. **Manifest completeness.** Every `ATTR_*` / `EVENT_*` / `MCP_*_VALUE_*` constant the
 *      module exports must appear in the manifest. Without this rule a new literal could be
 *      added and never checked — the manifest would still pass while covering less.
 *
 * `registry-only` symbols (in the upstream registry, not yet exported by the package at the
 * pinned version) are the interesting third state: they are ALLOWED to be missing, and they
 * FAIL the day the package starts exporting them with a different value. That is exactly the
 * moment a locally-declared literal silently becomes wrong.
 *
 * ## Anti-vacuous pass
 *
 * Zero pinned symbols, or a semconv module that cannot be read, is a hard exit 1 through the
 * repository's own `assertScanned` — never "nothing to check, all good". `resolve()` is
 * fail-closed, so a moved file is a loud error rather than an empty corpus.
 *
 * Usage:
 *   node .harness/scripts/ci/51-validate-semconv-pin.mjs
 *   node .harness/scripts/ci/51-validate-semconv-pin.mjs --verbose
 */

import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import { assertScanned } from '../lib/coverage.mjs';
import { resolve } from '../lib/paths.mjs';

const GUARD = '51-validate-semconv-pin';
const VERBOSE = process.argv.slice(2).includes('--verbose');

/** Path KEY, not a literal — `lib/paths.mjs` owns the location and fails closed if it moves. */
const SEMCONV_MODULE_KEY = 'semconvPin';
const SEMCONV_PACKAGE = '@opentelemetry/semantic-conventions';
const LOCKFILE_KEY = `node_modules/${SEMCONV_PACKAGE}`;

const require_ = createRequire(import.meta.url);

/**
 * Load the pinned vocabulary from SOURCE.
 *
 * Not from `dist/`: that is gitignored build output, so a check reading it would be
 * measuring whatever the last local build happened to leave behind. TypeScript is a
 * declared dependency of this repository, so transpiling the source is both hermetic
 * and exact — a hand-rolled regex over `export const` lines would drift the first time
 * someone writes a multi-line declaration.
 */
function loadPinnedVocabulary(file) {
  const ts = require_('typescript');
  const source = readFileSync(file, 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  const module_ = { exports: {} };
  runInNewContext(outputText, { module: module_, exports: module_.exports, require: require_ });
  return module_.exports;
}

/** Version `npm ci` would install — read from the committed lockfile, not node_modules. */
function lockedSemconvVersion() {
  const lock = JSON.parse(readFileSync(resolve('rootPackageLock'), 'utf8'));
  return lock.packages?.[LOCKFILE_KEY]?.version;
}

function main() {
  const modulePath = resolve(SEMCONV_MODULE_KEY);
  const vocabulary = loadPinnedVocabulary(modulePath);

  const pinned = vocabulary.PINNED_SEMCONV_ATTRIBUTES ?? [];
  assertScanned(pinned.length, {
    what: 'pinned semconv symbols',
    where: `${SEMCONV_MODULE_KEY} → PINNED_SEMCONV_ATTRIBUTES`,
  });

  const violations = [];

  // --- Rule 1: the declared revision is the revision the lockfile installs ---------
  const declared = vocabulary.SEMCONV_VERSION;
  const locked = lockedSemconvVersion();
  if (!locked) {
    violations.push(
      `${SEMCONV_PACKAGE} is not present in package-lock.json under '${LOCKFILE_KEY}'.\n` +
        `      The pin cannot be verified against anything, which is indistinguishable from\n` +
        `      not being pinned. Declare the dependency or remove the pin.`,
    );
  } else if (declared !== locked) {
    violations.push(
      `SEMCONV_VERSION drift: the module declares '${declared}', the lockfile installs '${locked}'.\n` +
        `      The GenAI conventions are Development-status, so an upgrade may have renamed or\n` +
        `      dropped an attribute. Re-verify every literal in PINNED_SEMCONV_ATTRIBUTES against\n` +
        `      ${SEMCONV_PACKAGE}@${locked}, THEN bump SEMCONV_VERSION — never the other way round.`,
    );
  }

  // --- Rule 2: each pinned literal still matches upstream --------------------------
  let upstream;
  try {
    upstream = require_(`${SEMCONV_PACKAGE}/incubating`);
  } catch (err) {
    violations.push(
      `cannot load '${SEMCONV_PACKAGE}/incubating' (${err.message}).\n` +
        `      Without it the literals are unverifiable. This is a failure, not a skip: a check\n` +
        `      that quietly passes when it cannot look is the defect it was written to prevent.`,
    );
    upstream = undefined;
  }

  let compared = 0;
  if (upstream) {
    for (const symbol of pinned) {
      const actual = upstream[symbol.exportName];
      if (symbol.upstream === 'exported') {
        compared += 1;
        if (actual === undefined) {
          violations.push(
            `${symbol.exportName} is declared 'exported' but ${SEMCONV_PACKAGE}@${locked} no longer\n` +
              `      exports it. Evolith is emitting '${symbol.value}' against a convention that moved.`,
          );
        } else if (actual !== symbol.value) {
          violations.push(
            `${symbol.exportName} drift: pinned as '${symbol.value}', upstream now '${actual}'.\n` +
              `      Update the literal in the ${SEMCONV_MODULE_KEY} module and everything that asserts on it.`,
          );
        }
      } else if (symbol.upstream === 'registry-only') {
        if (actual !== undefined) {
          compared += 1;
          if (actual !== symbol.value) {
            violations.push(
              `${symbol.exportName} was declared 'registry-only' (locally spelled '${symbol.value}')\n` +
                `      and upstream now exports it as '${actual}'. The local spelling is wrong from this\n` +
                `      release onwards. Adopt the upstream value and change upstream: 'exported'.`,
            );
          }
        }
      } else {
        violations.push(`${symbol.exportName} has an unknown upstream status '${symbol.upstream}'.`);
      }
    }
  }

  // --- Rule 3: the manifest covers every literal the module exports ----------------
  const manifestNames = new Set(pinned.map((s) => s.exportName));
  const declaredConstants = Object.keys(vocabulary).filter(
    (k) => k.startsWith('ATTR_') || k.startsWith('EVENT_') || /^MCP_[A-Z_]+_VALUE_/.test(k),
  );
  assertScanned(declaredConstants.length, {
    what: 'exported semconv constants',
    where: SEMCONV_MODULE_KEY,
  });
  for (const name of declaredConstants) {
    if (!manifestNames.has(name)) {
      violations.push(
        `${name} is exported but absent from PINNED_SEMCONV_ATTRIBUTES, so nothing checks it\n` +
          `      against upstream. Add it to the manifest with its upstream status.`,
      );
    }
  }

  if (violations.length > 0) {
    console.error(`✗ ${GUARD}: ${violations.length} finding(s)\n`);
    for (const v of violations) console.error(`  • ${v}\n`);
    process.exit(1);
  }

  console.log(`✅ ${GUARD}`);
  console.log(`  pinned revision .... ${declared} (lockfile: ${locked})`);
  console.log(`  symbols pinned ..... ${pinned.length}`);
  console.log(`  compared upstream .. ${compared}`);
  console.log(`  registry-only ...... ${pinned.filter((s) => s.upstream === 'registry-only').length} (allowed to be absent upstream)`);
  if (VERBOSE) {
    for (const s of pinned) console.log(`    • ${s.exportName} = ${s.value} [${s.upstream}]`);
  }
}

main();
