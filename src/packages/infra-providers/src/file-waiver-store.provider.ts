import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { InMemoryWaiverStore, type IWaiverStore, type Waiver } from '@beyondnet/evolith-core-domain/domain/waiver';

/**
 * GT-518 · EAG-13 — durable, file-backed {@link IWaiverStore}.
 *
 * The reference {@link InMemoryWaiverStore} is pure; this persists the full waiver
 * history to a JSON file so `waiverRef` suppressions (request → approve → revise →
 * expire) survive across CLI/CI invocations. It delegates all query/versioning logic
 * to an in-memory store loaded from disk, and rewrites the file atomically-ish on every
 * `put`. Every version is retained (audit trail); nothing is mutated in place.
 */
export class FileWaiverStore implements IWaiverStore {
  private readonly mem: InMemoryWaiverStore;

  constructor(private readonly filePath: string) {
    this.mem = new InMemoryWaiverStore(FileWaiverStore.read(filePath));
  }

  list(fingerprint: string): readonly Waiver[] {
    return this.mem.list(fingerprint);
  }

  all(): readonly Waiver[] {
    return this.mem.all();
  }

  put(waiver: Waiver): void {
    this.mem.put(waiver);
    this.flush();
  }

  private flush(): void {
    const dir = dirname(this.filePath);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    writeFileSync(this.filePath, `${JSON.stringify(this.mem.all(), null, 2)}\n`, 'utf8');
  }

  private static read(filePath: string): Waiver[] {
    if (!existsSync(filePath)) return [];
    try {
      const parsed: unknown = JSON.parse(readFileSync(filePath, 'utf8') || '[]');
      return Array.isArray(parsed) ? (parsed as Waiver[]) : [];
    } catch {
      // A corrupt/partial file fails CLOSED to an empty store rather than crashing —
      // a lost waiver re-blocks its finding (safe default), never silently suppresses.
      return [];
    }
  }
}
