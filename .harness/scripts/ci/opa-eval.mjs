/**
 * GT-149 — Pinned, reproducible OPA evaluator (no undeclared host binary).
 *
 * Evaluates a pre-compiled OPA policy WASM bundle through the in-process
 * `@open-policy-agent/opa-wasm` runtime. The bundle is produced by the pinned
 * `compile-opa-wasm` build step, so evaluation needs no host `opa` binary.
 * Returns normalized decisions plus execution duration for parity comparison
 * and aggregate efficiency telemetry.
 */

import { loadPolicy } from '@open-policy-agent/opa-wasm';

/** Evaluate a WASM policy against `input`. Returns `{ result, durationMs }`. */
export async function evaluateWasm(wasmBytes, input = {}, { entrypoint } = {}) {
  const policy = await loadPolicy(wasmBytes);
  const start = process.hrtime.bigint();
  const raw = policy.evaluate(input, entrypoint);
  const durationMs = Number(process.hrtime.bigint() - start) / 1e6;
  const result = Array.isArray(raw) && raw.length ? raw[0].result : raw;
  return { result, durationMs };
}

/**
 * Normalize a policy result into the canonical decision contract used by the
 * parity gate: `{ ruleId, severity, message, file }`. Accepts the common shapes
 * (array of violations, or `{ violations | result }`).
 */
export function normalizeOpaDecisions(result) {
  let items = result;
  if (!Array.isArray(items)) {
    items = result?.violations ?? result?.result ?? result?.deny ?? [];
  }
  if (!Array.isArray(items)) return [];
  return items.map((v) => ({
    ruleId: v.id ?? v.ruleId ?? v.rule_id ?? null,
    severity: v.severity ?? 'error',
    message: v.message ?? v.msg ?? '',
    file: v.file ?? v.evidence ?? v.location ?? null,
  }));
}
