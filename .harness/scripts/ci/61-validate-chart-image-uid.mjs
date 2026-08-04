#!/usr/bin/env node

/**
 * The chart must run the pod as the user its image owns files as.
 *
 * ## The defect this closes
 *
 * `product/infra/helm/evolith-mcp/values.yaml` pinned `runAsUser: 1000` while
 * `src/packages/mcp-server/Dockerfile` creates `evolith` at uid **1001**,
 * `chown -R evolith:evolith /repo /app`, and declares `USER evolith`. A
 * `securityContext` overrides the image's USER, so the process landed on the
 * base image's `node` user — which owns none of the corpus.
 *
 * The symptom was three layers from the cause and total: `policy.wasm` ships
 * mode 600 owned by 1001, so at uid 1000 the OPA engine got
 * `EACCES: permission denied`, and dispatch requires BOTH the native and OPA
 * engines to allow — so OPA erroring fail-closed EVERY `tools/call` with
 * FORBIDDEN. A deployed MCP server advertising 51 tools and able to execute
 * none. Found on 2026-08-04 by running the `core-integration` robot against a
 * live cluster; nothing in the repository could have caught it, because the test
 * harness runs the server IN-PROCESS, with no container and no securityContext.
 *
 * The value is correct today because it was corrected by hand. That is the part
 * this guard replaces: a hand-corrected value with nothing watching it is one
 * edit away from the same outage, and the next person to see it will see it in a
 * cluster, not in CI.
 *
 * ## What it checks
 *
 * For every chart paired with a Dockerfile below: the uid the Dockerfile creates
 * (`adduser -S <name> -u <uid>`) must equal EVERY uid/gid the chart pins —
 * `podSecurityContext.runAsUser`, `runAsGroup`, `fsGroup`, and
 * `containerSecurityContext.runAsUser`. All four, because getting three right
 * and one wrong reproduces the same failure through a different door: `fsGroup`
 * alone decides who owns mounted volumes.
 *
 * A chart that pins NO uid is reported, not passed. It inherits the image's USER,
 * which happens to be right — but silently, and the next edit that adds a
 * securityContext has no anchor to be checked against.
 *
 * ## Anti-vacuous pass
 *
 * Zero pairs checked is a hard failure through `assertScanned`: a renamed chart
 * directory must not read as "everything agrees". So is a Dockerfile whose
 * `adduser` line cannot be parsed — an unreadable uid is not a matching uid.
 *
 * USAGE
 *   node .harness/scripts/ci/61-validate-chart-image-uid.mjs
 *   node .harness/scripts/ci/61-validate-chart-image-uid.mjs --verbose
 *
 * EXIT CODES
 *   0  every chart runs as the uid its image owns files as
 *   1  a divergence, an unparseable uid, or a vacuous scan
 */

import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';

import { findRepoRoot } from '../lib/paths.mjs';
import { assertScanned } from '../lib/coverage.mjs';

const GUARD = '61-validate-chart-image-uid';

/**
 * The pairs. Hand-written on purpose: deriving "which Dockerfile belongs to
 * which chart" from a naming convention would silently skip a chart the day
 * someone renames one, and a skipped chart is exactly the shape of the defect.
 */
export const PAIRS = [
  { chart: 'product/infra/helm/evolith-core-api', dockerfile: 'src/apps/core-api/Dockerfile' },
  { chart: 'product/infra/helm/evolith-mcp', dockerfile: 'src/packages/mcp-server/Dockerfile' },
  { chart: 'product/infra/helm/evolith-agent-runtime', dockerfile: 'src/apps/agent-runtime-api/Dockerfile' },
];

/** The uid a Dockerfile creates, or null when it declares no user at all. */
export function imageUid(dockerfileText) {
  // `-u` anywhere on the adduser command, because the USERNAME is POSITIONAL:
  // the real line is `adduser -S evolith -u 1001 -G evolith`. The first version
  // required every token before `-u` to be a flag, so it matched nothing and
  // reported all three images as unreadable — a guard failing for its own reason
  // rather than the repository's.
  const m = dockerfileText.match(/adduser\b[^\n]*?-u\s+(\d+)/);
  if (m) return Number(m[1]);
  // A Dockerfile with a USER but no adduser is running as a user the base image
  // provides; there is no uid here to compare against and saying so beats
  // guessing one.
  return /^\s*USER\s+\S+/m.test(dockerfileText) ? undefined : null;
}

/** Every uid/gid a chart pins, as {field: value}. */
export function chartUids(valuesText) {
  const v = yaml.load(valuesText) || {};
  const out = {};
  const pod = v.podSecurityContext || {};
  const container = v.containerSecurityContext || {};
  if (pod.runAsUser !== undefined) out['podSecurityContext.runAsUser'] = pod.runAsUser;
  if (pod.runAsGroup !== undefined) out['podSecurityContext.runAsGroup'] = pod.runAsGroup;
  // fsGroup decides who owns mounted volumes. Leaving it behind while fixing the
  // other three reproduces the same failure through a different door.
  if (pod.fsGroup !== undefined) out['podSecurityContext.fsGroup'] = pod.fsGroup;
  if (container.runAsUser !== undefined) out['containerSecurityContext.runAsUser'] = container.runAsUser;
  return out;
}

/** Compare one pair. Returns {problems[], pinned, uid}. */
export function checkPair(dockerfileText, valuesText) {
  const problems = [];
  const uid = imageUid(dockerfileText);

  if (uid === null) {
    problems.push(
      'the Dockerfile declares no USER and creates no user — it runs as root, which the chart cannot be checked against',
    );
    return { problems, pinned: {}, uid };
  }
  if (uid === undefined) {
    problems.push(
      'the Dockerfile declares a USER but no `adduser -u <uid>`, so the uid it runs as cannot be read here. An unreadable uid is not a matching uid — pin it in the Dockerfile or exempt this pair with a reason',
    );
    return { problems, pinned: {}, uid };
  }

  const pinned = chartUids(valuesText);
  const fields = Object.keys(pinned);
  if (fields.length === 0) {
    problems.push(
      `the chart pins no uid, so the pod inherits the image's USER (${uid}). That is right today and unanchored tomorrow: add podSecurityContext.runAsUser/runAsGroup/fsGroup + containerSecurityContext.runAsUser = ${uid}`,
    );
    return { problems, pinned, uid };
  }

  for (const [field, value] of fields.map((f) => [f, pinned[f]])) {
    if (value !== uid) {
      problems.push(
        `${field} = ${value} but the image creates uid ${uid}. A securityContext OVERRIDES the image's USER, so the process lands on a user that owns none of the corpus — files ship mode 600 owned by ${uid}, and the failure surfaces at runtime as EACCES, far from here`,
      );
    }
  }
  return { problems, pinned, uid };
}

function main(argv = process.argv.slice(2)) {
  const verbose = argv.includes('--verbose');
  const root = findRepoRoot();
  const rows = [];
  const violations = [];

  for (const pair of PAIRS) {
    const dfPath = path.join(root, pair.dockerfile);
    const valuesPath = path.join(root, pair.chart, 'values.yaml');
    if (!fs.existsSync(dfPath) || !fs.existsSync(valuesPath)) {
      violations.push(
        `${pair.chart}: missing ${!fs.existsSync(dfPath) ? pair.dockerfile : pair.chart + '/values.yaml'}. A moved file must not read as agreement`,
      );
      continue;
    }
    const { problems, pinned, uid } = checkPair(
      fs.readFileSync(dfPath, 'utf8'),
      fs.readFileSync(valuesPath, 'utf8'),
    );
    rows.push({ chart: pair.chart, uid, pinned, ok: problems.length === 0 });
    for (const p of problems) violations.push(`${pair.chart}: ${p}`);
  }

  assertScanned(rows.length, {
    what: 'chart/image pairs',
    where: PAIRS.map((p) => p.chart),
  });

  console.log(`${GUARD} — the chart must run as the uid its image owns files as`);
  console.log(`  pairs checked ...... ${rows.length}`);
  if (verbose) {
    for (const r of rows) {
      const fields = Object.entries(r.pinned)
        .map(([k, v]) => `${k.split('.').pop()}=${v}`)
        .join(' ');
      console.log(`    • ${r.ok ? 'OK  ' : 'FAIL'} ${path.basename(r.chart).padEnd(24)} image uid ${r.uid} · ${fields || '(none pinned)'}`);
    }
  }

  if (violations.length > 0) {
    console.error(`\n✗ ${GUARD}: ${violations.length} divergence(s):\n`);
    for (const v of violations) console.error(`  • ${v}`);
    console.error('\n  Context: reference/core/control-center/gaps/gap-reference-catalog.md (the MCP chart shipped 1000 against an image built at 1001)');
    process.exit(1);
  }

  console.log(`\n✓ ${GUARD}: all ${rows.length} chart(s) run as the uid their image owns files as.`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
