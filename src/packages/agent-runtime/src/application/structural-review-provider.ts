/**
 * StructuralReviewProvider (GT-535 · ADR-0111) — the code-quality-review agent's
 * structural pass behind the Quality Signal Provider seam.
 *
 * It runs the probabilistic {@link IStructuralReviewer} (an LLM/agent judging code
 * against the seven structural standards), RANKS the raw findings by the rubric's
 * severity hierarchy, and emits ONE normalized canonical {@link Evidence} with
 * `determinism: 'probabilistic'` and mandatory provenance/attribution to the source
 * methodology ({@link RUBRIC_ATTRIBUTION}). The runtime passes that Evidence INLINE
 * to the Core (`EvaluationContext.qualitySignals`); the Core never runs this provider
 * (ADR-0111 §1/§3).
 *
 * Structurally implements the agent-runtime `IQualitySignalProvider` port so the
 * {@link TenantQualitySignalRegistry} can register it like any other provider.
 */

import { createHash } from 'node:crypto';

import {
  normalizeEvidence,
  type Evidence,
  type EvidenceFinding,
  type EvidenceFindingSeverity,
} from '@beyondnet/evolith-core-domain/evaluation/contracts';

import type {
  CollectionContext,
  CollectionTarget,
  IQualitySignalProvider,
} from '../domain/ports/quality-signal-provider.port';
import type {
  IStructuralReviewer,
  RawStructuralFinding,
  StructuralReviewInput,
} from '../domain/ports/structural-reviewer.port';
import {
  compareSeverity,
  RUBRIC_ATTRIBUTION,
  STRUCTURAL_RUBRIC_VERSION,
  STRUCTURAL_REVIEW_SOURCE,
  STRUCTURAL_SEVERITY_RANK,
} from '../domain/rubrics/structural-review-rubric';

/** Stable registry id for this provider (ADR-0111 §4). */
export const STRUCTURAL_REVIEW_PROVIDER_ID = 'structural-review';

/** Dimensions this provider serves behind the port. */
const SUPPORTED_DIMENSIONS: ReadonlySet<string> = new Set([
  'code-quality',
  'structure',
  'maintainability',
]);

/** The dimension the emitted Evidence is tagged with when none is requested. */
const DEFAULT_DIMENSION = 'code-quality';

export interface StructuralReviewProviderOptions {
  /** Clock for the provenance timestamp fallback (deterministic in tests). */
  readonly now?: () => string;
}

/**
 * Rank raw findings by the rubric's severity hierarchy, most severe FIRST. Stable:
 * findings of equal severity keep their input order (so the reviewer's own ordering
 * is preserved as a tie-break). Returns a NEW array; does not mutate the input.
 */
export function rankStructuralFindings(
  findings: readonly RawStructuralFinding[],
): RawStructuralFinding[] {
  return findings
    .map((finding, index) => ({ finding, index }))
    .sort((a, b) => {
      const bySeverity = compareSeverity(b.finding.severity, a.finding.severity);
      return bySeverity !== 0 ? bySeverity : a.index - b.index;
    })
    .map((entry) => entry.finding);
}

/**
 * Structural-review provider. Injects a probabilistic {@link IStructuralReviewer};
 * everything else (ranking, metrics, provenance) is pure and deterministic.
 */
export class StructuralReviewProvider implements IQualitySignalProvider {
  public readonly id = STRUCTURAL_REVIEW_PROVIDER_ID;

  private readonly reviewer: IStructuralReviewer;
  private readonly now: () => string;

  constructor(reviewer: IStructuralReviewer, options: StructuralReviewProviderOptions = {}) {
    this.reviewer = reviewer;
    this.now = options.now ?? (() => new Date().toISOString());
  }

  /** Serves the code-quality/structure dimensions; an undeclared dimension is served too. */
  supports(ctx: CollectionContext): boolean {
    if (ctx.dimension === undefined) return true;
    return SUPPORTED_DIMENSIONS.has(ctx.dimension);
  }

  /**
   * Run the reviewer, rank the findings by severity, and emit ONE `probabilistic`
   * canonical {@link Evidence}. Metrics summarize the severity distribution plus the
   * peak severity rank so downstream policy can weight without re-parsing findings.
   * Provenance attributes the signal to this provider and the rubric version; the
   * source methodology is cited via {@link RUBRIC_ATTRIBUTION}.
   */
  async collect(target: CollectionTarget, ctx: CollectionContext): Promise<Evidence> {
    const input: StructuralReviewInput = {
      repositoryRef: target.repositoryRef,
      files: readFilesFromConfig(target.config),
      hints: ctx.hints,
    };

    const raw = await this.reviewer.review(input);
    const ranked = rankStructuralFindings(raw);

    const findings: EvidenceFinding[] = ranked.map((f) => ({
      code: `${STRUCTURAL_REVIEW_SOURCE}.${f.standardId}`,
      severity: f.severity,
      message: f.message,
      location: f.location,
    }));

    const metrics = summarizeSeverities(ranked);

    // Attribution + rubric version participate in the tamper-evidence hash so the
    // provenance of a probabilistic signal is auditable end-to-end (ADR-0111 §6).
    // GT-613: the determinism CLAIM participates too — relabelling a signal from
    // probabilistic to deterministic must not leave the hash untouched.
    const determinism = this.reviewer.determinism ?? 'probabilistic';
    const artifactHash = createHash('sha256')
      .update(
        JSON.stringify({
          rubric: STRUCTURAL_RUBRIC_VERSION,
          attribution: RUBRIC_ATTRIBUTION,
          determinism,
          findings: ranked,
        }),
      )
      .digest('hex');

    return normalizeEvidence(
      {
        source: STRUCTURAL_REVIEW_SOURCE,
        dimension: ctx.dimension ?? DEFAULT_DIMENSION,
        metrics,
        findings,
        // GT-613: the reviewer states its own class; an unlabelled one is read as
        // probabilistic (fail-safe — an opinion must never be presentable as fact).
        // The shipped HeuristicStructuralReviewer measures rather than judges and
        // declares `deterministic`, and mislabelling that would corrupt the exact
        // axis ADR-0111 exists to protect.
        determinism,
        provenance: {
          collectedBy: STRUCTURAL_REVIEW_PROVIDER_ID,
          adapterVersion: STRUCTURAL_RUBRIC_VERSION,
          artifactHash,
          // timestamp defaults via normalize's clock when omitted.
        },
      },
      { now: this.now },
    );
  }
}

/** Read the optional inline files a tenant config may forward to the reviewer. */
function readFilesFromConfig(
  config: Readonly<Record<string, unknown>> | undefined,
): readonly { readonly path: string; readonly content: string }[] | undefined {
  const files = config?.files;
  if (!Array.isArray(files)) return undefined;
  return files.filter(
    (f): f is { path: string; content: string } =>
      typeof f === 'object' && f !== null && typeof (f as any).path === 'string' && typeof (f as any).content === 'string',
  );
}

/**
 * Summarize a ranked finding set into numeric metrics: a count per severity plus the
 * peak severity rank (0..4) and the total. Pure and deterministic.
 */
export function summarizeSeverities(
  findings: readonly RawStructuralFinding[],
): Record<string, number> {
  const counts: Record<EvidenceFindingSeverity, number> = {
    info: 0,
    low: 0,
    medium: 0,
    high: 0,
    critical: 0,
  };
  let peakRank = 0;
  for (const f of findings) {
    counts[f.severity] += 1;
    peakRank = Math.max(peakRank, STRUCTURAL_SEVERITY_RANK[f.severity]);
  }
  return {
    findings: findings.length,
    'severity.info': counts.info,
    'severity.low': counts.low,
    'severity.medium': counts.medium,
    'severity.high': counts.high,
    'severity.critical': counts.critical,
    peakSeverityRank: findings.length > 0 ? peakRank : 0,
  };
}
