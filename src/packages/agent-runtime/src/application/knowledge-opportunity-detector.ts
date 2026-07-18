/**
 * Knowledge-opportunity detection (ADR-0115) — the sensor half of the emergent axis.
 *
 * ADR-0115 gave emergent knowledge a governed intake. This is what notices there
 * is something to intake. It is an {@link IQualitySignalProvider} on the
 * `knowledge` dimension, so it plugs into the registry that already exists
 * (ADR-0111) rather than inventing a second collection path.
 *
 * WHAT IT DETECTS, and why these signals
 *
 * The governed chain already computes the richest signal of a knowledge gap and
 * throws it away: the `ground` step queries `IKnowledgePort` on every run and
 * keeps only citations. An intent that retrieves nothing is, by definition, a
 * question the corpus cannot answer. Asked once that is noise; asked repeatedly
 * it is a documented FAQ waiting to be written — which is exactly ADR-0115's
 * `origin.class: recurrence`.
 *
 * The second signal is evaluative: a finding that repeats across repositories is
 * a candidate pattern, not five independent defects.
 *
 * WHAT IT DELIBERATELY DOES NOT DO
 *
 * It does not write knowledge, does not decide relevance, and does not rank
 * itself above a human. It emits `Evidence` whose findings are PROPOSALS. Per
 * ADR-0115 an agent may draft at `candidate` and no further, so nothing here
 * promotes anything. `determinism: 'probabilistic'` is honest: recurrence
 * counting is exact, but "this is worth capturing" is a judgement.
 *
 * It is also deliberately blind to content. It sees intents and citation counts,
 * never file contents, so it cannot leak what ADR-0115's exclusions forbid.
 */

import type { Evidence, EvidenceFinding } from '@beyondnet/evolith-core-domain/evaluation/contracts';
import type {
  CollectionContext,
  CollectionTarget,
  IQualitySignalProvider,
} from '../domain/ports/quality-signal-provider.port';

/** Registry key for this provider. */
export const KNOWLEDGE_OPPORTUNITY_PROVIDER_ID = 'knowledge-opportunity';

/** The Evidence dimension emitted, and the one this provider serves. */
export const KNOWLEDGE_DIMENSION = 'knowledge';

/**
 * How many times an unanswered intent must recur before it is proposed.
 *
 * Two is deliberate rather than tuned: one occurrence is indistinguishable from
 * a one-off question, and waiting for more delays the signal past the point
 * where the asker still cares. This is a starting heuristic, not a constant to
 * defend — ADR-0115 keeps thresholds out of the ADR precisely so they can move.
 */
export const DEFAULT_RECURRENCE_THRESHOLD = 2;

/** A retrieval outcome as the `ground` step already computes it. */
export interface GroundingObservation {
  /** The intent that was asked, verbatim. */
  readonly intent: string;
  /** How many chunks retrieval returned. Zero means the corpus had no answer. */
  readonly citationCount: number;
  /** Corpus identity, so observations from different corpora are not conflated. */
  readonly corpusVersion?: string;
  /** Repository the question was asked about, when known. */
  readonly repository?: string;
}

export interface KnowledgeOpportunityOptions {
  /** Occurrences required before an unanswered intent is proposed. */
  readonly recurrenceThreshold?: number;
  /** Clock for provenance; injectable so tests are deterministic. */
  readonly now?: () => Date;
  /** Adapter version recorded in provenance. */
  readonly adapterVersion?: string;
}

/**
 * Normalises an intent so trivially different phrasings of one question count as
 * the same question: case, punctuation and whitespace are not the question.
 * This is intentionally crude — real paraphrase detection belongs to the
 * semantic dedup stage, which has embeddings; doing it badly here would produce
 * false merges that are harder to notice than false splits.
 */
export function normaliseIntent(intent: string): string {
  return intent
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Counts unanswered intents and reports those that crossed the threshold.
 * Pure and in-memory: durability is a separate concern, and an ephemeral counter
 * that under-reports is safer than a persisted one that must be trusted.
 */
export class RecurrenceTracker {
  private readonly counts = new Map<string, { intent: string; occurrences: number; repositories: Set<string> }>();

  /** Records one observation. Answered intents are ignored — they are not gaps. */
  record(observation: GroundingObservation): void {
    if (observation.citationCount > 0) return;
    const key = normaliseIntent(observation.intent);
    if (!key) return;
    const entry = this.counts.get(key) ?? { intent: observation.intent, occurrences: 0, repositories: new Set<string>() };
    entry.occurrences += 1;
    if (observation.repository) entry.repositories.add(observation.repository);
    this.counts.set(key, entry);
  }

  /** Intents seen at least `threshold` times with no answer. */
  recurring(threshold: number): ReadonlyArray<{ intent: string; occurrences: number; repositories: readonly string[] }> {
    return [...this.counts.values()]
      .filter((e) => e.occurrences >= threshold)
      .map((e) => ({ intent: e.intent, occurrences: e.occurrences, repositories: [...e.repositories].sort() }))
      .sort((a, b) => b.occurrences - a.occurrences || a.intent.localeCompare(b.intent));
  }

  /** Total distinct unanswered intents, whether or not they crossed the threshold. */
  get size(): number {
    return this.counts.size;
  }
}

/**
 * Severity of a proposal. A knowledge gap is never an error — nothing is broken.
 * It escalates only with breadth: a question unanswered across several
 * repositories is a standard-level gap, not a local one.
 */
function severityFor(occurrences: number, repositories: number): EvidenceFinding['severity'] {
  if (repositories >= 3) return 'medium';
  if (occurrences >= 4 || repositories >= 2) return 'low';
  return 'info';
}

export class KnowledgeOpportunityProvider implements IQualitySignalProvider {
  public readonly id = KNOWLEDGE_OPPORTUNITY_PROVIDER_ID;

  private readonly tracker = new RecurrenceTracker();
  private readonly threshold: number;
  private readonly now: () => Date;
  private readonly adapterVersion: string;

  constructor(options: KnowledgeOpportunityOptions = {}) {
    this.threshold = options.recurrenceThreshold ?? DEFAULT_RECURRENCE_THRESHOLD;
    this.now = options.now ?? (() => new Date());
    this.adapterVersion = options.adapterVersion ?? '1.0.0';
  }

  /** Serves the `knowledge` dimension; an undeclared dimension is served too. */
  supports(ctx: CollectionContext): boolean {
    if (ctx.dimension === undefined) return true;
    return ctx.dimension === KNOWLEDGE_DIMENSION;
  }

  /** Feeds one grounding outcome to the detector. Cheap; called per chain run. */
  observe(observation: GroundingObservation): void {
    this.tracker.record(observation);
  }

  /**
   * Emits the current proposals as Evidence. Findings are candidates for a KO-*
   * record — never a record, and never a decision.
   */
  async collect(_target: CollectionTarget, ctx: CollectionContext): Promise<Evidence> {
    const recurring = this.tracker.recurring(this.threshold);

    const findings: EvidenceFinding[] = recurring.map((entry) => ({
      code: 'KO-CANDIDATE-RECURRENCE',
      severity: severityFor(entry.occurrences, entry.repositories.length),
      message:
        `"${entry.intent}" was asked ${entry.occurrences} time(s) with no corpus answer` +
        (entry.repositories.length ? ` across ${entry.repositories.length} repository/ies` : '') +
        '. Candidate for a KO-* record with origin.class "recurrence"; a human decides whether it is worth capturing.',
    }));

    return {
      source: this.id,
      dimension: ctx.dimension ?? KNOWLEDGE_DIMENSION,
      metrics: {
        unansweredIntents: this.tracker.size,
        recurringIntents: recurring.length,
        recurrenceThreshold: this.threshold,
      },
      findings,
      // Counting is exact; "worth capturing" is not. Declaring this deterministic
      // would overstate what the signal means.
      determinism: 'probabilistic',
      provenance: {
        collectedBy: this.id,
        adapterVersion: this.adapterVersion,
        artifactHash: `intents:${this.tracker.size}`,
        timestamp: this.now().toISOString(),
      },
    };
  }
}
