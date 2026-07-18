#!/usr/bin/env node
/**
 * @file 27-opa-parity-gate.mjs
 * @description CI Step: Executable OPA tests + Native/OPA semantic parity (GT-149)
 *
 * For each accepted topology with a compiled `<id>.wasm` bundle and a
 * `parity-fixtures/` directory, evaluates every fixture through the pinned
 * opa-wasm runtime (no host binary), compares the decisions against the
 * fixture's declared Native decisions, and fails closed on verdict/rule-ID/
 * severity/evidence drift or any evaluator/parse failure. Emits a versioned,
 * machine-readable report with aggregate duration telemetry.
 *
 * Dry-run-safe: when bundles/fixtures are not yet compiled/present locally, the
 * gate defers to the scheduled full parity run (compile-opa-wasm) and exits 0.
 *
 * Fixture shape: { "input": {…}, "expectedNative": [ { ruleId, severity, file } ] }
 */

import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { execSync } from 'node:child_process';
import { evaluateWasm, normalizeOpaDecisions } from './opa-eval.mjs';
import { parityReport, scopeTopologies, contentVersion } from './parity-gate.mjs';

// GT-556/557: ROOT came from process.cwd() and the TOPO_ROOTS loop skipped any root
// that did not exist, so a moved root silently shrank the scanned corpus while the gate
// still reported "deferred, exit 0". Roots are now fail-closed and the manifest corpus
// size is asserted before any scoping is applied.
import { REPO_ROOT, collectFiles, relativeToRoot } from '../lib/paths.mjs';
import { assertScanned } from '../lib/coverage.mjs';

const ROOT = REPO_ROOT;
// GT-329: canonical topology roots — progressive-axis stays in reference/; advanced topologies in rulesets/
const TOPO_ROOT_KEYS = ['topologiesReference', 'topologiesRulesets'];
// Full/scheduled run evaluates all accepted topologies; otherwise scope to changed.
const FULL_RUN = process.env.EVOLITH_PARITY_FULL === 'true';

function changedPaths() {
  try {
    // GT-556: pin git to the repo root. Inherited-cwd `git diff` made the SCOPE
    // cwd-dependent too: invoked outside the repo it threw, fell into the `catch`, and
    // silently promoted the run to FULL — the gate evaluated 26 fixtures from /tmp and
    // 0 from the repo root, both exiting 0.
    return execSync('git diff --name-only HEAD~1 HEAD', { encoding: 'utf8', cwd: ROOT }).split('\n').filter(Boolean);
  } catch {
    return null; // no diff context — treat as full
  }
}

function readIfExists(rel) {
  const p = resolve(ROOT, rel);
  return existsSync(p) ? readFileSync(p, 'utf8') : '';
}

function acceptedTopologies() {
  const files = collectFiles(TOPO_ROOT_KEYS, 'topology.manifest.json');

  // The corpus — not the accepted subset — is what proves the gate looked in the right
  // place. Zero accepted topologies can be a real state; zero manifests cannot.
  assertScanned(files.length, { what: 'topology manifests', where: TOPO_ROOT_KEYS });

  const out = [];
  for (const full of files) {
    try {
      const m = JSON.parse(readFileSync(full, 'utf8'));
      if (m?.metadata?.status === 'accepted') {
        out.push({ dir: relativeToRoot(dirname(full)), id: m.metadata.id, version: m.metadata.version });
      }
    } catch {
      /* manifest parse issues are covered by the drift audit (GT-147) */
    }
  }
  return out;
}

async function main() {
  console.log('⚖️  Executable OPA Tests & Native/OPA Parity Gate (GT-149)');
  const topologies = scopeTopologies(acceptedTopologies(), FULL_RUN ? null : changedPaths(), FULL_RUN);
  console.log(`   Scope: ${FULL_RUN ? 'FULL (scheduled)' : 'changed topologies'} — ${topologies.length} accepted topology(ies).`);
  const reports = [];
  let missingInputs = 0;
  let drifting = 0;
  let totalDurationMs = 0;

  for (const t of topologies) {
    const wasmRel = `${t.dir}/${t.id}.wasm`;
    const fixturesDir = `${t.dir}/parity-fixtures`;
    if (!existsSync(resolve(ROOT, wasmRel)) || !existsSync(resolve(ROOT, fixturesDir))) {
      missingInputs += 1;
      continue;
    }
    const wasm = readFileSync(resolve(ROOT, wasmRel));
    for (const file of readdirSync(resolve(ROOT, fixturesDir)).filter((f) => f.endsWith('.json'))) {
      let report;
      try {
        const fixture = JSON.parse(readFileSync(resolve(ROOT, fixturesDir, file), 'utf8'));
        const { result, durationMs } = await evaluateWasm(wasm, fixture.input || {});
        totalDurationMs += durationMs;
        report = parityReport({
          topology: t.id,
          fixture: file,
          nativeDecisions: fixture.expectedNative || [],
          opaDecisions: normalizeOpaDecisions(result),
          versions: {
            topology: t.version,
            ruleset: contentVersion(readIfExists(`${t.dir}/${t.id}.rules.json`)),
            policy: contentVersion(readIfExists(`${t.dir}/${t.id}.rego`)),
          },
          durationMs,
        });
      } catch (e) {
        report = { topology: t.id, fixture: file, parity: false, error: String(e.message) };
      }
      reports.push(report);
      if (!report.parity) drifting += 1;
    }
  }

  const out = {
    schemaVersion: '1.0',
    accepted: topologies.length,
    evaluated: reports.length,
    missingInputs,
    drifting,
    telemetry: { totalDurationMs },
    reports,
  };

  if (reports.length === 0) {
    console.log(
      `   ℹ️  No compiled OPA bundles / parity-fixtures present for ${topologies.length} accepted topology(ies). ` +
        `Deferred to the scheduled full parity run (compile-opa-wasm).`,
    );
    console.log(`PARITY ${JSON.stringify(out)}`);
    process.exit(0);
  }

  console.log(`   ${reports.length} fixture(s) across ${topologies.length} accepted topology(ies); ${drifting} drift/failure(s).`);
  console.log(`PARITY ${JSON.stringify(out)}`);
  process.exit(drifting > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('❌ OPA parity gate failed:', err.message);
  process.exit(1);
});
