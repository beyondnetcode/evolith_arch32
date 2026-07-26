import { DirEntry, IFileSystem } from '@beyondnet/evolith-core-domain/domain/interfaces';

/**
 * GT-571: re-points the scaffolder at the directory the user actually asked for.
 *
 * `InitializeProjectUseCase` always writes into `${cwd}/${input.name}`, which is
 * why `evolith init --name my-sat` created a `my-sat/` subdirectory and the
 * `evolith validate` that the README runs next targeted the parent (GOV-000).
 * The CLI contract is now "initialize the current directory unless a target is
 * given", and the project name stays a name, not a path.
 *
 * Rather than fork the domain use case, the file system it writes through is
 * decorated: every path under the scaffold root it computes is rewritten onto
 * the resolved target directory. Paths outside that root pass through untouched,
 * so nothing else the use case reads is affected.
 */
export class TargetDirectoryFileSystem implements IFileSystem {
  constructor(
    private readonly inner: IFileSystem,
    private readonly scaffoldRoot: string,
    private readonly targetDir: string,
  ) {}

  /** True when no rewriting is needed (the scaffold root already is the target). */
  get isIdentity(): boolean {
    return this.scaffoldRoot === this.targetDir;
  }

  private map(path: string): string {
    if (this.isIdentity || typeof path !== 'string') return path;
    if (path === this.scaffoldRoot) return this.targetDir;
    if (path.startsWith(`${this.scaffoldRoot}/`)) {
      return `${this.targetDir}${path.slice(this.scaffoldRoot.length)}`;
    }
    return path;
  }

  readFile(path: string): Promise<string> {
    return this.inner.readFile(this.map(path));
  }

  readFileBuffer(path: string): Promise<Buffer> {
    return this.inner.readFileBuffer(this.map(path));
  }

  writeFile(path: string, content: string): Promise<void> {
    return this.inner.writeFile(this.map(path), content);
  }

  exists(path: string): Promise<boolean> {
    return this.inner.exists(this.map(path));
  }

  existsSync(path: string): boolean {
    return this.inner.existsSync(this.map(path));
  }

  readJson<T = unknown>(path: string): Promise<T> {
    return this.inner.readJson<T>(this.map(path));
  }

  writeJson(path: string, content: unknown): Promise<void> {
    return this.inner.writeJson(this.map(path), content);
  }

  mkdir(path: string): Promise<void> {
    return this.inner.mkdir(this.map(path));
  }

  readdir(path: string): Promise<DirEntry[]> {
    return this.inner.readdir(this.map(path));
  }

  readdirNames(path: string): Promise<string[]> {
    return this.inner.readdirNames(this.map(path));
  }

  copy(src: string, dest: string): Promise<void> {
    return this.inner.copy(this.map(src), this.map(dest));
  }

  ensureDir(path: string): Promise<void> {
    return this.inner.ensureDir(this.map(path));
  }

  ensureFile(path: string): Promise<void> {
    return this.inner.ensureFile(this.map(path));
  }

  stat(path: string): Promise<{ isDirectory: () => boolean; isFile: () => boolean }> {
    return this.inner.stat(this.map(path));
  }

  remove(path: string): Promise<void> {
    return this.inner.remove(this.map(path));
  }
}

/**
 * A file system that writes nothing, for `init --dry-run`.
 *
 * The flag was declared and then ignored, which was survivable while `init`
 * scaffolded into a fresh subdirectory and is not now that it initializes the
 * directory the user is standing in. The use case still reports the artifacts it
 * would have produced, because it builds that list independently of the writes.
 */
export class DryRunFileSystem implements IFileSystem {
  async readFile(): Promise<string> {
    return '';
  }

  async readFileBuffer(): Promise<Buffer> {
    return Buffer.alloc(0);
  }

  async writeFile(): Promise<void> {
    /* intentionally not written */
  }

  async exists(): Promise<boolean> {
    return false;
  }

  existsSync(): boolean {
    return false;
  }

  async readJson<T = unknown>(): Promise<T> {
    return {} as T;
  }

  async writeJson(): Promise<void> {
    /* intentionally not written */
  }

  async mkdir(): Promise<void> {
    /* intentionally not created */
  }

  async readdir(): Promise<DirEntry[]> {
    return [];
  }

  async readdirNames(): Promise<string[]> {
    return [];
  }

  async copy(): Promise<void> {
    /* intentionally not copied */
  }

  async ensureDir(): Promise<void> {
    /* intentionally not created */
  }

  async ensureFile(): Promise<void> {
    /* intentionally not created */
  }

  async stat(): Promise<{ isDirectory: () => boolean; isFile: () => boolean }> {
    return { isDirectory: () => false, isFile: () => false };
  }

  async remove(): Promise<void> {
    /* intentionally not removed */
  }
}
