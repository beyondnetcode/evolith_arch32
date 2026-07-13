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
  };
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
