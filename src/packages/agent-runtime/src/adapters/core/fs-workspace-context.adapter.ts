/**
 * FsWorkspaceContextAdapter — the PRODUCTION {@link IWorkspaceContextPort} that
 * assembles the real workspace by reading a mounted satellite corpus from disk
 * (GT-438). It walks a bounded, governance-relevant subtree and returns the files
 * as the RELATIVE-path -> content map the stateless Core evaluates INLINE
 * (`evaluationInput.files` / `OverlayFileSystem`) — so the runtime governs actual
 * content instead of sending an empty context.
 *
 * It is intentionally thin and bounded: it never mutates the corpus, caps the
 * number and size of files it ingests (so a huge repo can't blow the request),
 * and skips heavy/irrelevant directories (`node_modules`, `.git`, `dist`, …). The
 * runtime keeps its hexagon clean — the read seam (`readdir`/`readFile`/`stat`) is
 * injectable, so tests drive it with an in-memory tree and need no real disk.
 */

import { promises as nodeFs } from 'node:fs';
import * as path from 'node:path';
import type {
  IWorkspaceContextPort,
  WorkspaceContextRequest,
  AssembledWorkspaceContext,
} from '../../domain/ports/workspace-context.port';

/** Minimal filesystem seam (subset of `node:fs/promises`) for testability. */
export interface WorkspaceFsLike {
  readdir(dir: string, opts: { withFileTypes: true }): Promise<
    ReadonlyArray<{ name: string; isDirectory(): boolean; isFile(): boolean }>
  >;
  readFile(file: string, encoding: 'utf8'): Promise<string>;
}

export interface FsWorkspaceContextOptions {
  /** Absolute root of the mounted satellite corpus to assemble from. */
  readonly root: string;
  /**
   * File extensions (lowercase, with leading dot) to ingest. Defaults to the
   * governance-relevant set — the manifest, docs, and declared config/evidence.
   */
  readonly includeExtensions?: readonly string[];
  /** Directory names to skip entirely (heavy/irrelevant). */
  readonly excludeDirs?: readonly string[];
  /** Max number of files to ingest before stopping (default 800). */
  readonly maxFiles?: number;
  /** Max bytes for a single file; larger files are skipped (default 512 KiB). */
  readonly maxFileBytes?: number;
  /** Max total bytes across all ingested files (default 8 MiB). */
  readonly maxTotalBytes?: number;
  /** Injected fs seam (defaults to `node:fs/promises`). */
  readonly fsImpl?: WorkspaceFsLike;
}

const DEFAULT_INCLUDE_EXTENSIONS = ['.yaml', '.yml', '.md', '.json', '.toml'] as const;
const DEFAULT_EXCLUDE_DIRS = [
  'node_modules', '.git', 'dist', 'build', 'coverage', '.turbo', '.next', 'out', '.cache',
] as const;
const DEFAULT_MAX_FILES = Number(process.env.WORKSPACE_MAX_FILES) || 800;
const DEFAULT_MAX_FILE_BYTES = Number(process.env.WORKSPACE_MAX_FILE_BYTES) || 512 * 1024;
const DEFAULT_MAX_TOTAL_BYTES = Number(process.env.WORKSPACE_MAX_TOTAL_BYTES) || 8 * 1024 * 1024;

export class FsWorkspaceContextAdapter implements IWorkspaceContextPort {
  private readonly fs: WorkspaceFsLike;
  private readonly includeExtensions: ReadonlySet<string>;
  private readonly excludeDirs: ReadonlySet<string>;
  private readonly maxFiles: number;
  private readonly maxFileBytes: number;
  private readonly maxTotalBytes: number;

  constructor(private readonly options: FsWorkspaceContextOptions) {
    if (!options.root || !options.root.trim()) {
      throw new Error('FsWorkspaceContextAdapter requires a non-empty `root`.');
    }
    this.fs = options.fsImpl ?? (nodeFs as unknown as WorkspaceFsLike);
    this.includeExtensions = new Set(
      (options.includeExtensions ?? DEFAULT_INCLUDE_EXTENSIONS).map((e) => e.toLowerCase()),
    );
    this.excludeDirs = new Set(options.excludeDirs ?? DEFAULT_EXCLUDE_DIRS);
    this.maxFiles = options.maxFiles ?? DEFAULT_MAX_FILES;
    this.maxFileBytes = options.maxFileBytes ?? DEFAULT_MAX_FILE_BYTES;
    this.maxTotalBytes = options.maxTotalBytes ?? DEFAULT_MAX_TOTAL_BYTES;
  }

  async assemble(_request: WorkspaceContextRequest): Promise<AssembledWorkspaceContext> {
    const root = path.resolve(this.options.root);
    const files: Record<string, string> = {};
    const state = { count: 0, bytes: 0, truncated: false };

    await this.walk(root, root, files, state);

    return { files, sourceRef: root, truncated: state.truncated };
  }

  /** Depth-first collection of matching files, honouring the file/byte budgets. */
  private async walk(
    dir: string,
    root: string,
    out: Record<string, string>,
    state: { count: number; bytes: number; truncated: boolean },
  ): Promise<void> {
    if (state.truncated) return;

    let entries: ReadonlyArray<{ name: string; isDirectory(): boolean; isFile(): boolean }>;
    try {
      entries = await this.fs.readdir(dir, { withFileTypes: true });
    } catch {
      // Unreadable directory (permissions, race) is non-fatal — skip it.
      return;
    }

    // Deterministic order (dirs + files sorted by name) so the assembled map is
    // stable across runs regardless of the OS directory-listing order.
    const sorted = [...entries].sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));

    for (const entry of sorted) {
      if (state.truncated) return;
      const abs = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        if (this.excludeDirs.has(entry.name)) continue;
        await this.walk(abs, root, out, state);
        continue;
      }
      if (!entry.isFile()) continue;
      if (!this.includeExtensions.has(path.extname(entry.name).toLowerCase())) continue;

      if (state.count >= this.maxFiles) {
        state.truncated = true;
        return;
      }

      let content: string;
      try {
        content = await this.fs.readFile(abs, 'utf8');
      } catch {
        continue; // unreadable file — skip, never fail the whole assembly
      }

      const size = Buffer.byteLength(content, 'utf8');
      if (size > this.maxFileBytes) continue; // oversized single file — skip
      if (state.bytes + size > this.maxTotalBytes) {
        state.truncated = true;
        return;
      }

      // Key = RELATIVE posix path from the corpus root (Core/OverlayFileSystem shape).
      const rel = path.relative(root, abs).split(path.sep).join('/');
      out[rel] = content;
      state.count += 1;
      state.bytes += size;
    }
  }
}
