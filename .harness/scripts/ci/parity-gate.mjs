/**
 * GT-149 — Native/OPA semantic parity gate.
 *
 * Compares the decisions of the Native and OPA evaluators for the same
 * canonical input and fails on verdict, rule-ID, severity, or evidence-location
 * drift. Pure and deterministic; the runner feeds it real evaluator output.
 *
 * Decision contract: `{ ruleId, severity, message, file }`.
 */

import { createHash } from 'node:crypto';

export const PARITY_SCHEMA_VERSION = '1.0';

/** Short content version for a policy/ruleset artifact (criterion 3). */
export function contentVersion(text) {
  return createHash('sha256').update(String(text ?? '')).digest('hex').slice(0, 12);
}

/**
 * Scope topologies for a CI run (criterion 4). A full/scheduled run or a run
 * with no change signal evaluates everything; otherwise only topologies whose
 * directory contains a changed policy/manifest/ruleset.
 */
export function scopeTopologies(topologies, changedPaths, full = false) {
  if (full || changedPaths == null) return topologies;
  return topologies.filter((t) => changedPaths.some((p) => p === t.dir || p.startsWith(`${t.dir}/`)));
}

const keyOf = (d) => String(d?.ruleId ?? '∅');

/** Differential between two decision lists. Returns an array of drift records. */
export function diffDecisions(nativeDecisions = [], opaDecisions = []) {
  const nativeMap = new Map(nativeDecisions.map((d) => [keyOf(d), d]));
  const opaMap = new Map(opaDecisions.map((d) => [keyOf(d), d]));
  const drift = [];

  for (const [k, n] of nativeMap) {
    const o = opaMap.get(k);
    if (!o) {
      drift.push({ ruleId: n.ruleId, kind: 'rule-id', title: 'rule fired in Native but not OPA' });
      continue;
    }
    if ((n.severity ?? null) !== (o.severity ?? null)) {
      drift.push({ ruleId: n.ruleId, kind: 'severity', title: `severity drift: native=${n.severity} opa=${o.severity}` });
    }
    if ((n.file ?? null) !== (o.file ?? null)) {
      drift.push({ ruleId: n.ruleId, kind: 'evidence', title: `evidence-location drift: native=${n.file} opa=${o.file}` });
    }
  }
  for (const [k, o] of opaMap) {
    if (!nativeMap.has(k)) {
      drift.push({ ruleId: o.ruleId, kind: 'rule-id', title: 'rule fired in OPA but not Native' });
    }
  }
  return drift;
}

/**
 * GT-675 — the axis `diffDecisions` above is structurally blind to.
 *
 * That function keys on decisions that FIRED, so two engines that both stayed
 * silent look identical — which is exactly how `OpaEvaluator` reported `passed`
 * for 234 rules it had no policy for, and no parity run noticed. Silence is not
 * agreement: it is either "evaluated, clean" or "never looked", and only one of
 * those may be called green.
 *
 * The invariant checked here is narrow ON PURPOSE. It is NOT "the two engines
 * must reach the same outcome" — measured on this corpus, 65 rules are decided by
 * OPA and skipped by native and 17 the other way round, and that complementary
 * coverage is legitimate; `ADR-0041` never promised parity of coverage. What is
 * never legitimate is an engine calling a rule `passed` when it cannot decide it.
 *
 * @param {object} input
 * @param {string} input.engine        which engine produced these outcomes
 * @param {Iterable<string>} input.declared  rule ids this engine can decide
 * @param {Array<{ruleId: string, outcome: string}>} input.outcomes
 */
export function diffCoverage({ engine, declared, outcomes = [] }) {
  const decidable = declared instanceof Set ? declared : new Set(declared ?? []);
  if (decidable.size === 0) {
    // An engine that declares nothing cannot be checked, and treating that as
    // "everything is drift" would make a broken build read as a coverage
    // collapse. Report it as one explicit finding instead.
    return [{
      ruleId: null,
      kind: 'undeclared-scope',
      title: `${engine} did not declare which rules it can decide — coverage is unverifiable`,
    }];
  }
  return outcomes
    .filter((o) => o?.outcome === 'passed' && !decidable.has(String(o.ruleId)))
    .map((o) => ({
      ruleId: o.ruleId,
      kind: 'unsupported-pass',
      title: `${engine} reported '${o.ruleId}' as passed but does not declare it can decide it`,
    }));
}

/** Build a versioned, machine-readable parity report for one fixture. */
export function parityReport({
  topology, fixture, nativeDecisions, opaDecisions, versions = {}, durationMs,
  // GT-675 — optional and additive: a caller that cannot produce them gets the
  // pre-existing report, and a caller that can gets the coverage axis too.
  coverage = null,
}) {
  const drift = diffDecisions(nativeDecisions, opaDecisions);
  if (coverage) {
    for (const engine of ['native', 'opa']) {
      if (!coverage[engine]) continue;
      drift.push(...diffCoverage({ engine, ...coverage[engine] }));
    }
  }
  // Verdict = "deny" if either engine reports any decision.
  const nativeVerdict = nativeDecisions.length ? 'deny' : 'allow';
  const opaVerdict = opaDecisions.length ? 'deny' : 'allow';
  if (nativeVerdict !== opaVerdict) {
    drift.unshift({ ruleId: null, kind: 'verdict', title: `verdict drift: native=${nativeVerdict} opa=${opaVerdict}` });
  }
  return {
    schemaVersion: PARITY_SCHEMA_VERSION,
    topology,
    fixture,
    versions,
    parity: drift.length === 0,
    drift,
    counts: { native: nativeDecisions.length, opa: opaDecisions.length, drift: drift.length },
    telemetry: { durationMs: durationMs ?? null },
  };
}
