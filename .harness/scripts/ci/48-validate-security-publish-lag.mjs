#!/usr/bin/env node

/**
 * GT-624 — a security fix that never reached the registry must fail a check.
 *
 * ## The defect this exists for
 *
 * The 2026-07-23 security wave sat unpublished until 2026-07-27 while
 * `SECURITY.md` declared the 1.1.x line "actively patched". Four days, on a
 * public registry, with the public CHANGELOG naming the vulnerable files.
 * **Nothing detected it. An audit did** — which is the same as saying the
 * repository had no opinion about the difference between "fixed" and "shipped".
 *
 * Deprecating the old versions (GT-624's first criterion, done 2026-07-29) does
 * not help here: it labels what is already out, and says nothing about a fix
 * still sitting in `main`. This guard is the other half.
 *
 * ## What it checks
 *
 * For every publishable workspace: the commits that touch it AFTER the commit
 * that set its currently-published version, filtered to the ones whose subject
 * marks them as security work. Any such commit is a fix the registry does not
 * serve, and it fails.
 *
 * ## Why the boundary comes from the REGISTRY and not from a tag
 *
 * Measured on 2026-07-30, not assumed: the newest `v*` tag in this repository is
 * `v1.1.0`, while npm serves `@beyondnet/evolith-cli@1.2.2`. Three releases were
 * published without a tag. A guard that asked git "what is the latest release?"
 * would therefore have reported a four-release lag that does not exist, and
 * flagged every commit since 1.1.0 as unpublished security work.
 *
 * So the registry answers WHAT is published, and git archaeology answers WHERE
 * that version was set: the commit that last wrote `"version": "<published>"`
 * into the package's own `package.json`. Everything after that commit, touching
 * that package, is unreleased by construction.
 *
 * ## What counts as a security marker
 *
 * Two forms, and both are deliberate:
 *
 *   - type `security(...)` — used twice in this repository's history and, per
 *     GT-623, **not a Conventional Commits type**, so release-please derives no
 *     version bump from it. A commit announcing itself as a security change that
 *     cannot move a version is exactly the failure mode of GT-570, so this guard
 *     reports the type separately rather than only counting it.
 *   - scope `security` / `sec` on any type — `fix(security):`, `chore(sec):`.
 *
 * What it deliberately does NOT do is grep subjects for the word "security".
 * `fix(deps)!: … the SDK that carries the security wave` is a dependency fix that
 * mentions the wave; treating prose as a marker would make the gate fire on
 * anything discussing security, and a gate that cries wolf gets switched off. The
 * marker is structural: type or scope, as the criterion says.
 *
 * ## Anti-vacuous pass
 *
 * Zero packages resolved, or zero commits examined, is a hard failure. A guard
 * that scanned nothing must never report a pass — this repository has been bitten
 * by that shape repeatedly (GT-569, GT-633, and the empty-fixture floor that
 * `43-validate-guard-negative-fixtures` exists to observe).
 *
 * USAGE
 *   node .harness/scripts/ci/48-validate-security-publish-lag.mjs
 *   node .harness/scripts/ci/48-validate-security-publish-lag.mjs --verbose
 *   node .harness/scripts/ci/48-validate-security-publish-lag.mjs --root <dir>
 *   node .harness/scripts/ci/48-validate-security-publish-lag.mjs --offline
 *       # treat each package's declared version as the published one: no network,
 *       # so it answers "is anything unreleased relative to the manifest?"
 *
 * EXIT CODES
 *   0  every security-marked commit is inside a published version
 *   1  an unpublished security commit, or nothing was scanned
 */

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const GUARD = '48-validate-security-publish-lag';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '../../..');

/** Kept in step with `plan-npm-release.mjs`, which owns the same list. */
export const WORKSPACE_DIRS = [
  'src/packages/core-domain',
  'src/packages/contracts',
  'src/packages/core',
  'src/packages/agent-runtime',
  'src/packages/infra-providers',
  'src/packages/sdk-client',
  'src/packages/mcp-server',
  'src/sdk/cli',
];

// ---------------------------------------------------------------------------
// Pure core — no git, no registry, no filesystem. This is what the fixtures
// exercise directly, and what makes the decision inspectable on its own.
// ---------------------------------------------------------------------------

/**
 * Structural security marker in a Conventional-Commits subject.
 *
 * @param {string} subject
 * @returns {{ marker: 'type' | 'scope', text: string } | null}
 */
export function securityMarker(subject) {
  const header = /^([a-zA-Z]+)(?:\(([^)]*)\))?(!)?:/.exec(String(subject).trim());
  if (!header) return null;
  const [, type, scope] = header;
  if (/^security$/i.test(type)) return { marker: 'type', text: `${type}(${scope ?? ''})` };
  if (scope && /^(security|sec)$/i.test(scope.trim())) return { marker: 'scope', text: `${type}(${scope})` };
  return null;
}

/**
 * Decide, from already-gathered facts, what is unpublished security work.
 *
 * @param {Array<{ pkg: string, publishedVersion: string, commits: Array<{ sha: string, subject: string }> }>} units
 * @returns {{ scanned: number, packages: number, findings: Array<object>, byMarker: Record<string, number> }}
 */
export function auditSecurityPublishLag(units) {
  const findings = [];
  const byMarker = { type: 0, scope: 0 };
  let scanned = 0;

  for (const unit of units) {
    for (const commit of unit.commits) {
      scanned += 1;
      const marker = securityMarker(commit.subject);
      if (!marker) continue;
      byMarker[marker.marker] += 1;
      findings.push({
        pkg: unit.pkg,
        publishedVersion: unit.publishedVersion,
        sha: commit.sha,
        subject: commit.subject,
        marker: marker.marker,
        header: marker.text,
      });
    }
  }

  return { scanned, packages: units.length, findings, byMarker };
}

// ---------------------------------------------------------------------------
// I/O edges
// ---------------------------------------------------------------------------

/**
 * git, or an empty answer.
 *
 * A repository with no commits makes `git log` exit non-zero, and letting that
 * throw crashed the guard with a Node stack instead of reporting — found by the
 * "cannot place in history" fixture. An unanswerable git question is UNKNOWN, and
 * unknown is handled explicitly below (skipped, and a failure if everything is
 * skipped). It must never be handled by a traceback.
 */
const git = (args, root) => {
  try {
    return execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return '';
  }
};

function readManifest(root, dir) {
  const file = path.join(root, dir, 'package.json');
  if (!fs.existsSync(file)) return null;
  const pkg = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (!pkg.name || pkg.private) return null;
  return { dir, name: pkg.name, version: pkg.version };
}

/** What the registry actually serves. `null` when it cannot answer. */
export function registryLatest(name) {
  try {
    return execFileSync('npm', ['view', name, 'version'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim() || null;
  } catch {
    return null;
  }
}

/**
 * The last commit at which this package's manifest still declared `version` —
 * the publish boundary. Everything after it is a different version, so it is not
 * what the registry serves.
 *
 * READ THE MANIFEST, DO NOT SEARCH FOR THE STRING. The first implementation used
 * `git log -S'"version": "<published>"'`, and it was wrong in a way that hid work:
 * `-S` counts occurrences, so it matches the commit that DELETED the string too.
 * On a package whose version has just been bumped, the boundary therefore landed
 * on the bump itself and every commit between the real publish point and the bump
 * went unscanned — a false negative in the exact window this gate exists to watch.
 * Observed on 2026-07-30 against `@beyondnet/evolith-cli`, whose boundary resolved
 * to the 1.2.2 bump while the registry served 1.2.1.
 *
 * Walking newest-first and asking each revision of the manifest what version it
 * declared answers the question directly, and costs one `git show` per manifest
 * commit — a handful, for a file only releases touch.
 */
export function boundaryCommit(root, dir, version) {
  const manifest = `${dir}/package.json`;
  const shas = git(['log', '--format=%H', '--', manifest], root).split('\n').filter(Boolean);

  const versionAt = (sha) => {
    const raw = git(['show', `${sha}:${manifest}`], root);
    if (!raw) return null;
    try {
      return JSON.parse(raw).version ?? null;
    } catch {
      // A manifest that does not parse at that revision tells us nothing about
      // the version; treat it as unknown rather than guessing.
      return null;
    }
  };

  // Walk newest-first to the run of commits at the published version, then take
  // the OLDEST commit of that run: the point where the version was SET.
  //
  // Taking the newest one instead under-reports, and the second version of this
  // function did exactly that. A later commit that edits the manifest while
  // leaving the version alone — a dependency bump is the common case — would move
  // the boundary forward and hide everything committed before it. The moment that
  // matters is when the version became the published one, because that is when the
  // release could have happened.
  let i = 0;
  while (i < shas.length && versionAt(shas[i]) !== version) i += 1;
  if (i < shas.length) {
    let last = i;
    while (last + 1 < shas.length && versionAt(shas[last + 1]) === version) last += 1;
    return { sha: shas[last], exact: true };
  }
  // The published version is in no revision of this manifest — it was released
  // from history this checkout does not have. Scanning the whole history is the
  // conservative answer, and it is reported as INEXACT rather than passed off.
  return shas.length ? { sha: shas[shas.length - 1], exact: false } : null;
}

/** Commits touching this package after the boundary, newest first. */
export function commitsSince(root, dir, sha) {
  const out = git(['log', `${sha}..HEAD`, '--format=%h%x1f%s', '--', dir], root);
  if (!out) return [];
  return out.split('\n').map((line) => {
    const [shortSha, subject] = line.split('\x1f');
    return { sha: shortSha, subject };
  });
}

function fail(lines) {
  console.error(`\n✗ ${GUARD}: ${lines[0]}`);
  for (const l of lines.slice(1)) console.error(`  ${l}`);
  process.exit(1);
}

function main(argv) {
  const rootIdx = argv.indexOf('--root');
  const root = rootIdx !== -1 ? path.resolve(process.cwd(), argv[rootIdx + 1]) : REPO_ROOT;
  const verbose = argv.includes('--verbose');
  const offline = argv.includes('--offline');

  const manifests = WORKSPACE_DIRS.map((dir) => readManifest(root, dir)).filter(Boolean);
  if (manifests.length === 0) {
    fail([
      'resolved ZERO publishable packages — nothing was scanned.',
      `Looked under ${root} for: ${WORKSPACE_DIRS.join(', ')}`,
      'A guard that scanned nothing must not report a pass.',
    ]);
  }

  const units = [];
  const skipped = [];
  for (const m of manifests) {
    const published = offline ? m.version : registryLatest(m.name);
    if (!published) {
      skipped.push(`${m.name} — the registry did not answer, so "published" is unknown`);
      continue;
    }
    const boundary = boundaryCommit(root, m.dir, published);
    if (!boundary) {
      skipped.push(`${m.name} — no commit history for ${m.dir}/package.json`);
      continue;
    }
    units.push({
      pkg: m.name,
      dir: m.dir,
      publishedVersion: published,
      exactBoundary: boundary.exact,
      boundarySha: boundary.sha,
      commits: commitsSince(root, m.dir, boundary.sha),
    });
  }

  if (units.length === 0) {
    fail([
      `resolved ${manifests.length} package(s) but could establish a publish boundary for NONE of them.`,
      ...skipped.map((s) => `  • ${s}`),
      'Unable to answer is not the same as nothing to report, so this is a failure.',
    ]);
  }

  const audit = auditSecurityPublishLag(units);

  console.log(`${GUARD} — security work that has not reached the registry`);
  console.log(`  packages ........... ${audit.packages} of ${manifests.length}${offline ? ' (offline: manifest version treated as published)' : ''}`);
  console.log(`  commits examined ... ${audit.scanned} since each package's published version`);
  console.log(`  security-marked .... ${audit.findings.length} (type ${audit.byMarker.type}, scope ${audit.byMarker.scope})`);
  for (const s of skipped) console.log(`  skipped ............ ${s}`);

  if (verbose) {
    for (const u of units) {
      console.log(
        `  · ${u.pkg} @ ${u.publishedVersion} — boundary ${u.boundarySha.slice(0, 8)}` +
        `${u.exactBoundary ? '' : ' (INEXACT: that version string is not in this history)'}` +
        `, ${u.commits.length} commit(s) since`,
      );
    }
  }

  // The scan must have looked at something. Zero commits across every package is
  // legitimate only when every package is exactly at its published version AND
  // nothing has landed since — rare, and worth distinguishing from a broken scan.
  if (audit.scanned === 0) {
    const allAtBoundary = units.every((u) => u.commits.length === 0);
    if (!allAtBoundary) {
      fail(['examined ZERO commits while packages report commits since their boundary — the scan is broken.']);
    }
    console.log('\n  Every package is exactly at its published version with nothing landed since.');
  }

  if (audit.findings.length > 0) {
    fail([
      `${audit.findings.length} security-marked commit(s) are NOT in any published version:`,
      ...audit.findings.map(
        (f) => `  • ${f.sha} ${f.subject}\n      ${f.pkg} serves ${f.publishedVersion}; this commit is after it (marked by ${f.marker})`,
      ),
      '',
      '  A security fix that is committed but not published is the GT-570 failure:',
      '  SECURITY.md claimed the line was "actively patched" for four days while the',
      '  registry served the vulnerable build. Publish, or stop marking it security.',
      '',
      ...(audit.byMarker.type > 0
        ? [
          `  NOTE: ${audit.byMarker.type} of these use the type \`security(...)\`, which is NOT a`,
          '  Conventional Commits type — release-please derives no version bump from it,',
          '  so it cannot reach the registry by the normal path at all (GT-623).',
          '',
        ]
        : []),
      '  Release with: gh workflow run npm-release.yml --ref main -f dry_run=false',
    ]);
  }

  console.log(
    `\n✓ ${GUARD}: every security-marked commit across ${audit.packages} package(s) ` +
    'is inside a version the registry serves.',
  );
  return 0;
}

const invokedDirectly =
  process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (invokedDirectly) process.exit(main(process.argv.slice(2)));
