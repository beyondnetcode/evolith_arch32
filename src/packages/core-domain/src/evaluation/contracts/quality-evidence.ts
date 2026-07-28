/**
 * Canonical Quality-Signal Evidence model (GT-533 · ADR-0111).
 *
 * The SINGLE type the stateless Core sees when an external quality/evidence tool
 * (Lighthouse, TestSprite, an LLM auditor, a structural-review rubric, …) enriches
 * an evaluation. It enters the {@link EvaluationContext} **inline**, exactly as
 * source files enter via the repository-access / `OverlayFileSystem` precedent
 * (ADR-0080), and the Core is indifferent to which tool produced a signal.
 *
 * Layering: PURE. The Core imports ONLY these canonical shapes and the pure
 * helpers below. Collection is a side-effectful ORCHESTRATION concern behind the
 * `IQualitySignalProvider` port (agent-runtime) — the Core NEVER executes
 * providers. Missing evidence for a dimension is reported as a `no-evidence`
 * signal, never as a failure the Core caused (ADR-0111 §3).
 *
 * This GENERALIZES the GT-530 `ObservabilityEvidence` adapter: that portable
 * trace shape is one concrete instance of the same idea; this is the uniform,
 * tenant-selectable seam for ANY evidence producer.
 *
 * GT-584 — `determinism` alone was a label nobody read. `Evidence` now also carries
 * the CALIBRATION the admissibility rule reads ({@link EvidenceCalibration}), and
 * {@link admitEvidenceBlocking} is the condition: a probabilistic signal may reach a
 * blocking verdict only while its measured error rate clears the declared policy and
 * is still fresh. Everything else degrades to advisory, visibly.
 */

/** Determinism class of a signal: deterministic tool vs probabilistic (LLM-based). */
export type Determinism = 'deterministic' | 'probabilistic';

/** Severity of a single finding attached to a piece of evidence. */
export type EvidenceFindingSeverity = 'info' | 'low' | 'medium' | 'high' | 'critical';

/** One normalized observation emitted by a quality/evidence tool. */
export interface EvidenceFinding {
  /** Stable, provider-scoped finding code (e.g. 'unused-css', 'a11y-contrast'). */
  readonly code: string;
  readonly severity: EvidenceFindingSeverity;
  readonly message: string;
  /** Optional pointer (path, url, selector) — a reference, never a copy. */
  readonly location?: string;
}

/**
 * Mandatory provenance for every piece of evidence — makes signals auditable
 * (ADR-0016) and lets policy weight or gate on them (ADR-0111 §6).
 */
export interface Provenance {
  /** Provider/adapter id that collected the signal (e.g. 'lighthouse'). */
  readonly collectedBy: string;
  /** Version of the adapter that produced the signal. */
  readonly adapterVersion: string;
  /** Hash of the collected artifact, for tamper-evidence and dedup. */
  readonly artifactHash: string;
  /** ISO-8601 collection timestamp. */
  readonly timestamp: string;
}

/**
 * GT-584 — the MEASURED error rate a probabilistic signal declares about itself.
 *
 * ADR-0111 gave `Evidence` a `determinism` field, and nothing ever read it as a
 * CONDITION for blocking. A probabilistic provider — an LLM auditor, a heuristic
 * scanner — could therefore reach a blocking verdict with no measured error rate at
 * all, and after the first bad block there was no record with which to argue that
 * the model was or was not at fault.
 *
 * These are the numbers that make the argument possible. They live on `Evidence`
 * itself, and not only on the Core's own detectors, because most probabilistic
 * signals arrive from OUTSIDE: the seam is `IQualitySignalProvider`, and a provider
 * must be able to state its own calibration in the same vocabulary the Core applies
 * to itself (`application/validators/architecture/signal-admissibility.ts`).
 *
 * Absent ⇒ UNMEASURED, which is never the same as "fine". A probabilistic signal
 * without this block cannot block (see {@link admitEvidenceBlocking}).
 */
export interface EvidenceCalibration {
  /** Measured true-positive rate in [0,1] — how often a flag is a real defect. */
  readonly truePositiveRate: number;
  /** Measured true-negative rate in [0,1] — the FALSE-BLOCK side of the matrix. */
  readonly trueNegativeRate: number;
  /** ISO-8601 instant the rates were measured. A measurement ages out (θ₃). */
  readonly measuredAt: string;
  /** Size of the labelled set the rates were computed over. */
  readonly sampleSize?: number;
  /** How the rates were obtained, in words a reviewer can judge. */
  readonly method?: string;
  /** Who produced the labels (a human panel, a golden corpus, …). */
  readonly labelledBy?: string;
}

/**
 * The canonical Evidence model — the ONLY thing the Core imports (ADR-0111 §2).
 * `source` and `dimension` are opaque strings to the Core; it evaluates the
 * received `Evidence[]` against derived criteria and policy without knowing which
 * tool produced them.
 */
export interface Evidence {
  /** Opaque producer label (e.g. 'lighthouse', 'testsprite'). */
  readonly source: string;
  /** Quality dimension (e.g. 'performance' | 'a11y' | 'code-quality' | 'testing'). */
  readonly dimension: string;
  readonly metrics: Readonly<Record<string, number>>;
  readonly findings: readonly EvidenceFinding[];
  readonly determinism: Determinism;
  readonly provenance: Provenance;
  /**
   * GT-584 — measured error rate. OPTIONAL by design: a deterministic signal needs
   * none, and a probabilistic one that omits it is reported as advisory rather than
   * rejected, because suppressing a finding is its own kind of dishonesty.
   */
  readonly calibration?: EvidenceCalibration;
}

/** Status of the signal the Core derives for a requested dimension. */
export type EvidenceSignalStatus = 'present' | 'no-evidence';

/**
 * The per-dimension signal the Core derives from received evidence. A dimension
 * with no matching evidence yields `no-evidence` (advisory), NOT a failure.
 */
export interface EvidenceSignal {
  readonly dimension: string;
  readonly status: EvidenceSignalStatus;
  /** Matching evidence when `status === 'present'`; empty for `no-evidence`. */
  readonly evidence: readonly Evidence[];
}

// ---------------------------------------------------------------------------
// Pure helpers (the Core-side surface — no I/O, no provider knowledge)
// ---------------------------------------------------------------------------

/** Loose input a producer/ACL may hand to {@link normalizeEvidence}. */
export interface RawEvidence {
  readonly source?: string;
  readonly dimension?: string;
  readonly metrics?: Readonly<Record<string, number>>;
  readonly findings?: readonly EvidenceFinding[];
  readonly determinism?: Determinism;
  readonly provenance?: Partial<Provenance>;
  readonly calibration?: Partial<EvidenceCalibration>;
}

export interface NormalizeOptions {
  /** Clock for defaulting a missing provenance timestamp (deterministic in tests). */
  readonly now?: () => string;
}

/**
 * Anti-corruption normalization: turn a loose producer output into canonical
 * {@link Evidence}. Fills safe defaults for optional collections, but enforces
 * the mandatory identity: `source`, `dimension`, `determinism` and a provenance
 * `collectedBy` MUST be present — provenance is not optional (ADR-0111 §6).
 * Throws on a missing mandatory field so a malformed provider cannot smuggle
 * unattributed evidence into the Core.
 */
export function normalizeEvidence(raw: RawEvidence, opts: NormalizeOptions = {}): Evidence {
  const source = raw.source?.trim();
  const dimension = raw.dimension?.trim();
  const collectedBy = raw.provenance?.collectedBy?.trim();

  if (!source) throw new Error('Evidence.source is required');
  if (!dimension) throw new Error('Evidence.dimension is required');
  if (raw.determinism !== 'deterministic' && raw.determinism !== 'probabilistic') {
    throw new Error(`Evidence.determinism must be 'deterministic' | 'probabilistic' (got ${String(raw.determinism)})`);
  }
  if (!collectedBy) throw new Error('Evidence.provenance.collectedBy is required (provenance is mandatory)');

  const now = opts.now ?? (() => new Date().toISOString());
  const calibration = normalizeCalibration(raw.calibration);

  return {
    source,
    dimension,
    metrics: raw.metrics ?? {},
    findings: raw.findings ?? [],
    determinism: raw.determinism,
    provenance: {
      collectedBy,
      adapterVersion: raw.provenance?.adapterVersion?.trim() || 'unknown',
      artifactHash: raw.provenance?.artifactHash?.trim() || '',
      timestamp: raw.provenance?.timestamp?.trim() || now(),
    },
    ...(calibration ? { calibration } : {}),
  };
}

function isRate(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 1;
}

/**
 * GT-584 — normalize a declared calibration, or reject it.
 *
 * Absent is legitimate and means UNMEASURED. But a calibration block that is PRESENT
 * and malformed is rejected rather than quietly dropped: a provider that publishes
 * `truePositiveRate: 95` (a percentage) or an unparseable `measuredAt` would
 * otherwise be filed as "uncalibrated" and its real defect never surface. The Core
 * refuses to guess what a number means.
 */
function normalizeCalibration(
  raw: Partial<EvidenceCalibration> | undefined,
): EvidenceCalibration | undefined {
  if (raw === undefined) return undefined;

  const { truePositiveRate: tpr, trueNegativeRate: tnr, measuredAt } = raw;
  if (!isRate(tpr) || !isRate(tnr)) {
    throw new Error(
      'Evidence.calibration requires truePositiveRate and trueNegativeRate as rates in [0,1] ' +
        `(got ${String(tpr)}, ${String(tnr)}). A calibration that cannot be read must not be treated as one.`,
    );
  }
  const at = measuredAt?.trim();
  if (!at || Number.isNaN(Date.parse(at))) {
    throw new Error(
      `Evidence.calibration.measuredAt must be an ISO-8601 instant (got ${String(measuredAt)}). ` +
        'A measurement with no date cannot be aged out, so it cannot be trusted.',
    );
  }
  if (raw.sampleSize !== undefined && (!Number.isInteger(raw.sampleSize) || raw.sampleSize < 1)) {
    throw new Error(`Evidence.calibration.sampleSize must be a positive integer (got ${String(raw.sampleSize)})`);
  }

  return {
    truePositiveRate: tpr,
    trueNegativeRate: tnr,
    measuredAt: at,
    ...(raw.sampleSize !== undefined ? { sampleSize: raw.sampleSize } : {}),
    ...(raw.method?.trim() ? { method: raw.method.trim() } : {}),
    ...(raw.labelledBy?.trim() ? { labelledBy: raw.labelledBy.trim() } : {}),
  };
}

// ---------------------------------------------------------------------------
// GT-584 — admissibility: may this piece of evidence contribute to a BLOCK?
// ---------------------------------------------------------------------------

/** The admissibility thresholds θ₁ (TPR), θ₂ (TNR) and θ₃ (age) of GT-584. */
export interface EvidenceAdmissibilityPolicy {
  readonly minTruePositiveRate: number;
  readonly minTrueNegativeRate: number;
  readonly maxCalibrationAgeDays: number;
  /** Injectable clock, so staleness is testable without waiting six months. */
  readonly now?: () => Date;
}

/**
 * Declared POLICY, not measurement. The numbers are deliberately the same as the
 * Core's own detector policy (`DEFAULT_ADMISSIBILITY_POLICY` in
 * `application/validators/architecture/signal-admissibility.ts`) so an internal
 * heuristic and an external provider are read on one scale. They stay declared —
 * and arguable — until GT-585 produces measured rates to replace them.
 */
export const DEFAULT_EVIDENCE_ADMISSIBILITY_POLICY: EvidenceAdmissibilityPolicy = {
  minTruePositiveRate: 0.95,
  minTrueNegativeRate: 0.95,
  maxCalibrationAgeDays: 180,
};

/** Why a piece of evidence was, or was not, admitted as blocking. */
export type EvidenceAdmissibility =
  /** Not a guess — blocks on its own, no error rate required. */
  | 'deterministic'
  /** Probabilistic, with a fresh measurement that clears the policy. */
  | 'calibrated'
  /** Probabilistic and never measured. */
  | 'advisory-uncalibrated'
  /** Measured, but below θ₁/θ₂. */
  | 'advisory-below-threshold'
  /** Measured too long ago to still describe the current provider. */
  | 'advisory-stale-calibration';

export interface EvidenceAdmissibilityDecision {
  /** Producer of the evidence this decision is about. */
  readonly source: string;
  readonly dimension: string;
  /** Whether this evidence may contribute to a BLOCKING verdict. */
  readonly blocking: boolean;
  readonly determinism: Determinism;
  readonly admissibility: EvidenceAdmissibility;
  /** The declared true-positive rate, when one exists. */
  readonly confidence?: number;
  /** Set when a probabilistic signal WOULD have blocked and was demoted. */
  readonly downgradedFromBlocking: boolean;
  readonly rationale: string;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * GT-584 — decide whether one piece of received evidence may block.
 *
 * A deterministic signal is unaffected: it is not a guess. A probabilistic one may
 * block only while `tpr ≥ θ₁ ∧ tnr ≥ θ₂ ∧ age ≤ θ₃`, and degrades to ADVISORY
 * otherwise — never disappearing, because a suppressed finding is its own kind of
 * dishonesty, and always with `downgradedFromBlocking` set so the demotion is
 * visible rather than silent.
 *
 * This is the function that makes AC2 real: an `Evidence` with no `calibration` is
 * `advisory-uncalibrated` and `blocking: false`. Nothing needs to remember to check
 * `determinism` any more — asking "may this block?" is the only way to find out, and
 * the answer already accounts for it.
 */
export function admitEvidenceBlocking(
  evidence: Evidence,
  policy: EvidenceAdmissibilityPolicy = DEFAULT_EVIDENCE_ADMISSIBILITY_POLICY,
): EvidenceAdmissibilityDecision {
  const base = {
    source: evidence.source,
    dimension: evidence.dimension,
    determinism: evidence.determinism,
    confidence: evidence.calibration?.truePositiveRate,
  };
  const label = `${evidence.source}/${evidence.dimension}`;

  if (evidence.determinism === 'deterministic') {
    return {
      ...base,
      blocking: true,
      admissibility: 'deterministic',
      downgradedFromBlocking: false,
      rationale: `Deterministic signal (${label}); no measured error rate is required to block.`,
    };
  }

  const advisory = (
    admissibility: EvidenceAdmissibility,
    rationale: string,
  ): EvidenceAdmissibilityDecision => ({
    ...base,
    blocking: false,
    admissibility,
    downgradedFromBlocking: true,
    rationale,
  });

  const calibration = evidence.calibration;
  if (!calibration) {
    return advisory(
      'advisory-uncalibrated',
      `Probabilistic signal (${label}) declares no measured error rate. It is reported as ` +
        'advisory: a governance verdict must not block on an unmeasured guess (GT-584).',
    );
  }

  const { truePositiveRate: tpr, trueNegativeRate: tnr, measuredAt } = calibration;
  if (tpr < policy.minTruePositiveRate || tnr < policy.minTrueNegativeRate) {
    return advisory(
      'advisory-below-threshold',
      `Probabilistic signal (${label}) measured at TPR ${tpr}, TNR ${tnr} — below the declared ` +
        `admissibility floor (TPR ≥ ${policy.minTruePositiveRate}, TNR ≥ ${policy.minTrueNegativeRate}).`,
    );
  }

  const measured = Date.parse(measuredAt);
  const ageDays = ((policy.now?.() ?? new Date()).getTime() - measured) / DAY_MS;
  if (Number.isNaN(measured) || ageDays > policy.maxCalibrationAgeDays) {
    return advisory(
      'advisory-stale-calibration',
      `Probabilistic signal (${label}) whose calibration (${measuredAt}) is ` +
        `${Number.isNaN(measured) ? 'unparseable' : `${Math.round(ageDays)} days old`}, beyond the ` +
        `${policy.maxCalibrationAgeDays}-day limit. A measurement of an older provider is not a measurement of this one.`,
    );
  }

  return {
    ...base,
    blocking: true,
    admissibility: 'calibrated',
    downgradedFromBlocking: false,
    rationale:
      `Probabilistic signal (${label}) admitted: TPR ${tpr} ≥ ${policy.minTruePositiveRate}, ` +
      `TNR ${tnr} ≥ ${policy.minTrueNegativeRate}, measured ${measuredAt}.`,
  };
}

/** One admissibility decision per received piece of evidence — the audit list. */
export function assessEvidenceAdmissibility(
  evidence: readonly Evidence[] = [],
  policy: EvidenceAdmissibilityPolicy = DEFAULT_EVIDENCE_ADMISSIBILITY_POLICY,
): EvidenceAdmissibilityDecision[] {
  return evidence.map((e) => admitEvidenceBlocking(e, policy));
}

/**
 * The subset of received evidence that may contribute to a BLOCKING verdict.
 * Everything filtered out is still reported — via
 * {@link assessEvidenceAdmissibility} — as advisory with its reason.
 */
export function admissibleBlockingEvidence(
  evidence: readonly Evidence[] = [],
  policy: EvidenceAdmissibilityPolicy = DEFAULT_EVIDENCE_ADMISSIBILITY_POLICY,
): Evidence[] {
  return evidence.filter((e) => admitEvidenceBlocking(e, policy).blocking);
}

/**
 * Derive a per-dimension {@link EvidenceSignal} for each requested dimension from
 * the received evidence. A dimension with no matching evidence is `no-evidence`
 * (advisory) — NEVER a failure the Core caused (ADR-0111 §3). This is the pure
 * Core-side rule that consumes the inline `Evidence[]`.
 */
export function resolveEvidenceSignals(
  requestedDimensions: readonly string[],
  evidence: readonly Evidence[] = [],
): EvidenceSignal[] {
  return requestedDimensions.map((dimension) => {
    const matching = evidence.filter((e) => e.dimension === dimension);
    return {
      dimension,
      status: matching.length > 0 ? 'present' : 'no-evidence',
      evidence: matching,
    };
  });
}

/**
 * Canonical dimension used to surface a single `no-evidence` signal when the
 * context carries NO quality evidence at all — so absence is reported explicitly
 * and advisory, never as a failure (ADR-0111 §3).
 */
export const DEFAULT_QUALITY_DIMENSION = 'quality';

/**
 * Fold the inline `Evidence[]` received on an {@link EvaluationContext} into the
 * per-dimension {@link EvidenceSignal}s the Core surfaces on its result. This is
 * the pipeline-side entry point for {@link resolveEvidenceSignals}: it resolves a
 * signal for every dimension OBSERVED in the received evidence (each `present`),
 * and — when no evidence was supplied — surfaces a single `no-evidence` signal for
 * the {@link DEFAULT_QUALITY_DIMENSION}. The Core only READS the inline evidence;
 * it never executes a provider (ADR-0111 §2). Missing/empty evidence is advisory,
 * NEVER a failure the Core caused (ADR-0111 §3).
 */
export function foldQualitySignals(evidence: readonly Evidence[] = []): EvidenceSignal[] {
  const observedDimensions = [...new Set(evidence.map((e) => e.dimension))];
  const requestedDimensions =
    observedDimensions.length > 0 ? observedDimensions : [DEFAULT_QUALITY_DIMENSION];
  return resolveEvidenceSignals(requestedDimensions, evidence);
}
