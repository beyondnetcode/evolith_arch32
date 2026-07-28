/**
 * FileRunJournalAdapter — a DURABLE {@link IRunJournalPort} backed by JSONL
 * (GT-593), the sibling of the GT-386 file-durable state adapters.
 *
 * One line per completed step, appended with `fs.appendFile` — so a `kill -9`
 * between two steps loses at most the step that was in flight, and everything
 * already written stays readable. That is the property the whole gap turns on:
 * the record of what a non-deterministic step returned must outlive the process
 * that ran it.
 *
 * A malformed line is SKIPPED rather than fatal. A truncated final line is the
 * expected shape of a crash, and refusing to read the journal because the crash
 * left a partial write would defeat the point of having one.
 */

import { promises as fs } from 'node:fs';
import * as path from 'node:path';

import type { IRunJournalPort, RunJournalEntry } from '../../domain/ports/run-journal.port';

export interface FileRunJournalOptions {
  /** Directory holding one `<runId>.jsonl` per run; created on first write. */
  readonly directory: string;
}

/** Keep a run id safe to use as a filename without inventing a namespace. */
function fileNameFor(runId: string): string {
  return `${runId.replace(/[^A-Za-z0-9._-]/g, '_')}.jsonl`;
}

export class FileRunJournalAdapter implements IRunJournalPort {
  constructor(private readonly options: FileRunJournalOptions) {}

  async read(runId: string): Promise<readonly RunJournalEntry[]> {
    let raw: string;
    try {
      raw = await fs.readFile(this.pathFor(runId), 'utf8');
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') return [];
      throw err;
    }

    const entries: RunJournalEntry[] = [];
    for (const line of raw.split('\n')) {
      if (line.trim() === '') continue;
      try {
        const parsed = JSON.parse(line) as RunJournalEntry;
        // A record without a step or an input hash cannot be matched against, so
        // it is not a journal entry — dropping it is honest, keeping it is noise.
        if (typeof parsed?.step === 'string' && typeof parsed?.inputHash === 'string') {
          entries.push(parsed);
        }
      } catch {
        // Truncated tail from a crash mid-write: the expected damage, skipped.
      }
    }
    return entries;
  }

  async append(entry: RunJournalEntry): Promise<void> {
    await fs.mkdir(this.options.directory, { recursive: true });
    await fs.appendFile(this.pathFor(entry.runId), `${JSON.stringify(entry)}\n`, 'utf8');
  }

  private pathFor(runId: string): string {
    return path.join(this.options.directory, fileNameFor(runId));
  }
}
