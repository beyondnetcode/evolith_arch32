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
import { resolve } from 'node:path';
import { execSync } from 'node:child_process';
import { evaluateWasm, normalizeOpaDecisions } from './opa-eval.mjs';
import { parityReport, scopeTopologies, contentVersion } from './parity-gate.mjs';

const ROOT = process.cwd();
const TOPO_ROOT = 'reference/architecture/topologies';
// Full/scheduled run evaluates all accepted topologies; otherwise scope to changed.
const FULL_RUN = process.env.EVOLITH_PARITY_FULL === 'true';

function changedPaths() {
  try {
    return execSync('git diff --name-only HEAD~1 HEAD', { encoding: 'utf8' }).split('\n').filter(Boolean);
  } catch {
    return null; // no diff context — treat as full
  }
}

function readIfExists(rel) {
  const p = resolve(ROOT, rel);
  return existsSync(p) ? readFileSync(p, 'utf8') : '';
}

function acceptedTopologies() {
  const out = [];
  const walk = (dir) => {
    for (const e of readdirSync(resolve(ROOT, dir), { withFileTypes: true })) {
      const rel = `${dir}/${e.name}`;
      if (e.isDirectory()) walk(rel);
      else if (e.name === 'topology.manifest.json') {
        try {
          const m = JSON.parse(readFileSync(resolve(ROOT, rel), 'utf8'));
          if (m?.metadata?.status === 'accepted') {
            out.push({ dir, id: m.metadata.id, version: m.metadata.version });
          }
        } catch {
          /* manifest parse issues are covered by the drift audit (GT-147) */
        }
      }
    }
  };
  if (existsSync(resolve(ROOT, TOPO_ROOT))) walk(TOPO_ROOT);
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
