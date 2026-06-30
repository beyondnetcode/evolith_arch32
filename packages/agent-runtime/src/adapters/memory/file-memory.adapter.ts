/**
 * FileMemoryAdapter — a DURABLE {@link IMemoryPort} backed by a JSON file
 * (GT-386). Key/value state and ordered logs persist across runs, so a fresh
 * instance on the same path recalls prior writes. Same namespaced semantics as
 * the in-memory default; this is the zero-infra durable option (a Redis/vector
 * store is a sibling adapter behind the same port).
 *
 * Memory is the runtime's own working state — NEVER a substitute for Tracker's
 * system-of-record nor the Core's deterministic state.
 */

import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import type { IMemoryPort, MemoryEntry } from '../../domain/ports/memory.port';

interface MemoryFile {
  kv: Record<string, unknown>;
  logs: Record<string, MemoryEntry[]>;
}

export interface FileMemoryOptions {
  /** JSON file backing the store; parent dirs are created on first write. */
  readonly filePath: string;
  /** Injected clock (defaults to wall-clock UTC). */
  readonly now?: () => string;
}

export class FileMemoryAdapter implements IMemoryPort {
  private readonly now: () => string;

  constructor(private readonly options: FileMemoryOptions) {
    this.now = options.now ?? (() => new Date().toISOString());
  }

  async remember(key: string, value: unknown, namespace?: string): Promise<void> {
    const data = await this.load();
    data.kv[this.mapKey(key, namespace)] = value;
    await this.save(data);
  }

  async recall<T = unknown>(key: string, namespace?: string): Promise<T | undefined> {
    const data = await this.load();
    return data.kv[this.mapKey(key, namespace)] as T | undefined;
  }

  async append(namespace: string, value: unknown): Promise<void> {
    const data = await this.load();
    const log = data.logs[namespace] ?? [];
    log.push({ at: this.now(), value });
    data.logs[namespace] = log;
    await this.save(data);
  }

  async history(namespace: string, limit?: number): Promise<readonly MemoryEntry[]> {
    const data = await this.load();
    const log = data.logs[namespace] ?? [];
    return typeof limit === 'number' ? log.slice(-limit) : [...log];
  }

  private mapKey(key: string, namespace?: string): string {
    return namespace ? `${namespace}::${key}` : key;
  }

  private async load(): Promise<MemoryFile> {
    try {
      const raw = await fs.readFile(this.options.filePath, 'utf8');
      const parsed = JSON.parse(raw) as Partial<MemoryFile>;
      return { kv: parsed.kv ?? {}, logs: parsed.logs ?? {} };
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') return { kv: {}, logs: {} };
      throw err;
    }
  }

  private async save(data: MemoryFile): Promise<void> {
    await fs.mkdir(path.dirname(this.options.filePath), { recursive: true });
    await fs.writeFile(this.options.filePath, JSON.stringify(data, null, 2), 'utf8');
  }
}
