/**
 * IRunJournalPort — the STEP JOURNAL (GT-593).
 *
 * GT-386 gave the runtime durable *state* (scheduler, memory, approvals). What it
 * did not give it is a record of what each PIPELINE STEP was asked and what it
 * answered. Without that, a run killed mid-pipeline restarts from zero and every
 * non-deterministic step is re-rolled — so for an audit product the record of
 * what happened depends on when the process died. That is the defect this port
 * closes: a deterministic workflow over JOURNALED activities.
 *
 * The journal is append-only and content-addressed on its INPUT. A resume
 * replays a recorded output only when the step is being asked the SAME question
 * again (identical `inputHash`); a different question is a different step and is
 * executed for real. That is what keeps the journal from turning into a stale
 * cache.
 *
 * WHAT IS DELIBERATELY NOT JOURNALED — see `run-journal.ts` for the reasoning:
 * approval decisions and policy validations. Replaying either would let a run
 * resume on a grant or a rule set that is no longer current, which is the exact
 * failure mode a governance product cannot have.
 */

/** Pipeline steps the runtime can journal and resume. */
export type JournaledStep = 'engine-plan' | 'ground' | 'harness-execute' | 'core-evaluate';

/** One append-only record: what a step was asked, and what it answered. */
export interface RunJournalEntry {
  /** Run identity — the request's `correlationId`. No correlation ⇒ no journal. */
  readonly runId: string;
  readonly step: JournaledStep;
  /** ISO-8601 instant the step COMPLETED. */
  readonly at: string;
  /** Stable hash of the step's input; a resume matches on this. */
  readonly inputHash: string;
  /** Stable hash of the recorded output — tamper evidence over the replay. */
  readonly outputHash: string;
  /** The recorded return value, replayed verbatim on resume. */
  readonly output: unknown;
}

export interface IRunJournalPort {
  /** Entries for a run, in append order. Unknown run ⇒ empty. */
  read(runId: string): Promise<readonly RunJournalEntry[]>;
  /** Append one completed step. Implementations MUST NOT reorder or dedupe. */
  append(entry: RunJournalEntry): Promise<void>;
}
