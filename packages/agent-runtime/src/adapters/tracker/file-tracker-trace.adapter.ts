import { appendFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { ITrackerTracePort } from '../../domain/ports/tracker-trace.port';
import type { TraceEvent } from '../../domain/contracts/trace';

export interface FileTrackerOptions {
  /** The directory where the jsonl file will be stored (e.g. '.harness/reports'). */
  readonly directory: string;
  /** The filename (default: 'progress-audit.jsonl'). */
  readonly filename?: string;
}

/**
 * FileTrackerTraceAdapter — GT-420: Implements the progress-audit.jsonl emitter
 * to externalize LLM memory and maintain an append-only log of execution events.
 */
export class FileTrackerTraceAdapter implements ITrackerTracePort {
  private readonly filepath: string;

  constructor(options: FileTrackerOptions) {
    const filename = options.filename ?? 'progress-audit.jsonl';
    this.filepath = join(options.directory, filename);
  }

  async publish(event: TraceEvent): Promise<void> {
    const line = JSON.stringify(event) + '\n';
    await appendFile(this.filepath, line, { encoding: 'utf-8' });
  }

  async publishMany(events: readonly TraceEvent[]): Promise<void> {
    const lines = events.map((e) => JSON.stringify(e)).join('\n') + '\n';
    await appendFile(this.filepath, lines, { encoding: 'utf-8' });
  }
}
