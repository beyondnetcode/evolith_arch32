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
// Fixture congruence — "is what I pinned what the Core actually emits?"
// ---------------------------------------------------------------------------

/**
 * Structural congruence of a published response fixture against a LIVE Core
 * response.
 *
 * A fixture is only worth pinning if the producer proves it still resembles what
 * it produces. The first version of these fixtures was hand-reduced to the bound
 * subset, which meant a consumer that pinned {@link EVALUATION_RESULT_PASS_FIXTURE}
 * would have modelled a `results` object with a `gate` key and nothing else — no
 * `artifact`, no `compliance` — a shape the Core has never emitted. That is the
 * same class of defect as the incident itself: a contract nobody compares with
 * reality.
 *
 * Congruence is checked at the level of KEYS and JS types, never values: the
 * fixture is a shape, not a golden file, so a new message string or a different
 * timestamp is not a drift, while a renamed/removed/retyped field is. The
 * fixture must be a structural SUBSET of the live payload — the Core is free to
 * add fields (that is what `semver-minor` means for a producer), but it may not
 * take one away.
 */
export function checkFixtureCongruence(
  live: unknown,
  fixture: unknown,
  path = '$',
): ContractCheckResult {
  const missing: string[] = [];
  walkCongruence(live, fixture, path, missing);
  return { ok: missing.length === 0, missing };
}

/** Throwing variant, for use as a CI gate. */
export function assertFixtureCongruence(live: unknown, fixture: unknown): void {
  const { ok, missing } = checkFixtureCongruence(live, fixture);
  if (!ok) {
    throw new Error(
      `A published contract fixture no longer matches what the Core emits:\n - ${missing.join('\n - ')}`,
    );
  }
}

const jsType = (v: unknown): string => (v === null ? 'null' : Array.isArray(v) ? 'array' : typeof v);

function walkCongruence(live: unknown, fixture: unknown, path: string, missing: string[]): void {
  if (fixture === undefined) return;

  const ft = jsType(fixture);
  const lt = jsType(live);

  if (ft !== lt) {
    missing.push(`${path}: fixture is ${ft} but the live response is ${lt}`);
    return;
  }

  if (ft === 'array') {
    const f = fixture as unknown[];
    const l = live as unknown[];
    // An empty fixture array constrains only the type. A populated one pins the
    // ELEMENT shape, so the live response must carry at least one element.
    if (f.length > 0 && l.length === 0) {
      missing.push(`${path}: fixture pins an element shape but the live array is empty`);
      return;
    }
    for (let i = 0; i < f.length && i < l.length; i += 1) {
      walkCongruence(l[i], f[i], `${path}[${i}]`, missing);
    }
    return;
  }

  if (ft === 'object') {
    const f = fixture as Record<string, unknown>;
    const l = live as Record<string, unknown>;
    for (const key of Object.keys(f)) {
      if (f[key] === undefined) continue;
      if (!(key in l)) {
        missing.push(`${path}.${key}: present in the fixture, absent from the live response`);
        continue;
      }
      walkCongruence(l[key], f[key], `${path}.${key}`, missing);
    }
  }
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
 * a blocking GOVERNANCE-rule violation (`GOV-000`, native evaluator).
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

/**
 * An inline evaluation request whose satellite is GOVERNANCE-CONFORMANT — the
 * manifest is present and the phase's required artifact exists — so the only way
 * it can fail is on the POLICY itself: an SDLC gate whose rule is a `.rego` file
 * executed by `OpaEvaluator`.
 *
 * This is the case GT-573 was reopened for. The first round of this contract
 * proved a governance-rule FAIL round-trips, but a governance-rule FAIL is
 * produced by the native evaluator and surfaces as the synthetic
 * `general-rulesets` gate. The claim the product actually makes is about
 * POLICY-gate decisions, and that path — SDLC gate → `.rego` rule → OPA
 * violation → `results.gate[]` → the consumer's `ToDecision` — was never
 * exercised end to end. The producer-side spec drives exactly this request.
 */
export const EVALUATE_INLINE_OPA_GATE_FAIL_REQUEST = Object.freeze({
  kinds: Object.freeze(['gate', 'compliance']),
  phaseId: 'construction',
  evaluationInput: Object.freeze({
    files: Object.freeze({
      'evolith.yaml': CONFORMANT_EVOLITH_YAML,
      'docs/architecture.md': '# Architecture\n',
    }),
  }),
});

// ---------------------------------------------------------------------------
// Response fixtures — canonical EvaluationResult (the ADR-0073 `data` payload)
// ---------------------------------------------------------------------------

/*
 * The three response fixtures below are CAPTURES of what the Core's inline
 * branch actually emits for the three request fixtures above — not hand-reduced
 * sketches of the bound subset. That distinction is the point: a consumer pins a
 * fixture and generates/handwrites a DTO from it, so a fixture that omits
 * `results.artifact` or `results.compliance` teaches the consumer a shape the
 * producer has never sent. `evaluation.consumer-contract.spec.ts` in the Core
 * asserts each of them against a live response with
 * {@link checkFixtureCongruence}, so they cannot silently rot.
 *
 * Only `evaluatedAt` is normalised to a fixed instant; every other value is as
 * emitted.
 */

/** What the Core emits for {@link EVALUATE_INLINE_PASS_REQUEST}. */
export const EVALUATION_RESULT_PASS_FIXTURE: TrackerBoundEvaluationResult = Object.freeze({
  overallVerdict: 'PASS',
  outcome: 'approved',
  results: Object.freeze({
    gate: Object.freeze([]),
    artifact: Object.freeze([]),
    compliance: Object.freeze({
      verdict: 'PASS',
      totalChecks: 0,
      passedChecks: 0,
      failedChecks: 0,
      skippedChecks: 0,
    }),
  }),
  rulesExecuted: Object.freeze([]),
  policiesApplied: Object.freeze([]),
  gaps: Object.freeze([]),
  risks: Object.freeze([]),
  missingEvidence: Object.freeze([]),
  incompleteArtifacts: Object.freeze([]),
  recommendations: Object.freeze([]),
  requiredActions: Object.freeze([]),
  decisionRecommendation: Object.freeze({
    subjectType: 'phase',
    subjectRef: 'construction',
    recommendedVerdict: 'PASS',
    binding: false,
    recommendedBy: 'evolith-core',
  }),
  confidence: 1,
  rationale: 'All 0 gate(s) passed (0/0 rules).',
  versions: Object.freeze({ core: '1.0.5' }),
  evaluatedAt: '2026-07-26T00:00:00.000Z',
  schemaVersion: '1.0.0',
});

/**
 * What the Core emits for {@link EVALUATE_INLINE_FAIL_REQUEST} — a GOVERNANCE
 * (native-evaluator) FAIL, surfaced through the synthetic `general-rulesets`
 * gate. Note `rulesExecuted[].engine === 'native'`: this fixture does NOT prove
 * anything about policy enforcement, which is why
 * {@link EVALUATION_RESULT_OPA_GATE_FAIL_FIXTURE} exists.
 */
export const EVALUATION_RESULT_FAIL_FIXTURE: TrackerBoundEvaluationResult = Object.freeze({
  overallVerdict: 'FAIL',
  outcome: 'rejected',
  results: Object.freeze({
    gate: Object.freeze([
      Object.freeze({
        gateId: 'general-rulesets',
        verdict: 'FAIL',
        artifactResults: Object.freeze([
          Object.freeze({
            artifactId: 'governance',
            verdict: 'FAIL',
            ruleRefs: Object.freeze(['GOV-000']),
            gaps: Object.freeze([
              Object.freeze({
                id: 'general-rulesets:GOV-000',
                requirementRef: 'GOV-000',
                severity: 'error',
                message:
                  'Missing evolith.yaml: Every satellite repository must have an evolith.yaml file at the root.',
                location: 'governance',
              }),
            ]),
          }),
        ]),
        risks: Object.freeze([]),
        gaps: Object.freeze([
          Object.freeze({
            id: 'general-rulesets:GOV-000',
            requirementRef: 'GOV-000',
            severity: 'error',
            message:
              'Missing evolith.yaml: Every satellite repository must have an evolith.yaml file at the root.',
            location: 'governance',
          }),
        ]),
        requiredActions: Object.freeze([
          Object.freeze({
            id: 'fix:general-rulesets:GOV-000',
            gapId: 'general-rulesets:GOV-000',
            description:
              'Missing evolith.yaml: Every satellite repository must have an evolith.yaml file at the root.',
            blocking: true,
            remediation: '',
          }),
        ]),
      }),
    ]),
    artifact: Object.freeze([
      Object.freeze({ artifactId: 'governance', verdict: 'FAIL', ruleRefs: Object.freeze(['GOV-000']) }),
    ]),
    compliance: Object.freeze({
      verdict: 'FAIL',
      score: 0,
      totalChecks: 1,
      passedChecks: 0,
      failedChecks: 1,
      skippedChecks: 0,
    }),
  }),
  rulesExecuted: Object.freeze([
    Object.freeze({
      ruleId: 'GOV-000',
      rulesetRef: 'rulesets/governance/GOV-000',
      engine: 'native',
      verdict: 'FAIL',
    }),
  ]),
  gaps: Object.freeze([
    Object.freeze({
      id: 'general-rulesets:GOV-000',
      requirementRef: 'GOV-000',
      severity: 'error',
      message:
        'Missing evolith.yaml: Every satellite repository must have an evolith.yaml file at the root.',
      location: 'governance',
    }),
  ]),
  incompleteArtifacts: Object.freeze(['governance']),
  decisionRecommendation: Object.freeze({
    subjectType: 'phase',
    subjectRef: 'construction',
    recommendedVerdict: 'FAIL',
    binding: false,
    recommendedBy: 'evolith-core',
  }),
  confidence: 0,
  rationale: '1/1 gate(s) failed (1/1 rules failed).',
  versions: Object.freeze({ core: '1.0.5' }),
  evaluatedAt: '2026-07-26T00:00:00.000Z',
  schemaVersion: '1.0.0',
});

/**
 * What the Core emits for {@link EVALUATE_INLINE_OPA_GATE_FAIL_REQUEST}: a
 * genuine OPA POLICY-gate FAIL.
 *
 * The distinguishing marks against the governance FAIL above, and the reason
 * this fixture is the one that closes the acceptance criterion:
 *
 *  - `results.gate[0].gateId` is a real SDLC gate id from the Core's structured
 *    gate corpus, NOT the synthetic `general-rulesets` bucket;
 *  - `results.gate[0].phaseId` is populated, so the ledger row can be attributed
 *    to a phase;
 *  - `rulesExecuted[0].engine === 'opa'` and `rulesetRef` ends in `.rego` — the
 *    policy engine ran and returned a violation;
 *  - and `trackerDecisionFrom` over it is `FAILED`, which is the whole assertion:
 *    a policy violation reaches the Tracker's gate ledger as a decision, not as
 *    `SKIPPED`.
 *
 * Ids and messages are the fixture corpus's, not production values; the SHAPE is
 * the contract.
 */
export const EVALUATION_RESULT_OPA_GATE_FAIL_FIXTURE: TrackerBoundEvaluationResult = Object.freeze({
  overallVerdict: 'FAIL',
  outcome: 'rejected',
  results: Object.freeze({
    gate: Object.freeze([
      Object.freeze({
        gateId: 'gate-f3-architecture-conformance',
        phaseId: 'construction',
        verdict: 'FAIL',
        artifactResults: Object.freeze([
          Object.freeze({
            artifactId: 'docs/architecture.md',
            verdict: 'FAIL',
            ruleRefs: Object.freeze(['opa-architecture-boundaries']),
            gaps: Object.freeze([
              Object.freeze({
                id: 'gate-f3-architecture-conformance:opa-architecture-boundaries',
                requirementRef: 'opa-architecture-boundaries',
                severity: 'error',
                message: 'ARCH-001: presentation layer imports infrastructure directly',
                location: 'docs/architecture.md',
              }),
            ]),
          }),
        ]),
        risks: Object.freeze([]),
        gaps: Object.freeze([
          Object.freeze({
            id: 'gate-f3-architecture-conformance:opa-architecture-boundaries',
            requirementRef: 'opa-architecture-boundaries',
            severity: 'error',
            message: 'ARCH-001: presentation layer imports infrastructure directly',
            location: 'docs/architecture.md',
          }),
        ]),
        requiredActions: Object.freeze([
          Object.freeze({
            id: 'fix:gate-f3-architecture-conformance:opa-architecture-boundaries',
            gapId: 'gate-f3-architecture-conformance:opa-architecture-boundaries',
            description: 'ARCH-001: presentation layer imports infrastructure directly',
            blocking: true,
            remediation:
              'Ensure docs/architecture.md exists and satisfies: layer boundaries hold',
          }),
        ]),
      }),
    ]),
    artifact: Object.freeze([
      Object.freeze({
        artifactId: 'docs/architecture.md',
        verdict: 'FAIL',
        ruleRefs: Object.freeze(['opa-architecture-boundaries']),
      }),
    ]),
    compliance: Object.freeze({
      verdict: 'FAIL',
      score: 0,
      totalChecks: 1,
      passedChecks: 0,
      failedChecks: 1,
      skippedChecks: 0,
    }),
  }),
  rulesExecuted: Object.freeze([
    Object.freeze({
      ruleId: 'opa-architecture-boundaries',
      rulesetRef: 'rulesets/opa/architecture-boundaries.rego',
      engine: 'opa',
      verdict: 'FAIL',
    }),
  ]),
  gaps: Object.freeze([
    Object.freeze({
      id: 'gate-f3-architecture-conformance:opa-architecture-boundaries',
      requirementRef: 'opa-architecture-boundaries',
      severity: 'error',
      message: 'ARCH-001: presentation layer imports infrastructure directly',
      location: 'docs/architecture.md',
    }),
  ]),
  incompleteArtifacts: Object.freeze(['docs/architecture.md']),
  decisionRecommendation: Object.freeze({
    subjectType: 'phase',
    subjectRef: 'construction',
    recommendedVerdict: 'FAIL',
    binding: false,
    recommendedBy: 'evolith-core',
  }),
  confidence: 0,
  rationale: '1/1 gate(s) failed (1/1 rules failed).',
  versions: Object.freeze({ core: '1.0.5' }),
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
