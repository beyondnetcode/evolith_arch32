/**
 * JournaledRun (GT-593) — resume a pipeline from its step journal.
 *
 * A run is opened once, which reads whatever the previous (killed) attempt got
 * as far as recording. Each expensive or non-deterministic step is then wrapped:
 *
 *     const { value, resumed } = await run.step('harness-execute', input, () => …);
 *
 * If the journal already holds an entry for that step whose `inputHash` matches,
 * the recorded output is REPLAYED and the closure is never invoked. Otherwise the
 * closure runs and the result is appended before it is returned.
 *
 * MATCHING IS ORDERED AND CONSUMED. Entries are taken in append order and each is
 * used at most once, so a pipeline that runs the same step twice with the same
 * input resumes both occurrences in the order they originally happened — instead
 * of replaying the first answer twice.
 *
 * ═══ WHAT IS *NOT* RESUMABLE — stated plainly, because a half-honest resume is
 * worse than none ═══
 *
 * 1. A run with NO `correlationId` has no identity, so nothing about it can be
 *    journaled or resumed. Resumability is opt-in by correlating the request.
 * 2. APPROVALS and POLICY validations are never journaled. Replaying a grant
 *    would let a resume execute on a human decision that has since expired or
 *    been revoked; replaying a policy verdict would evaluate against a rule set
 *    that is no longer current. Both are re-decided on every attempt. The
 *    approval gate is already correlation-keyed and fail-closed, so re-deciding
 *    is cheap and correct.
 * 3. A step is journaled only when it COMPLETES. A process killed halfway
 *    through a step leaves no entry, so that step is re-executed WHOLE on
 *    resume. For a step with external side effects (a `.harness` script that
 *    writes files) that means the side effect may be applied twice — the journal
 *    records outcomes, it does not make capabilities idempotent. Capabilities
 *    that must not run twice have to declare it and be gated, which is what
 *    `requiresApproval` is for.
 * 4. Tracker publishes and memory appends are re-emitted on a resume. They are
 *    best-effort and idempotency belongs to the sink, not to the journal.
 * 5. The journal replays a step's RETURN VALUE, not the state of the world when
 *    it was produced. A resume long after the fact can therefore act on a stale
 *    reading; `at` is recorded on every entry precisely so an auditor can see how
 *    stale.
 */

import { createHash } from 'node:crypto';

import type {
  IRunJournalPort,
  JournaledStep,
  RunJournalEntry,
} from '../domain/ports/run-journal.port';

/**
 * Stable hash of an arbitrary value: keys are sorted at every depth so two
 * structurally equal inputs hash identically regardless of property order.
 * `undefined` members are dropped, matching JSON semantics.
 */
export function hashJournalValue(value: unknown): string {
  return createHash('sha256').update(stableStringify(value)).digest('hex');
}

function stableStringify(value: unknown): string {
  if (value === undefined) return 'undefined';
  if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'null';
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`);
  return `{${entries.join(',')}}`;
}

/** Per-step outcome, so the trace can say what was replayed rather than run. */
export interface JournaledStepResult<T> {
  readonly value: T;
  /** True when the value came from the journal instead of from the closure. */
  readonly resumed: boolean;
}

export class JournaledRun {
  private readonly consumed = new Set<number>();
  private readonly resumed: JournaledStep[] = [];
  private readonly recorded: JournaledStep[] = [];

  private constructor(
    private readonly journal: IRunJournalPort,
    private readonly runId: string,
    private readonly entries: readonly RunJournalEntry[],
    private readonly now: () => string,
  ) {}

  /**
   * Open a run against the journal, loading any prior attempt. A read failure is
   * NOT fatal: a run must never be blocked by an unreadable journal, it simply
   * starts from zero (and `priorEntries` reports 0, so the trace does not claim
   * a resume that did not happen).
   */
  static async open(
    journal: IRunJournalPort,
    runId: string,
    now: () => string = () => new Date().toISOString(),
  ): Promise<JournaledRun> {
    let entries: readonly RunJournalEntry[] = [];
    try {
      entries = await journal.read(runId);
    } catch {
      entries = [];
    }
    return new JournaledRun(journal, runId, entries, now);
  }

  /** How many completed steps the previous attempt left behind. */
  get priorEntries(): number {
    return this.entries.length;
  }

  /** Steps this attempt replayed from the journal instead of executing. */
  get resumedSteps(): readonly JournaledStep[] {
    return [...this.resumed];
  }

  /** Steps this attempt actually executed and appended. */
  get recordedSteps(): readonly JournaledStep[] {
    return [...this.recorded];
  }

  /**
   * Run `execute` unless the journal already answers this exact question.
   *
   * An append failure is swallowed AFTER the step has run: losing the record is
   * a degraded audit, but failing the governed run because a disk was full would
   * be a worse outcome, and the step's own result is still returned.
   */
  async step<T>(
    step: JournaledStep,
    input: unknown,
    execute: () => Promise<T>,
  ): Promise<JournaledStepResult<T>> {
    const inputHash = hashJournalValue(input);

    const index = this.entries.findIndex(
      (entry, i) => !this.consumed.has(i) && entry.step === step && entry.inputHash === inputHash,
    );
    if (index >= 0) {
      this.consumed.add(index);
      this.resumed.push(step);
      return { value: this.entries[index].output as T, resumed: true };
    }

    const value = await execute();
    this.recorded.push(step);
    try {
      await this.journal.append({
        runId: this.runId,
        step,
        at: this.now(),
        inputHash,
        outputHash: hashJournalValue(value),
        output: value,
      });
    } catch {
      // A journal that cannot be written degrades the audit, never the run.
    }
    return { value, resumed: false };
  }
}
