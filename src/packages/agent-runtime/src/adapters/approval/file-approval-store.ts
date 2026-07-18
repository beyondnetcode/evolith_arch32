/**
 * FileApprovalStore — a DURABLE {@link IApprovalStore} backed by a JSON file
 * (GT-441). Pending approvals survive a process restart: a fresh instance on the
 * same path reloads every record the prior one persisted, so a human decision
 * that arrives after a crash/redeploy still resolves the right request.
 *
 * Mirrors the {@link FileMemoryAdapter} pattern: an injectable `fs` seam
 * (defaults to `node:fs/promises`), a configurable file path, an ATOMIC write
 * (write a temp file, then rename over the target so a reader never observes a
 * half-written file), a lazy load, and tolerance for a missing OR corrupt file —
 * a read NEVER throws, it starts empty. This is the zero-infra durable option;
 * the Tracker-backed store stays a separate, gated sibling behind the same port.
 */

import { promises as nodeFs } from 'node:fs';
import * as path from 'node:path';
import type { ApprovalRecord, IApprovalStore } from '../../domain/ports/approval.port';

/**
 * The subset of `node:fs/promises` the store needs. Injectable so tests can run
 * against a fake in-memory fs with no real disk, and so alternate backends
 * (e.g. a memfs) can be dropped in. Defaults to `node:fs/promises`.
 */
export interface ApprovalStoreFsLike {
  readFile(file: string, encoding: 'utf8'): Promise<string>;
  writeFile(file: string, data: string, encoding: 'utf8'): Promise<void>;
  rename(from: string, to: string): Promise<void>;
  mkdir(dir: string, options: { recursive: true }): Promise<string | undefined>;
}

/** On-disk shape. `records` is a plain id→record map for O(1) get + simple merge. */
interface ApprovalFile {
  records: Record<string, ApprovalRecord>;
}

export interface FileApprovalStoreOptions {
  /** JSON file backing the store; parent dirs are created on first write. */
  readonly filePath: string;
  /** Injected fs seam (defaults to `node:fs/promises`). */
  readonly fs?: ApprovalStoreFsLike;
}

export class FileApprovalStore implements IApprovalStore {
  private readonly filePath: string;
  private readonly fs: ApprovalStoreFsLike;

  constructor(options: FileApprovalStoreOptions) {
    this.filePath = options.filePath;
    this.fs = options.fs ?? (nodeFs as unknown as ApprovalStoreFsLike);
  }

  async get(id: string): Promise<ApprovalRecord | undefined> {
    const data = await this.load();
    return data.records[id];
  }

  async put(record: ApprovalRecord): Promise<void> {
    const data = await this.load();
    data.records[record.id] = record;
    await this.save(data);
  }

  async list(): Promise<readonly ApprovalRecord[]> {
    const data = await this.load();
    return Object.values(data.records);
  }

  /**
   * Lazy read. Tolerates a missing file (ENOENT) and a corrupt/partial file
   * (bad JSON, wrong shape) by starting empty — a read NEVER throws, so a
   * clobbered file can only lose history, never crash the runtime.
   */
  private async load(): Promise<ApprovalFile> {
    let raw: string;
    try {
      raw = await this.fs.readFile(this.filePath, 'utf8');
    } catch {
      // Missing file (or any read error): start empty. Fail-open on READ only —
      // the approval DECISION stays fail-closed in the PendingApprovalAdapter.
      return { records: {} };
    }
    try {
      const parsed = JSON.parse(raw) as Partial<ApprovalFile>;
      const records = parsed?.records;
      if (!records || typeof records !== 'object') return { records: {} };
      return { records: { ...records } };
    } catch {
      // Corrupt/partial JSON: start empty rather than throw.
      return { records: {} };
    }
  }

  /**
   * Atomic write: serialize to a unique temp sibling, then rename over the
   * target. Rename is atomic on a POSIX filesystem, so a concurrent reader sees
   * either the old file or the new one — never a partially-written target.
   */
  private async save(data: ApprovalFile): Promise<void> {
    const dir = path.dirname(this.filePath);
    await this.fs.mkdir(dir, { recursive: true });
    const tmp = `${this.filePath}.${process.pid}.${Date.now()}.tmp`;
    await this.fs.writeFile(tmp, JSON.stringify(data, null, 2), 'utf8');
    await this.fs.rename(tmp, this.filePath);
  }
}
