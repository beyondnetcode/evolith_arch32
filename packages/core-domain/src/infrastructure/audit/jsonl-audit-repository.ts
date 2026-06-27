import * as fs from 'fs-extra';
import * as path from 'path';
import type { AuditEntry, AuditQuery } from '../../domain/audit/audit-entry';
import type { IAuditRepository } from '../../domain/audit/audit-repository.port';

/**
 * JSONL-backed implementation of `IAuditRepository`.
 *
 * Each audit entry is serialised as a single JSON line and appended to a file.
 * The file is opened in append mode and is never truncated.
 *
 * Thread-safety: concurrent `append` calls are serialised via a promise chain
 * (write queue) so that lines are never interleaved.
 */
export class JsonlAuditRepository implements IAuditRepository {
  private readonly logFile: string;
  /** Promise chain that serialises all write operations. */
  private writeQueue: Promise<void> = Promise.resolve();

  constructor(logFile?: string) {
    this.logFile = logFile
      ?? (process.env.AUDIT_LOG_PATH
        ? process.env.AUDIT_LOG_PATH
        : path.join(process.cwd(), 'logs', 'audit.jsonl'));
  }

  // ---------------------------------------------------------------------------
  // IAuditRepository
  // ---------------------------------------------------------------------------

  async append(entry: AuditEntry): Promise<void> {
    // Enqueue the write so concurrent calls are serialised.
    this.writeQueue = this.writeQueue.then(() => this._writeEntry(entry));
    return this.writeQueue;
  }

  async query(q: AuditQuery): Promise<AuditEntry[]> {
    const lines = await this._readLines();
    let results = lines.filter(e => {
      if (q.tenantId && e.tenantId !== q.tenantId) return false;
      if (q.phaseId && e.phaseId !== q.phaseId) return false;
      if (q.actor && e.actor !== q.actor) return false;
      if (q.correlationId && e.correlationId !== q.correlationId) return false;
      if (q.from && e.occurredAt < q.from) return false;
      if (q.to && e.occurredAt > q.to) return false;
      return true;
    });

    results = results.sort((a, b) => a.occurredAt.localeCompare(b.occurredAt));

    if (q.limit !== undefined) {
      results = results.slice(0, q.limit);
    }

    return results;
  }

  async findById(id: string): Promise<AuditEntry | null> {
    const lines = await this._readLines();
    return lines.find(e => e.id === id) ?? null;
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private async _writeEntry(entry: AuditEntry): Promise<void> {
    const dir = path.dirname(this.logFile);
    await fs.ensureDir(dir);
    await fs.appendFile(this.logFile, JSON.stringify(entry) + '\n', 'utf-8');
  }

  private async _readLines(): Promise<AuditEntry[]> {
    if (!(await fs.pathExists(this.logFile))) {
      return [];
    }

    const content = await fs.readFile(this.logFile, 'utf-8');
    const entries: AuditEntry[] = [];

    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      try {
        entries.push(JSON.parse(trimmed) as AuditEntry);
      } catch {
        // Skip malformed lines — append-only ledger; never abort reads.
      }
    }

    return entries;
  }
}
