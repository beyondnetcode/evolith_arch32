#!/usr/bin/env node
/**
 * GT-686 — an envelope's `durationMs` is a measurement, never a literal.
 *
 * WHY THIS EXISTS
 * The ADR-0073 envelope declares `meta.durationMs` as "wall-clock execution
 * time in milliseconds" and its schema permits `minimum: 0`. Forty-seven
 * production sites (counted 2026-08-14, re-counted 2026-09-19) satisfied the
 * schema by shipping the literal `durationMs: 0` — the CLI base class, most CLI
 * commands, several MCP tools and three REST controllers — while one neighbour
 * (`gate.command.ts`) did it right with `Date.now() - startedAt`. A consumer
 * reading `meta.durationMs` got a plausible number and could not tell it was
 * fabricated. A constant where a measurement is declared reports an agreement
 * it never checked.
 *
 * WHAT IT CHECKS — two halves, because each alone is gameable
 *   1. STATIC: no non-spec TypeScript file under `src/` contains the literal
 *      `durationMs: 0` (or `durationMs:0`) outside a comment. Spec files are
 *      excluded on purpose: a test that asserts the envelope shape may well
 *      construct one. A site that is a genuine zero-duration path may be listed
 *      in {@link ALLOWED_ZERO_SITES} WITH a reason; the list is empty today and
 *      is expected to stay so.
 *   2. EXECUTED: the built CLI runs a real command with `--format json` and the
 *      envelope's `meta.durationMs` must be `> 0`. This is what makes the guard
 *      reject a zero as a VALUE from a run whose wall clock moved, rather than
 *      merely policing the source text: a helper that computed `0 * elapsed`
 *      would pass the static half and fail here. Skipped — loudly, and only
 *      with `--allow-unbuilt` — when the CLI has not been built, so a source-only
 *      checkout can still run the static half.
 *
 * ANTI-VACUOUS PASS
 * Zero TypeScript files scanned is a hard failure through `assertScanned`, and
 * the executed half asserts it observed exactly one envelope.
 *
 * Usage:
 *   node .harness/scripts/ci/72-validate-measured-duration.mjs
 *   node .harness/scripts/ci/72-validate-measured-duration.mjs --verbose
 *   node .harness/scripts/ci/72-validate-measured-duration.mjs --allow-unbuilt
 *   node .harness/scripts/ci/72-validate-measured-duration.mjs --root <dir>
 *
 * Exit codes:
 *   0 - no literal zero outside the allow-list, and the executed envelope measured > 0
 *   1 - a literal zero was found, the executed envelope reported 0, or nothing was scanned
 */

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

import { REPO_ROOT } from '../lib/paths.mjs';
import { assertScanned, ZeroCoverageError } from '../lib/coverage.mjs';

const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'build', 'coverage', '.claude', '.out']);

/**
 * Sites where a zero is a genuine, stated measurement rather than a stand-in.
 * Each entry is `{ file, reason }` with `file` relative to the repository root.
 * Empty on purpose: every site found on 2026-09-19 could measure, and did.
 */
export const ALLOWED_ZERO_SITES = Object.freeze([]);

/** The literal the guard rejects. Anchored on the key so `maxDurationMs: 0` does not match. */
const LITERAL = /(^|[^A-Za-z0-9_$])durationMs\s*:\s*0(?![.\dxXeE_])/;

/** Every non-spec TypeScript source under `src/`, discovered rather than listed. */
export function findSourceFiles(root) {
  const found = [];
  (function walk(dir) {
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        if (SKIP_DIRS.has(entry.name)) continue;
        if (existsSync(join(full, '.git'))) continue;
        walk(full);
      } else if (
        entry.name.endsWith('.ts') &&
        !entry.name.endsWith('.d.ts') &&
        !entry.name.endsWith('.spec.ts') &&
        !entry.name.endsWith('.test.ts')
      ) {
        found.push(relative(root, full));
      }
    }
  })(join(root, 'src'));
  return found.sort();
}

/**
 * Strip `//` and `/* *\/` comments so prose about the defect does not trip the
 * check. Strings are left alone: a literal inside a string is not an envelope.
 */
export function stripComments(text) {
  return text.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' ')).replace(/(^|[^:])\/\/[^\n]*/g, (m, lead) => lead);
}

/** Lines (1-based) of `text` that carry the literal, comments excluded. Pure. */
export function literalZeroLines(text) {
  const lines = stripComments(text).split('\n');
  const hits = [];
  for (const [i, line] of lines.entries()) if (LITERAL.test(line)) hits.push(i + 1);
  return hits;
}

/** The static half over a tree. Returns `{ scanned, findings }`. */
export function scanTree(root) {
  const files = findSourceFiles(root);
  const allowed = new Map(ALLOWED_ZERO_SITES.map((s) => [s.file, s.reason]));
  const findings = [];
  for (const file of files) {
    const lines = literalZeroLines(readFileSync(join(root, file), 'utf8'));
    if (lines.length === 0) continue;
    if (allowed.has(file)) continue;
    findings.push({ file, lines });
  }
  return { scanned: files.length, findings };
}

/** Where the built CLI entry point lives, if it has been built. */
export function cliEntry(root) {
  const entry = join(root, 'src', 'sdk', 'cli', 'dist', 'main.js');
  return existsSync(entry) && statSync(entry).isFile() ? entry : null;
}

/**
 * The executed half: run one real command and read back `meta.durationMs`.
 * `evolith rulesets --format json` is chosen because it reads the corpus
 * (real work, so the clock moves) and needs nothing but `--core`.
 */
export function probeCli(root, entry) {
  const res = spawnSync(process.execPath, [entry, 'rulesets', '--core', root, '--format', 'json'], {
    cwd: root,
    encoding: 'utf8',
    env: { ...process.env, NO_COLOR: '1', EVOLITH_TELEMETRY_DISABLED: '1' },
    timeout: 120000,
  });
  const stdout = res.stdout ?? '';
  const start = stdout.indexOf('{');
  if (start === -1) {
    return { ok: false, detail: `no JSON envelope on stdout (exit ${res.status}); stderr: ${(res.stderr ?? '').slice(0, 400)}` };
  }
  let envelope;
  try {
    envelope = JSON.parse(stdout.slice(start));
  } catch (err) {
    return { ok: false, detail: `stdout is not a JSON envelope: ${err instanceof Error ? err.message : String(err)}` };
  }
  const durationMs = envelope?.meta?.durationMs;
  if (typeof durationMs !== 'number') return { ok: false, detail: `meta.durationMs is ${JSON.stringify(durationMs)}, expected a number` };
  if (!(durationMs > 0)) {
    return { ok: false, detail: `meta.durationMs is ${durationMs} from a run whose wall clock moved — a literal, not a measurement`, durationMs };
  }
  return { ok: true, durationMs, command: envelope?.meta?.command };
}

function main() {
  const argv = process.argv.slice(2);
  const verbose = argv.includes('--verbose');
  const allowUnbuilt = argv.includes('--allow-unbuilt');
  const rootIdx = argv.indexOf('--root');
  const root = rootIdx !== -1 ? resolve(process.cwd(), argv[rootIdx + 1]) : REPO_ROOT;

  console.log('⏱  Measured durations — `meta.durationMs` is a clock reading, never a literal (GT-686)');

  let failed = false;

  // 1. Static half.
  const { scanned, findings } = scanTree(root);
  try {
    assertScanned(scanned, { what: 'non-spec TypeScript sources', where: join(root, 'src') });
  } catch (err) {
    if (err instanceof ZeroCoverageError) {
      console.error(err.message);
      process.exit(1);
    }
    throw err;
  }
  if (findings.length > 0) {
    failed = true;
    console.error(`✗ ${findings.length} file(s) ship the literal \`durationMs: 0\` (scanned ${scanned}):`);
    for (const f of findings) console.error(`  - ${f.file}:${f.lines.join(',')}`);
    console.error('  Measure it: start an EnvelopeClock (core-domain gate-evidence) when the work starts and read');
    console.error('  `clock.elapsedMs()` when the envelope is built. A genuine zero-duration path goes in');
    console.error('  ALLOWED_ZERO_SITES with its reason.');
  } else {
    console.log(`✓ static: 0 literal zeros across ${scanned} non-spec TypeScript sources`);
  }

  // 2. Executed half.
  const entry = cliEntry(root);
  if (!entry) {
    if (allowUnbuilt) {
      console.log('⚠ executed: CLI not built (src/sdk/cli/dist/main.js missing) — skipped under --allow-unbuilt');
    } else {
      failed = true;
      console.error('✗ executed: src/sdk/cli/dist/main.js is missing. Build the CLI first, or pass --allow-unbuilt to run the static half only.');
    }
  } else {
    const probe = probeCli(root, entry);
    if (probe.ok) {
      console.log(`✓ executed: \`${probe.command ?? 'evolith rulesets'}\` reported meta.durationMs = ${probe.durationMs} (> 0)`);
    } else {
      failed = true;
      console.error(`✗ executed: ${probe.detail}`);
    }
  }

  if (verbose) console.log(`  root: ${root}`);
  if (failed) process.exit(1);
  console.log('✅ every envelope duration is measured');
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) main();
