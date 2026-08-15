import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
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

/** Store path relative to the WORKSPACE (not to `process.cwd()`). `.evolith/` is gitignored. */
export const DEFAULT_WAIVER_STORE_RELPATH = '.evolith/waivers.json';

/**
 * GT-677 — the single resolution rule, shared by the command that WRITES waivers
 * (`evolith waiver`) and the ones that READ them (`evolith evaluate`, `evolith-evaluate`).
 *
 * Default: `<workspaceRoot>/.evolith/waivers.json`. Anchoring the writer to `process.cwd()`
 * and the reader to the workspace is exactly how a waiver silently suppresses nothing.
 * An explicit `override` is resolved against the CURRENT directory (same convention as
 * `evaluate --evidence`), so a CI job can point both at one committed file.
 */
export function resolveWaiverStorePath(workspaceRoot: string, override?: string): string {
  const explicit = override?.trim();
  // `process.cwd()` is passed EXPLICITLY rather than relying on `resolve`'s implicit base:
  // measured (GT-677) that `path.resolve` reads the process binding directly and so ignores
  // a `jest.spyOn(process, 'cwd')`, which would make every cwd-anchored test assert against
  // the developer's real working directory. Identical result outside a test.
  return explicit ? resolve(process.cwd(), explicit) : resolve(workspaceRoot, DEFAULT_WAIVER_STORE_RELPATH);
}

/** Open the waiver store for a workspace. A missing/corrupt file yields an EMPTY store (fails closed). */
export function openWaiverStore(workspaceRoot: string, override?: string): FileWaiverStore {
  return new FileWaiverStore(resolveWaiverStorePath(workspaceRoot, override));
}

/**
 * GT-677 — raised when a READER was pointed at a store that is not there.
 *
 * Carries both the path as typed and the path as resolved, because the two differ exactly
 * when the mistake is the interesting one: an override is resolved against the CURRENT
 * directory (the `--evidence` convention), so `--waivers .evolith/waivers.json` run from
 * outside the workspace resolves somewhere the caller never looked.
 */
export class MissingWaiverStoreError extends Error {
  constructor(readonly requested: string, readonly resolvedPath: string) {
    super(
      `Waiver store not found: "${requested}" resolved to ${resolvedPath}. ` +
        'A relative --waivers/--store path resolves against the current directory, not the workspace; ' +
        'pass an absolute path, or omit the flag to use <workspace>/.evolith/waivers.json.',
    );
    this.name = 'MissingWaiverStoreError';
  }
}

/**
 * GT-677 — open a waiver store for READING, refusing an explicit path that does not exist.
 *
 * The adversarial verification of this gap's own fix found the defect one level down:
 * `--waivers <relative-path>` from outside the workspace resolved to a file nobody had
 * written, {@link FileWaiverStore} read a missing file as an EMPTY store, and the run
 * suppressed nothing while reporting success — `blocking 95 frozen 0`, measured. That is
 * the same silent no-op GT-677 exists to remove, so a reader fails loudly instead.
 *
 * The DEFAULT path is deliberately exempt: most workspaces have no waivers, and a missing
 * `<workspace>/.evolith/waivers.json` is the normal state, not a mistake. Writers keep
 * using {@link openWaiverStore}, which must be able to create the file it is given.
 */
export function openWaiverStoreForRead(workspaceRoot: string, override?: string): FileWaiverStore {
  const requested = override?.trim();
  const path = resolveWaiverStorePath(workspaceRoot, requested);
  if (requested && !existsSync(path)) throw new MissingWaiverStoreError(requested, path);
  return new FileWaiverStore(path);
}
