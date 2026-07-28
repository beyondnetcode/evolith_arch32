/**
 * InMemoryRunJournalAdapter — default {@link IRunJournalPort} (GT-593).
 *
 * Survives nothing, which makes it right for tests and for a single-process run
 * that only needs the resume semantics WITHIN the process. The durable option is
 * {@link FileRunJournalAdapter}; a Tracker-backed one is a sibling behind the
 * same port.
 */

import type { IRunJournalPort, RunJournalEntry } from '../../domain/ports/run-journal.port';

export class InMemoryRunJournalAdapter implements IRunJournalPort {
  private readonly byRun = new Map<string, RunJournalEntry[]>();

  async read(runId: string): Promise<readonly RunJournalEntry[]> {
    return [...(this.byRun.get(runId) ?? [])];
  }

  async append(entry: RunJournalEntry): Promise<void> {
    const log = this.byRun.get(entry.runId) ?? [];
    log.push(entry);
    this.byRun.set(entry.runId, log);
  }

  /** Test/inspection helper: every run id the journal holds. */
  runIds(): readonly string[] {
    return [...this.byRun.keys()];
  }
}
