#!/usr/bin/env node

/**
 * Every surface answers `/health` in the ADR-0073 envelope. GT-654.
 *
 * ## The defect this closes
 *
 * Three services of one product answered three shapes:
 *
 *   core-api        {success, data: {status: "OK", …}, meta: {…}}
 *   mcp             {"status":"ok","transport":"http","protocol":"mcp",…}
 *   agent-runtime   {"status":"ok","service":"agent-runtime-api",…}
 *
 * The nesting differed and so did the CASE of the verdict. Anything probing all
 * three had to special-case each one, and a probe written against either shape
 * reported the others as broken — which is not hypothetical: on 2026-08-03 a
 * cross-cluster check matched `"status":"ok"` literally and called two healthy
 * services unreachable while they were serving.
 *
 * ## Why unifying was safe, measured before it was done
 *
 * NOTHING reads the body. The Helm probes use `httpGet` (status code only), the
 * Dockerfiles use `curl -f` (non-2xx only), the k6 profiles check
 * `r.status === 200`, and RoboSoft checks `hr.ok`. The earlier worry — "the
 * probes are configured against a shape" — was wrong, and checking it turned a
 * decision into a one-line answer.
 *
 * ## What it checks
 *
 * This is a SOURCE check, not a live one: it asserts each surface's health
 * handler constructs the envelope, so a fourth surface cannot land answering a
 * fourth shape. It deliberately does not boot the three services — a guard that
 * needs a running cluster runs nowhere, and the live contrast already exists in
 * `local-test.sh url`.
 *
 * The two claims per surface are separate on purpose: emitting `success`/`data`
 * without `schemaVersion` is still a shape nobody can version, and emitting a
 * lowercase `'ok'` inside a correct envelope reproduces exactly the false
 * failure that started this.
 *
 * ## Anti-vacuous pass
 *
 * Zero surfaces checked is a hard failure through `assertScanned`: a renamed
 * handler must not read as "all three agree".
 *
 * USAGE
 *   node .harness/scripts/ci/62-validate-health-envelope.mjs
 *   node .harness/scripts/ci/62-validate-health-envelope.mjs --verbose
 *
 * EXIT CODES
 *   0  every surface's health handler emits the envelope
 *   1  a bare shape, a missing schemaVersion, a lowercase verdict, or a vacuous scan
 */

import fs from 'node:fs';
import path from 'node:path';

import { findRepoRoot } from '../lib/paths.mjs';
import { assertScanned } from '../lib/coverage.mjs';

const GUARD = '62-validate-health-envelope';

/**
 * Hand-written pairs. Deriving "which file serves health" from a convention
 * would silently skip a surface the day someone moves a handler, and a skipped
 * surface is the shape of the defect itself.
 */
export const SURFACES = [
  {
    name: 'core-api',
    file: 'src/apps/core-api/src/infrastructure/interceptors/envelope.interceptor.ts',
    // core-api envelopes EVERY response through a global interceptor, so its
    // health route carries no shape of its own — the interceptor IS the claim,
    // and that file never mentions `/health`.
    why: 'the global EnvelopeInterceptor wraps every response, health included',
  },
  {
    name: 'mcp',
    file: 'src/packages/mcp-server/src/mcp/mcp-server.service.ts',
    // `schemaVersion` lives in the imported envelope module, not here; what this
    // file must show is that the health routes go THROUGH `success(`.
    version: 'src/packages/mcp-server/src/common/envelopes.ts',
    why: 'health routes call success() from common/envelopes',
  },
  {
    name: 'agent-runtime',
    file: 'src/apps/agent-runtime-api/src/health/health.controller.ts',
    why: 'the controller builds the envelope in-file',
  },
];

/**
 * Whole file, not a slice.
 *
 * The first version cut a 4000-character window forward from the first
 * `/health` and checked that. It failed on all three for its own reasons: the
 * core-api interceptor never mentions `/health`, the agent-runtime helper is
 * defined ABOVE the routes, and the MCP's `schemaVersion` lives in an imported
 * module. A heuristic about text layout is not a claim about behaviour, and
 * this guard had no business inventing one.
 */
export function checkSurface(name, text, versionText) {
  const problems = [];

  const enveloped = /success\s*\(/.test(text) || /success:\s*true/.test(text);
  if (!enveloped) {
    problems.push(
      `${name}: builds no ADR-0073 envelope (no \`success(\` call and no \`success: true\`). A bare object is the shape that made a probe report healthy services as unreachable`,
    );
  }

  // Reachable in this file OR in the module it takes the envelope from.
  const versioned = /schemaVersion|ENVELOPE_SCHEMA_VERSION/.test(text + (versionText ?? ''));
  if (!versioned) {
    problems.push(
      `${name}: no \`schemaVersion\` reachable — an envelope nobody can version is not a contract`,
    );
  }

  // The case matters on its own: a lowercase verdict inside a correct envelope
  // reproduces exactly the literal mismatch that started this.
  //
  // Comments are stripped first. The handler's own header EXPLAINS the shape it
  // replaced — `{status: 'ok', …}` — and a raw scan fired on that explanation.
  // Second time this session a guard flagged its own documentation; a guard that
  // does that gets the documentation deleted, not the defect fixed.
  const code = text
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .filter((l) => !/^\s*(\/\/|\*)/.test(l))
    .join('\n');
  if (/status:\s*'ok'/.test(code) || /"status"\s*:\s*"ok"/.test(code)) {
    problems.push(
      `${name}: emits a lowercase \`ok\` verdict; core-api emits \`OK\`, and a literal comparison across surfaces is what failed on 2026-08-03`,
    );
  }

  return problems;
}

function main(argv = process.argv.slice(2)) {
  const verbose = argv.includes('--verbose');
  const root = findRepoRoot();
  const rows = [];
  const violations = [];

  for (const s of SURFACES) {
    const abs = path.join(root, s.file);
    if (!fs.existsSync(abs)) {
      violations.push(`${s.name}: ${s.file} not found. A moved file must not read as agreement`);
      continue;
    }
    const versionText = s.version && fs.existsSync(path.join(root, s.version))
      ? fs.readFileSync(path.join(root, s.version), 'utf8')
      : undefined;
    const problems = checkSurface(s.name, fs.readFileSync(abs, 'utf8'), versionText);
    rows.push({ name: s.name, ok: problems.length === 0, why: s.why });
    violations.push(...problems);
  }

  assertScanned(rows.length, { what: 'health surfaces', where: SURFACES.map((s) => s.file) });

  console.log(`${GUARD} — every surface answers /health in the ADR-0073 envelope`);
  console.log(`  surfaces checked ... ${rows.length}`);
  if (verbose) {
    for (const r of rows) {
      console.log(`    • ${r.ok ? 'OK  ' : 'FAIL'} ${r.name.padEnd(16)}${r.why ? ' — ' + r.why : ''}`);
    }
  }

  if (violations.length > 0) {
    console.error(`\n✗ ${GUARD}: ${violations.length} problem(s):\n`);
    for (const v of violations) console.error(`  • ${v}`);
    console.error('\n  Context: reference/core/control-center/gaps/gap-reference-catalog.md#gt-654');
    process.exit(1);
  }

  console.log(`\n✓ ${GUARD}: all ${rows.length} surface(s) emit the envelope.`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
