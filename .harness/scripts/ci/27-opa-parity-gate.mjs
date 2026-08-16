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
// `scopeTopologies` is deliberately no longer used here: its `changedPaths == null -> return
// everything` branch is the widening this gate now refuses to be able to express.
import { parityReport, contentVersion, diffCoverage } from './parity-gate.mjs';

// GT-556/557: ROOT came from process.cwd() and the TOPO_ROOTS loop skipped any root
// that did not exist, so a moved root silently shrank the scanned corpus while the gate
// still reported "deferred, exit 0". Roots are now fail-closed and the manifest corpus
// size is asserted before any scoping is applied.
import { REPO_ROOT, collectFiles, relativeToRoot } from '../lib/paths.mjs';
import { assertScanned, assertScannedPerSource } from '../lib/coverage.mjs';
// GT-556/558: the scope of this run is a declared contract, not an inference. An error
// while determining it narrows to nothing — it can no longer widen the run.
import { declareScope, activateScope, resolveScope, isInScope, formatScopeContract } from '../lib/scope.mjs';

const ROOT = REPO_ROOT;

/** Must equal `DECLARED_RULE_IDS_ENTRYPOINT` in `opa-evaluator.ts`; the assertion below is what keeps them equal. */
const DECLARED_RULE_IDS_ENTRYPOINT = 'evolith/manifest/declared_rule_ids';
// GT-329: canonical topology roots — progressive-axis stays in reference/; advanced topologies in rulesets/
const TOPO_ROOT_KEYS = ['topologiesReference', 'topologiesRulesets'];
// Full/scheduled run evaluates all accepted topologies; otherwise scope to changed.
// This is a scope DECLARED before the run starts (scheduled workflow sets the env), which
// is categorically different from a run that widened itself while executing.
const FULL_RUN = process.env.EVOLITH_PARITY_FULL === 'true';

/**
 * The changed-file set, as a fallible resolver.
 *
 * GT-556 pinned git to the repo root, fixing the symptom. GT-558 removes the structure:
 * this no longer catches. Previously an exception here returned `null`, which
 * `scopeTopologies` read as "no diff context, evaluate everything" — a *failure* promoted
 * the run from scoped to FULL, and the gate evaluated 26 fixtures from /tmp and 0 from the
 * repo root, exiting 0 both times. It now throws into `resolveScope`, whose failure branch
 * carries no scope at all, so there is nothing to widen to.
 */
function changedPaths() {
  return execSync('git diff --name-only HEAD~1 HEAD', { encoding: 'utf8', cwd: ROOT }).split('\n').filter(Boolean);
}

/**
 * Resolve the topologies this run may evaluate, or refuse.
 *
 * @returns {{ok: true, topologies: object[], scope: object} | {ok: false, reason: string}}
 */
function resolveEvaluationScope(topologies) {
  const declared = declareScope({
    id: 'opa-parity-gate',
    root: ROOT,
    include: topologies.length > 0 ? topologies.map((t) => t.dir) : ['.'],
    effects: ['read'], // the gate reads fixtures and bundles; it never mutates the tree
    declaredBy: 'ci:27-opa-parity-gate',
    reason: FULL_RUN
      ? 'Scheduled full parity sweep: every accepted topology, declared up front via EVOLITH_PARITY_FULL.'
      : 'Per-commit run: only topologies touched by the commit under test.',
  });

  // FULL is a scope declared before execution, so it activates at the declaration.
  if (FULL_RUN) return { ok: true, topologies, scope: activateScope(declared) };

  const resolution = resolveScope(declared, () => ({ include: changedPaths() }));
  if (!resolution.ok) return { ok: false, reason: resolution.reason };

  const scope = resolution.scope;
  return { ok: true, scope, topologies: topologies.filter((t) => isInScope(scope, { path: t.dir, effect: 'read' })) };
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

/**
 * GT-675 — the SHIPPED bundle must state which rules it can decide.
 *
 * This is the invariant whose quiet loss restores the defect the row is about.
 * `OpaEvaluator.readDeclaredRuleIds` falls back to the previous behaviour when the
 * bundle cannot answer — deliberately, so an old `policy.wasm` keeps working — and
 * that fallback reports a rule nothing decides as `passed`. So a build that stops
 * emitting the entrypoint does not break: it silently un-fixes 234 rules.
 *
 * Checked by EXECUTING the bundle, not by reading the compiler. Note what that
 * means for the row's last criterion: this gate actually runs the OPA engine,
 * where no CI job passed `--engine` at all before.
 */
async function checkDeclaredScope() {
  const wasmCandidates = [
    'src/rulesets/opa/policy.wasm',
    'src/sdk/cli/rulesets/opa/policy.wasm',
  ];
  const present = wasmCandidates.filter((rel) => existsSync(resolve(ROOT, rel)));

  // The DENOMINATOR: every reachable policy the bundle is built from. A gate that
  // scanned zero policies and reported success is the failure mode `42-validate-
  // guard-denominators` exists to stop, so it is stated before anything is checked.
  const policies = [];
  (function walk(dir) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = resolve(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith('.rego') && !entry.name.endsWith('.test.rego') && !entry.name.endsWith('_test.rego')) {
        policies.push(full);
      }
    }
  })(resolve(ROOT, 'src/rulesets/opa'));
  assertScannedPerSource(
    { 'opa policies': policies.length, 'compiled bundles': present.length },
    { what: 'GT-675 declared-scope inputs' },
  );

  const findings = [];
  for (const rel of present) {
    const wasm = readFileSync(resolve(ROOT, rel));
    let declared = [];
    try {
      const { loadPolicy } = await import('@open-policy-agent/opa-wasm');
      const policy = await loadPolicy(wasm);
      if (!Object.prototype.hasOwnProperty.call(policy.entrypoints ?? {}, DECLARED_RULE_IDS_ENTRYPOINT)) {
        findings.push(`${rel}: does not expose '${DECLARED_RULE_IDS_ENTRYPOINT}'. Rules no policy decides will be reported as PASSED. Rebuild with \`npm run build:policy\`.`);
        continue;
      }
      declared = policy.evaluate({}, DECLARED_RULE_IDS_ENTRYPOINT)?.[0]?.result ?? [];
    } catch (err) {
      findings.push(`${rel}: could not be executed to read its declared scope — ${err.message}`);
      continue;
    }
    // Reuses the shared axis rather than re-implementing the predicate here.
    const drift = diffCoverage({ engine: rel, declared, outcomes: [] });
    for (const d of drift) findings.push(`${rel}: ${d.title}`);
    if (declared.length > 0) {
      console.log(`   ✓ ${rel} declares ${declared.length} rule id(s) across ${policies.length} policy file(s).`);
    }
  }
  return findings;
}

async function main() {
  console.log('⚖️  Executable OPA Tests & Native/OPA Parity Gate (GT-149)');

  const resolved = resolveEvaluationScope(acceptedTopologies());
  if (!resolved.ok) {
    // The refusal. There is deliberately no fallback branch here: the failure carries no
    // scope, so "evaluate everything instead" is not an option the code can reach.
    console.error('❌ OPA parity gate refuses to run: its scope could not be determined.');
    console.error(`   ${resolved.reason}`);
    console.error('   Re-run from the repository root, or declare a full sweep explicitly with EVOLITH_PARITY_FULL=true.');
    process.exit(1);
  }

  const { topologies, scope } = resolved;
  console.log(`   Scope: ${FULL_RUN ? 'FULL (declared via EVOLITH_PARITY_FULL)' : 'changed topologies'} — ${topologies.length} accepted topology(ies).`);
  console.log(formatScopeContract(scope).split('\n').map((l) => `   ${l}`).join('\n'));
  const scopeFindings = await checkDeclaredScope();
  if (scopeFindings.length > 0) {
    console.error('❌ GT-675: the compiled OPA bundle cannot state which rules it decides.');
    for (const f of scopeFindings) console.error(`   - ${f}`);
    process.exit(1);
  }

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
