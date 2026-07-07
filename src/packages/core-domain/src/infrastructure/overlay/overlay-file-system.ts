import * as path from 'path';
import { DirEntry, IFileSystem } from '../../domain/interfaces';

/**
 * OverlayFileSystem — a stateless, in-memory overlay over a real `IFileSystem`.
 *
 * The Core is stateless: it must evaluate exactly the satellite content it
 * receives in the request, without writing that content to disk or reaching the
 * network for it. This adapter serves a single synthetic satellite subtree
 * (rooted at `overlayRoot`, e.g. `/inmem/satellite`) from an in-memory
 * `files` map (RELATIVE path -> content), and DELEGATES every path outside that
 * subtree to a fallback real-disk `IFileSystem`.
 *
 * The delegation is essential: the incoming satellite files live only in memory,
 * but the Core's OWN rulesets/corpus (read from `corePath`) still come from real
 * disk via the fallback. Reads inside the overlay subtree never touch disk;
 * mutating operations inside the subtree are kept in memory (never flushed), and
 * mutating operations outside the subtree delegate to the fallback.
 */
export class OverlayFileSystem implements IFileSystem {
  private readonly root: string;
  private readonly files: Map<string, string>;

  /**
   * @param overlayRoot  Synthetic absolute root for the satellite subtree.
   * @param files        Map of RELATIVE path (posix-style, relative to
   *                     `overlayRoot`) -> file content.
   * @param fallback     Real `IFileSystem` used for every path outside the
   *                     overlay subtree (crucially the Core's own corpus).
   */
  constructor(overlayRoot: string, files: Record<string, string>, private readonly fallback: IFileSystem) {
    this.root = path.resolve(overlayRoot);
    this.files = new Map();
    for (const [rel, content] of Object.entries(files ?? {})) {
      this.files.set(this.absKey(rel), content);
    }
  }

  /** Normalise a relative overlay key to an absolute path under the root. */
  private absKey(rel: string): string {
    const normalised = rel.split(/[\\/]+/).filter(Boolean).join(path.sep);
    return path.resolve(this.root, normalised);
  }

  /** True when `p` is the overlay root or lives beneath it. */
  private isOverlay(p: string): boolean {
    const abs = path.resolve(p);
    return abs === this.root || abs.startsWith(`${this.root}${path.sep}`);
  }

  // --- Reads -------------------------------------------------------------

  async readFile(filePath: string): Promise<string> {
    if (this.isOverlay(filePath)) {
      const key = path.resolve(filePath);
      const content = this.files.get(key);
      if (content === undefined) {
        throw Object.assign(new Error(`ENOENT: no such file (overlay): ${filePath}`), { code: 'ENOENT' });
      }
      return content;
    }
    return this.fallback.readFile(filePath);
  }

  async readFileBuffer(filePath: string): Promise<Buffer> {
    if (this.isOverlay(filePath)) {
      return Buffer.from(await this.readFile(filePath), 'utf-8');
    }
    return this.fallback.readFileBuffer(filePath);
  }

  async readJson<T = unknown>(filePath: string): Promise<T> {
    if (this.isOverlay(filePath)) {
      return JSON.parse(await this.readFile(filePath)) as T;
    }
    return this.fallback.readJson<T>(filePath);
  }

  async exists(filePath: string): Promise<boolean> {
    if (this.isOverlay(filePath)) {
      return this.existsInOverlay(filePath);
    }
    return this.fallback.exists(filePath);
  }

  existsSync(filePath: string): boolean {
    if (this.isOverlay(filePath)) {
      return this.existsInOverlay(filePath);
    }
    return this.fallback.existsSync(filePath);
  }

  /** A path exists in the overlay if it is a stored file or a derived directory. */
  private existsInOverlay(filePath: string): boolean {
    const abs = path.resolve(filePath);
    if (this.files.has(abs)) return true;
    if (abs === this.root) return true;
    // Directory: any stored file lives beneath it.
    const prefix = `${abs}${path.sep}`;
    for (const key of this.files.keys()) {
      if (key.startsWith(prefix)) return true;
    }
    return false;
  }

  async readdir(dirPath: string): Promise<DirEntry[]> {
    if (this.isOverlay(dirPath)) {
      return this.readdirOverlay(dirPath).map(({ name, isDir }) => ({
        name,
        isDirectory: () => isDir,
        isFile: () => !isDir,
      }));
    }
    return this.fallback.readdir(dirPath);
  }

  async readdirNames(dirPath: string): Promise<string[]> {
    if (this.isOverlay(dirPath)) {
      return this.readdirOverlay(dirPath).map((e) => e.name);
    }
    return this.fallback.readdirNames(dirPath);
  }

  /** Derive the immediate children (files and dirs) of an overlay directory. */
  private readdirOverlay(dirPath: string): Array<{ name: string; isDir: boolean }> {
    const abs = path.resolve(dirPath);
    const prefix = abs === this.root ? `${this.root}${path.sep}` : `${abs}${path.sep}`;
    const files = new Set<string>();
    const dirs = new Set<string>();
    for (const key of this.files.keys()) {
      if (!key.startsWith(prefix)) continue;
      const rest = key.slice(prefix.length);
      const slash = rest.indexOf(path.sep);
      if (slash === -1) {
        files.add(rest);
      } else {
        dirs.add(rest.slice(0, slash));
      }
    }
    return [
      ...[...dirs].map((name) => ({ name, isDir: true })),
      ...[...files].map((name) => ({ name, isDir: false })),
    ];
  }

  async stat(filePath: string): Promise<{ isDirectory: () => boolean; isFile: () => boolean }> {
    if (this.isOverlay(filePath)) {
      const abs = path.resolve(filePath);
      const isFile = this.files.has(abs);
      return { isFile: () => isFile, isDirectory: () => !isFile };
    }
    return this.fallback.stat(filePath);
  }

  // --- Mutations ---------------------------------------------------------
  // Inside the overlay subtree, mutations stay in memory (never flushed to
  // disk) to preserve statelessness. Outside, they delegate to the fallback.

  async writeFile(filePath: string, content: string): Promise<void> {
    if (this.isOverlay(filePath)) {
      this.files.set(path.resolve(filePath), content);
      return;
    }
    return this.fallback.writeFile(filePath, content);
  }

  async writeJson(filePath: string, content: unknown): Promise<void> {
    if (this.isOverlay(filePath)) {
      this.files.set(path.resolve(filePath), JSON.stringify(content, null, 2));
      return;
    }
    return this.fallback.writeJson(filePath, content);
  }

  async mkdir(dirPath: string): Promise<void> {
    if (this.isOverlay(dirPath)) return; // directories are derived from keys
    return this.fallback.mkdir(dirPath);
  }

  async ensureDir(dirPath: string): Promise<void> {
    if (this.isOverlay(dirPath)) return;
    return this.fallback.ensureDir(dirPath);
  }

  async ensureFile(filePath: string): Promise<void> {
    if (this.isOverlay(filePath)) {
      const abs = path.resolve(filePath);
      if (!this.files.has(abs)) this.files.set(abs, '');
      return;
    }
    return this.fallback.ensureFile(filePath);
  }

  async copy(src: string, dest: string): Promise<void> {
    if (this.isOverlay(dest)) {
      const content = this.isOverlay(src)
        ? this.files.get(path.resolve(src)) ?? ''
        : await this.fallback.readFile(src);
      this.files.set(path.resolve(dest), content);
      return;
    }
    return this.fallback.copy(src, dest);
  }

  async remove(filePath: string): Promise<void> {
    if (this.isOverlay(filePath)) {
      const abs = path.resolve(filePath);
      this.files.delete(abs);
      const prefix = `${abs}${path.sep}`;
      for (const key of [...this.files.keys()]) {
        if (key.startsWith(prefix)) this.files.delete(key);
      }
      return;
    }
    return this.fallback.remove(filePath);
  }
}
