/**
 * GT-573 — the pinnable request/response pair for `POST /api/v1/evaluate`, plus
 * the CONSUMER-DRIVEN oracle that says whether a Core response is usable by the
 * Tracker.
 *
 * Why this lives in the published contract package
 * ------------------------------------------------
 * The Tracker (`CoreEvaluationGateway` / `CoreEvaluationDtos`) binds a small,
 * specific subset of the canonical `EvaluationResult`. When the Core's inline
 * evaluation branch answered with the legacy `{ topology, gates, summary }`
 * envelope instead, EVERY bound field was absent, the consumer's `Passed` stayed
 * null, its `Gates` stayed empty, and its decision mapper fell through to
 * `SKIPPED` — persisting a passing-looking ledger row over a real architectural
 * FAIL, with both CIs green.
 *
 * Nothing in either repository could have caught that, because the contract only
 * existed as two independent mappers. It exists here now: the producer asserts
 * against {@link checkTrackerEvaluationContract} in its own CI, and the consumer
 * pins these fixtures. A shape drift turns one of them red.
 *
 * Everything below is plain data and pure functions — no imports, no I/O — so an
 * external consumer can depend on it at a pinned SemVer.
 */

// ---------------------------------------------------------------------------
// The exact surface the Tracker binds
// ---------------------------------------------------------------------------

/**
 * Top-level `EvaluationResult` keys the Tracker's `CoreEvaluationEnvelope`
 * declares. Absent-or-null on any of these is what produced the `SKIPPED`
 * regression.
 */
export const TRACKER_BOUND_RESULT_KEYS = Object.freeze([
  'overallVerdict',
  'outcome',
  'results',
  'evaluatedAt',
] as const);

/** Keys of `results.gate[]` the Tracker's `CoreEvaluationGateEnvelope` binds. */
export const TRACKER_BOUND_GATE_KEYS = Object.freeze(['gateId', 'verdict', 'gaps'] as const);

/** Keys of `results.gate[].gaps[]` the Tracker's `CoreGapFindingDto` binds. */
export const TRACKER_BOUND_GAP_KEYS = Object.freeze([
  'id',
  'requirementRef',
  'severity',
  'message',
  'location',
] as const);

/**
 * Fields the Tracker's DTO declares that the published `EvaluationResult`
 * contract does NOT define (`rulesets/schema/evaluation-result.schema.json`).
 * They are documented — not asserted — so nobody rediscovers them as a bug:
 * `resolvedTopology` never existed on the canonical result, and the canonical
 * gate carries `phaseId`, not `phase`. They are advisory on the consumer side
 * (its decision mapper reads none of them), but closing the gap needs a change
 * in the Core domain contract or in the consumer's DTO, not here.
 */
export const TRACKER_UNCONTRACTED_FIELDS = Object.freeze([
  'resolvedTopology',
  'results.gate[].phase',
  'results.gate[].rulesetRef',
  'results.gate[].rulesetVersion',
] as const);

// ---------------------------------------------------------------------------
// Structural types (mirrors of the bound subset — deliberately loose)
// ---------------------------------------------------------------------------

export interface TrackerBoundGap {
  readonly id?: string;
  readonly requirementRef?: string;
  readonly severity?: string;
  readonly message?: string;
  readonly location?: string;
}

export interface TrackerBoundGate {
  readonly gateId?: string;
  readonly verdict?: string;
  readonly gaps?: readonly TrackerBoundGap[];
  readonly [k: string]: unknown;
}

/** The subset of an `EvaluationResult` the consumer actually reads. */
export interface TrackerBoundEvaluationResult {
  readonly overallVerdict?: string;
  readonly outcome?: string;
  readonly evaluatedAt?: string;
  readonly results?: { readonly gate?: readonly TrackerBoundGate[] };
  readonly [k: string]: unknown;
}

/** Verdict the consumer derives and persists in its gate ledger. */
export type TrackerDecision = 'PASSED' | 'FAILED' | 'SKIPPED';

export interface ContractCheckResult {
  readonly ok: boolean;
  /** Human-readable reasons, one per unmet expectation. Empty when `ok`. */
  readonly missing: readonly string[];
}

// ---------------------------------------------------------------------------
// The consumer oracle
// ---------------------------------------------------------------------------

const isNonEmptyString = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0;

/**
 * Faithful port of the Tracker's `CoreEvaluationGateway.ToDecision` (and the
 * `Passed` / `Gates` projection that feeds it). Given a Core response payload
 * (already unwrapped from the ADR-0073 `data` envelope) it returns the decision
 * the Tracker would persist.
 *
 * This is the whole point of the fixture module: the producer can assert, in its
 * own CI, that a genuine architectural FAIL is not recorded as `SKIPPED`.
 */
export function trackerDecisionFrom(result: TrackerBoundEvaluationResult | null | undefined): TrackerDecision {
  const overall = result?.overallVerdict;
  // `Passed` is null unless overallVerdict is a non-blank string.
  const passed = isNonEmptyString(overall) ? overall.toUpperCase() === 'PASS' : null;
  if (passed === true) return 'PASSED';
  if (passed === false) return 'FAILED';

  const gates = result?.results?.gate ?? [];
  const normalized = gates.map((g) => normalizeGateVerdict(g?.verdict));
  if (normalized.some((v) => v === 'failed')) return 'FAILED';
  if (normalized.some((v) => v === 'passed')) return 'PASSED';
  return 'SKIPPED';
}

/** Port of the consumer's `NormalizeGateVerdict`. */
export function normalizeGateVerdict(verdict: string | undefined | null): string {
  switch (verdict?.toLowerCase()) {
    case 'pass':
    case 'passed':
    case 'success':
      return 'passed';
    case 'fail':
    case 'failed':
    case 'error':
      return 'failed';
    case 'skip':
    case 'skipped':
      return 'skipped';
    default:
      return verdict ?? 'skipped';
  }
}

/**
 * Asserts that a Core `EvaluationResult` payload carries everything the Tracker
 * binds, POPULATED — not merely present. Gate entries are checked only when the
 * response reports gates (a clean satellite legitimately reports none).
 */
export function checkTrackerEvaluationContract(
  result: TrackerBoundEvaluationResult | null | undefined,
): ContractCheckResult {
  const missing: string[] = [];
  if (!result || typeof result !== 'object') {
    return { ok: false, missing: ['the response payload is not an object'] };
  }

  if (!isNonEmptyString(result.overallVerdict)) {
    missing.push('overallVerdict must be a non-empty string (null ⇒ the consumer records SKIPPED)');
  }
  if (!isNonEmptyString(result.outcome)) {
    missing.push('outcome must be a non-empty string');
  }
  if (!isNonEmptyString(result.evaluatedAt) || Number.isNaN(Date.parse(result.evaluatedAt as string))) {
    missing.push('evaluatedAt must be an ISO-8601 timestamp the consumer can bind to DateTime');
  }
  if (!result.results || typeof result.results !== 'object') {
    missing.push('results must be an object exposing the per-kind sub-results');
  } else if (result.results.gate !== undefined && !Array.isArray(result.results.gate)) {
    missing.push('results.gate must be an array when present');
  }

  for (const [i, gate] of (result.results?.gate ?? []).entries()) {
    if (!isNonEmptyString(gate?.gateId)) missing.push(`results.gate[${i}].gateId is empty`);
    if (!isNonEmptyString(gate?.verdict)) missing.push(`results.gate[${i}].verdict is empty`);
    if (gate?.gaps !== undefined && !Array.isArray(gate.gaps)) {
      missing.push(`results.gate[${i}].gaps must be an array when present`);
    }
    for (const [j, gap] of (gate?.gaps ?? []).entries()) {
      if (!isNonEmptyString(gap?.id)) missing.push(`results.gate[${i}].gaps[${j}].id is empty`);
      if (!isNonEmptyString(gap?.message)) missing.push(`results.gate[${i}].gaps[${j}].message is empty`);
      if (!isNonEmptyString(gap?.severity)) missing.push(`results.gate[${i}].gaps[${j}].severity is empty`);
    }
  }

  return { ok: missing.length === 0, missing };
}

/** Throwing variant, for use as a CI gate. */
export function assertTrackerEvaluationContract(
  result: TrackerBoundEvaluationResult | null | undefined,
): void {
  const { ok, missing } = checkTrackerEvaluationContract(result);
  if (!ok) {
    throw new Error(
      `Core EvaluationResult drifted from the Tracker consumer contract:\n - ${missing.join('\n - ')}`,
    );
  }
}

// ---------------------------------------------------------------------------
// Request fixtures — inline (`evaluationInput.files`) evaluation
// ---------------------------------------------------------------------------

const CONFORMANT_EVOLITH_YAML = JSON.stringify({
  coreRef: { version: '1.0.0', path: '../evolith' },
  governance: { version: '1.0.0' },
  product: { name: 'contract-fixture', type: 'enterprise-application' },
});

/**
 * A conformant inline evaluation request: the satellite manifest is present, so
 * the Core has something valid to evaluate.
 */
export const EVALUATE_INLINE_PASS_REQUEST = Object.freeze({
  kinds: Object.freeze(['gate', 'compliance']),
  phaseId: 'construction',
  evaluationInput: Object.freeze({
    files: Object.freeze({
      'evolith.yaml': CONFORMANT_EVOLITH_YAML,
      'docs/prd.md': '# PRD\n',
    }),
  }),
});

/**
 * A NON-conformant inline evaluation request: `evolith.yaml` is absent, which is
 * a blocking governance violation. This is the fixture that matters — it is the
 * case that used to be persisted as `SKIPPED`.
 */
export const EVALUATE_INLINE_FAIL_REQUEST = Object.freeze({
  kinds: Object.freeze(['gate', 'compliance']),
  phaseId: 'construction',
  evaluationInput: Object.freeze({
    files: Object.freeze({
      'docs/prd.md': '# PRD\n',
    }),
  }),
});

// ---------------------------------------------------------------------------
// Response fixtures — canonical EvaluationResult (the ADR-0073 `data` payload)
// ---------------------------------------------------------------------------

/** Canonical shape of a PASSING evaluation, reduced to the bound surface. */
export const EVALUATION_RESULT_PASS_FIXTURE: TrackerBoundEvaluationResult = Object.freeze({
  overallVerdict: 'PASS',
  outcome: 'approved',
  results: Object.freeze({ gate: Object.freeze([]) }),
  evaluatedAt: '2026-07-26T00:00:00.000Z',
  schemaVersion: '1.0.0',
});

/** Canonical shape of a FAILING evaluation, reduced to the bound surface. */
export const EVALUATION_RESULT_FAIL_FIXTURE: TrackerBoundEvaluationResult = Object.freeze({
  overallVerdict: 'FAIL',
  outcome: 'rejected',
  results: Object.freeze({
    gate: Object.freeze([
      Object.freeze({
        gateId: 'general-rulesets',
        phaseId: undefined,
        verdict: 'FAIL',
        gaps: Object.freeze([
          Object.freeze({
            id: 'general-rulesets:GOV-000',
            requirementRef: 'GOV-000',
            severity: 'error',
            message: 'Missing evolith.yaml: the satellite manifest is required',
            location: 'governance',
          }),
        ]),
      }),
    ]),
  }),
  evaluatedAt: '2026-07-26T00:00:00.000Z',
  schemaVersion: '1.0.0',
});

/**
 * The LEGACY envelope the inline branch used to return, kept as a negative
 * fixture. `checkTrackerEvaluationContract` must reject it and
 * `trackerDecisionFrom` must return `SKIPPED` for it — that pair is the exact
 * regression GT-573 fixes, so a test over these two fixtures is a real
 * anti-vacuous-pass self-check rather than a tautology.
 */
export const LEGACY_INLINE_ENVELOPE_FIXTURE = Object.freeze({
  topology: 'modular-monolith',
  gates: Object.freeze([
    Object.freeze({
      gateId: 'general-rulesets',
      gateName: 'General Rulesets',
      verdict: 'failed',
      artifactEvaluations: Object.freeze([]),
    }),
  ]),
  summary: Object.freeze({
    totalGates: 1,
    passedGates: 0,
    failedGates: 1,
    totalRules: 1,
    passedRules: 0,
    failedRules: 1,
  }),
});
