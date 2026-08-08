#!/usr/bin/env node

/**
 * GT-657 — a HIGH advisory with no upstream fix must be named, not tolerated.
 *
 * ## The defect
 *
 * `Security Audit` ran `npm audit --audit-level=high` and had exactly two
 * outcomes: green, or red until someone bumps something. On 2026-08-08 a third
 * situation appeared and the job had no way to express it — a HIGH advisory that
 * CANNOT be fixed from this repository:
 *
 *   GHSA-pm4m-ph32-ghv5 (js-yaml, exponential parsing time in flow collections)
 *   reaches the tree through `@nestjs/swagger`, which pins js-yaml EXACTLY.
 *   Every published release pins a vulnerable one — 11.4.4 -> 4.1.1,
 *   11.4.5 -> 4.3.0, 11.4.6 -> 5.2.1 — and npm `overrides` do not rewrite that
 *   nested exact spec: measured with a top-level override, with a scoped
 *   override, with the other nested override objects removed, and through both
 *   `--package-lock-only` and a real `npm install`. Four routes, same tree.
 *
 * Leaving the job red is not neutral. It is precisely what
 * [GT-622] spent a day removing: a permanently red check trains reviewers to
 * discount red checks, and the next REAL advisory would arrive into a job
 * everyone had already learned to ignore.
 *
 * ## What it checks
 *
 * Every `high`/`critical` advisory `npm audit` reports must either be absent or
 * be declared in `.harness/config/npm-audit-exceptions.json` with a reason. The
 * declaration names the ADVISORY and the PATH it arrives by, so an exception
 * covers one known hole and not a package forever.
 *
 * Exceptions are themselves checked, in both directions:
 *
 *   - an undeclared high/critical            -> FAILS (the whole point)
 *   - a declared one that is still present   -> reported, with its reason
 *   - a declared one that has DISAPPEARED    -> FAILS as stale
 *
 * That last rule is what stops the file becoming a graveyard: the day
 * `@nestjs/swagger` ships a patched pin, this guard turns red and says so,
 * instead of silently carrying an exemption nobody re-reads.
 *
 * ## Anti-vacuous pass
 *
 * `npm audit --json` that cannot be parsed, or that reports no `metadata`, is a
 * hard failure. "The audit did not run" must never read as "the audit found
 * nothing" — that is the failure mode this corpus keeps finding.
 *
 * USAGE
 *   node .harness/scripts/ci/63-validate-npm-audit-gate.mjs
 *   node .harness/scripts/ci/63-validate-npm-audit-gate.mjs --verbose
 *   node .harness/scripts/ci/63-validate-npm-audit-gate.mjs --audit-json <file>
 *
 * EXIT CODES
 *   0  every high/critical advisory is declared, and every declaration is live
 *   1  an undeclared advisory, a stale declaration, or an audit that did not run
 */

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const GUARD = '63-validate-npm-audit-gate';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '../../..');

export const EXCEPTIONS = '.harness/config/npm-audit-exceptions.json';
const BLOCKING = new Set(['high', 'critical']);

// ---------------------------------------------------------------------------
// Pure core
// ---------------------------------------------------------------------------

/**
 * Flatten `npm audit --json` into one row per (advisory, path).
 *
 * A package appears once per advisory that reaches it, and the PATH is part of
 * the identity: the same advisory arriving through a different parent is a
 * different hole, and an exception written for one must not silently cover it.
 *
 * @param {object} report
 * @returns {Array<{id: string, package: string, severity: string, title: string, via: string, paths: string[]}>}
 */
export function blockingAdvisories(report) {
  const rows = [];
  for (const [name, entry] of Object.entries(report?.vulnerabilities ?? {})) {
    if (!BLOCKING.has(entry.severity)) continue;
    const direct = (entry.via ?? []).filter((v) => typeof v === 'object');
    if (direct.length === 0) {
      // Reached only through another vulnerable package; identified by that chain.
      rows.push({
        id: `via:${(entry.via ?? []).filter((v) => typeof v === 'string').join('+') || 'unknown'}`,
        package: name,
        severity: entry.severity,
        title: `depends on a vulnerable ${(entry.via ?? []).join(', ')}`,
        via: (entry.via ?? []).filter((v) => typeof v === 'string').join(', '),
        paths: [...(entry.nodes ?? [])].sort(),
      });
      continue;
    }
    for (const advisory of direct) {
      rows.push({
        id: advisoryId(advisory),
        package: name,
        severity: entry.severity,
        title: advisory.title ?? '(no title)',
        via: advisory.url ?? '',
        paths: [...(entry.nodes ?? [])].sort(),
      });
    }
  }
  return rows.sort((a, b) => `${a.package}${a.id}`.localeCompare(`${b.package}${b.id}`));
}

/** GHSA id when npm gives one, falling back to its numeric advisory id. */
export function advisoryId(advisory) {
  const fromUrl = /\/advisories\/(GHSA-[\w-]+)/.exec(advisory?.url ?? '');
  if (fromUrl) return fromUrl[1];
  if (advisory?.source != null) return `npm:${advisory.source}`;
  return 'unknown';
}

/**
 * Match advisories against declarations, in BOTH directions.
 *
 * @param {Array<{id:string,package:string,paths:string[]}>} advisories
 * @param {Array<{id:string,package:string,path:string}>} exceptions
 */
export function reconcile(advisories, exceptions) {
  const covered = [];
  const undeclared = [];
  const usedKeys = new Set();

  for (const a of advisories) {
    const match = exceptions.find(
      (e) => e.id === a.id && e.package === a.package && a.paths.includes(e.path),
    );
    if (match) {
      covered.push({ advisory: a, exception: match });
      usedKeys.add(`${match.id}|${match.package}|${match.path}`);
    } else {
      undeclared.push(a);
    }
  }

  const stale = exceptions.filter((e) => !usedKeys.has(`${e.id}|${e.package}|${e.path}`));
  return { covered, undeclared, stale };
}

/** Shape check for one declaration; every field carries weight. */
export function validateException(entry, index) {
  const at = `exceptions[${index}]`;
  if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return [`${at} is not an object`];
  const problems = [];
  for (const field of ['id', 'package', 'path', 'reason', 'noUpstreamFix']) {
    if (typeof entry[field] !== 'string' || entry[field].trim() === '') {
      problems.push(`${at}.${field} must be a non-empty string`);
    }
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(entry.declaredAt ?? '')) {
    problems.push(`${at}.declaredAt must be YYYY-MM-DD`);
  }
  return problems;
}

// ---------------------------------------------------------------------------
// I/O edges
// ---------------------------------------------------------------------------

function fail(lines) {
  console.error(`\n✗ ${GUARD}: ${lines[0]}`);
  for (const l of lines.slice(1)) console.error(`  ${l}`);
  process.exit(1);
}

function readExceptions(root) {
  const file = path.join(root, EXCEPTIONS);
  if (!fs.existsSync(file)) return [];

  let parsed;
  try {
    parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (error) {
    fail([
      `${EXCEPTIONS} exists but is not valid JSON: ${error.message}`,
      'An exception registry that cannot be read must stop the run, never be',
      'treated as empty — that would report a pass over a file nobody could check.',
    ]);
  }
  if (!Array.isArray(parsed?.exceptions)) {
    fail([`${EXCEPTIONS} has no \`exceptions\` array.`, 'Expected: { "exceptions": [ { id, package, path, declaredAt, noUpstreamFix, reason } ] }']);
  }
  const problems = parsed.exceptions.flatMap((e, i) => validateException(e, i));
  if (problems.length) {
    fail([`${problems.length} malformed exception(s) in ${EXCEPTIONS}:`, ...problems.map((p) => `  • ${p}`)]);
  }
  return parsed.exceptions;
}

function runAudit(root) {
  // `npm audit` exits non-zero when it FINDS something, which is not an error
  // here — the report is the output either way.
  let raw;
  try {
    raw = execFileSync('npm', ['audit', '--json'], {
      cwd: root, encoding: 'utf8', maxBuffer: 128 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'],
    });
  } catch (error) {
    raw = error.stdout;
  }
  if (!raw || !raw.trim()) {
    fail([
      '`npm audit --json` produced no output, so nothing was checked.',
      'The audit failing to RUN must never read as the audit finding nothing.',
    ]);
  }
  try {
    return JSON.parse(raw);
  } catch (error) {
    fail(['`npm audit --json` output is not valid JSON — the audit did not complete.', error.message]);
  }
}

function main(argv) {
  const rootIdx = argv.indexOf('--root');
  const root = rootIdx !== -1 ? path.resolve(process.cwd(), argv[rootIdx + 1]) : REPO_ROOT;
  const jsonIdx = argv.indexOf('--audit-json');
  const verbose = argv.includes('--verbose');

  const report = jsonIdx !== -1
    ? JSON.parse(fs.readFileSync(path.resolve(process.cwd(), argv[jsonIdx + 1]), 'utf8'))
    : runAudit(root);

  if (!report?.metadata?.vulnerabilities) {
    fail([
      'the audit report carries no `metadata.vulnerabilities`, so its denominator is unknown.',
      'A report of an unknown shape must not read as a clean tree.',
    ]);
  }

  const advisories = blockingAdvisories(report);
  const exceptions = readExceptions(root);
  const { covered, undeclared, stale } = reconcile(advisories, exceptions);
  const totals = report.metadata.vulnerabilities;

  console.log(`${GUARD} — every high advisory is fixed or named`);
  console.log(`  audited ............. ${totals.total} advisory/ies (${totals.critical} critical, ${totals.high} high, ${totals.moderate} moderate, ${totals.low} low)`);
  console.log(`  blocking rows ....... ${advisories.length}`);
  console.log(`  declared exceptions . ${exceptions.length} (${covered.length} live, ${stale.length} stale)`);
  console.log(`  undeclared .......... ${undeclared.length}`);

  // Never silent: an exemption nobody sees is indistinguishable from a hole.
  for (const { advisory, exception } of covered) {
    console.log(`  · ${advisory.id} ${advisory.package} — accepted ${exception.declaredAt}: ${exception.reason}`);
  }
  if (verbose) {
    for (const a of advisories) console.log(`  · ${a.severity} ${a.id} ${a.package} @ ${a.paths.join(', ')}`);
  }

  if (stale.length > 0) {
    fail([
      `${stale.length} declared exception(s) no longer match any advisory:`,
      ...stale.map((e) => `  • ${e.id} ${e.package} @ ${e.path} — declared ${e.declaredAt}`),
      '',
      '  This is the good news arriving as a red check, on purpose: the advisory is',
      '  gone or has moved, so the exception must go with it. Delete the entry.',
      '  An exception list that outlives what it excused is how a graveyard starts.',
    ]);
  }

  if (undeclared.length > 0) {
    fail([
      `${undeclared.length} high/critical advisory/ies are neither fixed nor declared:`,
      ...undeclared.flatMap((a) => [
        `  • ${a.severity} ${a.id} — ${a.package}`,
        `      ${a.title}`,
        `      at ${a.paths.join(', ')}`,
      ]),
      '',
      '  Fix it if a fix exists — a version bump or a targeted `overrides` entry in',
      '  the root package.json. Declare it ONLY when no upstream fix exists, in',
      `  ${EXCEPTIONS}, naming the advisory AND the path it arrives by:`,
      '    { "exceptions": [ { "id": "GHSA-...", "package": "...", "path": "node_modules/...",',
      '                        "declaredAt": "YYYY-MM-DD", "noUpstreamFix": "what was checked",',
      '                        "reason": "why it is acceptable here" } ] }',
    ]);
  }

  console.log(`\n✓ ${GUARD}: 0 undeclared high/critical advisories; ${covered.length} accepted with a recorded reason, ${stale.length} stale.`);
  return 0;
}

const invokedDirectly =
  process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (invokedDirectly) process.exit(main(process.argv.slice(2)));
