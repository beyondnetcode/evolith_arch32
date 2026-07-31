import {
  RawResult,
  EnvelopeShape,
  CanonicalVerdict,
  Finding,
  Surface,
  Confidence,
} from './types';
import { TreeDiff, isEmptyDiff, summarizeDiff } from './state';

let seq = 0;
export function resetFindingSeq(): void {
  seq = 0;
}
function nextId(): string {
  seq += 1;
  return `EXPLORE-${String(seq).padStart(3, '0')}`;
}

// -------------------------------------------------------------------------
// Envelope oracle — every surface must emit a parseable ADR-0073 envelope with
// a boolean `success`. (This is exactly what the false-green surface-parity spec
// GT-479 fails to enforce; here it is unconditional.)
// -------------------------------------------------------------------------

export function checkEnvelope(r: RawResult): Finding | null {
  if (r.transportError && r.envelope == null) {
    return finding(r.operationId, 'transport', 'P2', 'confirmed', [r.surface],
      `${r.surface} transport failed for ${r.operationId}`,
      `The ${r.surface} surface returned no usable response.`,
      { transportError: r.transportError, rawText: snippet(r.rawText) });
  }
  if (r.envelope == null) {
    return finding(r.operationId, 'contract', 'P2', 'confirmed', [r.surface],
      `${r.surface} did not emit a parseable ADR-0073 envelope for ${r.operationId}`,
      `Output could not be parsed into an { success, data|error, meta } envelope.`,
      { rawText: snippet(r.rawText) });
  }
  if (typeof r.envelope.success !== 'boolean') {
    return finding(r.operationId, 'contract', 'P3', 'confirmed', [r.surface],
      `${r.surface} envelope is missing a boolean success field for ${r.operationId}`,
      `ADR-0073 requires a boolean top-level success.`,
      { envelope: r.envelope });
  }
  return null;
}

// -------------------------------------------------------------------------
// Canonical verdict — normalize any surface's envelope to a comparable shape.
// -------------------------------------------------------------------------

export function toCanonical(env: EnvelopeShape | null): CanonicalVerdict {
  const data = (env?.data ?? {}) as Record<string, unknown>;
  const error = (env?.error ?? {}) as Record<string, unknown>;
  return {
    success: typeof env?.success === 'boolean' ? env.success : null,
    verdict: pickString(data.verdict ?? data.status),
    phase: pickString(data.phase),
    evaluatedBy: pickString(data.evaluatedBy),
    errorCode: pickString(error.code),
  };
}

// -------------------------------------------------------------------------
// Consistency oracle — the star oracle. Compares the canonical verdicts of an
// operation across the surfaces that returned an envelope. `verified` bindings
// yield CONFIRMED findings; unverified ones yield HYPOTHESIS findings (the
// argument equivalence is not yet proven, so a divergence may be a binding gap).
// -------------------------------------------------------------------------

export function checkConsistency(
  operationId: string,
  results: RawResult[],
  verified: boolean,
): Finding[] {
  const withEnvelope = results.filter((r) => r.envelope != null);
  if (withEnvelope.length < 2) return [];

  const confidence: Confidence = verified ? 'confirmed' : 'hypothesis';
  const findings: Finding[] = [];
  const surfaces = withEnvelope.map((r) => r.surface);
  const canon = withEnvelope.map((r) => ({ surface: r.surface, v: toCanonical(r.envelope) }));

  // success agreement
  const successes = new Set(canon.map((c) => String(c.v.success)));
  if (successes.size > 1) {
    findings.push(finding(operationId, 'consistency', verified ? 'P1' : 'P2', confidence, surfaces,
      `Cross-surface success divergence on ${operationId}`,
      `Surfaces disagree on success: ${canon.map((c) => `${c.surface}=${c.v.success}`).join(', ')}.`,
      { perSurface: canon }));
  }

  // verdict agreement (only where a verdict is present on ≥2 surfaces)
  const verdicts = canon.filter((c) => c.v.verdict != null);
  const distinctVerdicts = new Set(verdicts.map((c) => c.v.verdict));
  if (verdicts.length >= 2 && distinctVerdicts.size > 1) {
    findings.push(finding(operationId, 'consistency', verified ? 'P1' : 'P2', confidence, surfaces,
      `Cross-surface verdict divergence on ${operationId}`,
      `Surfaces returned different verdicts: ${verdicts.map((c) => `${c.surface}=${c.v.verdict}`).join(', ')}.`,
      { perSurface: canon }));
  }

  // error-code agreement — when surfaces AGREE on failure (success=false) they
  // should fail for the same reason. Different error.codes mean divergent
  // failure semantics that a success-only comparison masks (e.g. one surface
  // RULESET_NOT_FOUND vs another INTERNAL_ERROR). Only meaningful when ALL
  // enveloped surfaces failed — a success/failure split is already reported above.
  // FORBIDDEN is excluded: it is the MCP mutative-approval / ABAC gate (an
  // access-control outcome), orthogonal to WHY the operation would fail, so
  // comparing it to a domain error code is apples-to-oranges.
  const allFailed = canon.every((c) => c.v.success === false);
  const errorCodes = canon.filter((c) => c.v.errorCode != null && c.v.errorCode !== 'FORBIDDEN');
  const distinctErrorCodes = new Set(errorCodes.map((c) => c.v.errorCode));
  if (allFailed && errorCodes.length >= 2 && distinctErrorCodes.size > 1) {
    findings.push(finding(operationId, 'consistency', verified ? 'P1' : 'P2', confidence, surfaces,
      `Cross-surface error-code divergence on ${operationId}`,
      `All surfaces failed but with different error codes: ${errorCodes.map((c) => `${c.surface}=${c.v.errorCode}`).join(', ')}.`,
      { perSurface: canon }));
  }

  return findings;
}

// -------------------------------------------------------------------------
// No-effect oracle (GT-643) — the one that asks whether a flag with no effect
// had no effect.
//
// Every oracle above compares REPLIES. A contract whose whole content is the
// absence of an effect is invisible to those: `agents install --dry-run`
// answered `success: true` and meant it, having written the agent to disk. This
// oracle compares STATE — a content fingerprint of the watched roots, before and
// after — so the only thing it can be fooled by is a write it cannot see, which
// is why the watched roots are declared per contract rather than guessed.
// -------------------------------------------------------------------------

export function checkNoEffect(
  contractId: string,
  flag: string,
  surface: Surface,
  diffs: TreeDiff[],
): Finding[] {
  const moved = diffs.filter((d) => !isEmptyDiff(d));
  if (moved.length === 0) return [];
  return [
    finding(contractId, 'contract', 'P1', 'confirmed', [surface],
      `${surface}: \`${flag}\` CHANGED STATE`,
      `The whole observable contract of this flag is that nothing changes, and something did. `
        + moved.map((d) => `${d.root}: ${summarizeDiff(d)}`).join(' | '),
      { flag, surface, diffs: moved }),
  ];
}

/**
 * The contrast half. A no-effect assertion over an operation that no longer does
 * anything is satisfied by the breakage, not by the guarantee — so the same
 * operation WITHOUT the flag has to be seen changing the very state the assertion
 * watches. An oracle that cannot fail is not evidence, and this is the specific
 * way this one could quietly become one.
 */
export function checkNoEffectContrast(
  contractId: string,
  flag: string,
  surface: Surface,
  diffs: TreeDiff[],
): Finding[] {
  if (diffs.some((d) => !isEmptyDiff(d))) return [];
  return [
    finding(contractId, 'contract', 'P1', 'confirmed', [surface],
      `${surface}: the contrast case for \`${flag}\` changed nothing either`,
      'The same operation without the flag wrote nothing, so the no-effect assertion for this '
        + 'contract proves nothing: it would pass just as well if the operation had stopped working.',
      { flag, surface, watched: diffs.map((d) => d.root) }),
  ];
}

// -------------------------------------------------------------------------

function finding(
  operationId: string,
  type: Finding['type'],
  severity: Finding['severity'],
  confidence: Confidence,
  surfaces: Surface[],
  title: string,
  detail: string,
  evidence: Record<string, unknown>,
): Finding {
  return { id: nextId(), operationId, type, severity, confidence, surfaces, title, detail, evidence };
}

function pickString(v: unknown): string | null {
  return typeof v === 'string' ? v : null;
}

function snippet(s: string, max = 400): string {
  const t = (s || '').trim();
  return t.length > max ? `${t.slice(0, max)}…` : t;
}
