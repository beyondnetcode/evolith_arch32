import {
  RawResult,
  EnvelopeShape,
  CanonicalVerdict,
  Finding,
  Surface,
  Confidence,
} from './types';

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
  return {
    success: typeof env?.success === 'boolean' ? env.success : null,
    verdict: pickString(data.verdict ?? data.status),
    phase: pickString(data.phase),
    evaluatedBy: pickString(data.evaluatedBy),
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

  return findings;
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
