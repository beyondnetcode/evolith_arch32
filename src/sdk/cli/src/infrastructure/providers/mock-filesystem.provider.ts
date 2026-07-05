import { IFileSystem, DirEntry } from '@beyondnet/evolith-core-domain/domain/interfaces';

export interface MockFileEntry {
  path: string;
  isDirectory: boolean;
  isFile: boolean;
  content?: string;
  json?: unknown;
}

export class MockFileSystemProvider implements IFileSystem {
  private files: Map<string, MockFileEntry> = new Map();

  setFile(path: string, content: string): void {
    this.files.set(path, { path, isDirectory: false, isFile: true, content });
  }

  setJson(path: string, data: unknown): void {
    this.files.set(path, { path, isDirectory: false, isFile: true, json: data });
  }

  setDirectory(path: string): void {
    this.files.set(path, { path, isDirectory: true, isFile: false });
  }

  clear(): void {
    this.files.clear();
  }

  private normalize(path: string): string {
    return path.replace(/\\/g, '/').replace(/\/+/g, '/');
  }

  async exists(filePath: string): Promise<boolean> {
    const normalized = this.normalize(filePath);
    if (this.files.has(normalized)) {
      return true;
    }
    let parent = normalized.substring(0, normalized.lastIndexOf('/'));
    while (parent && parent !== '/') {
      if (this.files.has(parent)) {
        return this.files.get(parent)!.isDirectory;
      }
      parent = parent.substring(0, parent.lastIndexOf('/'));
    }
    return false;
  }

  existsSync(filePath: string): boolean {
    return this.files.has(this.normalize(filePath));
  }

  async readFile(filePath: string): Promise<string> {
    const normalized = this.normalize(filePath);
    const entry = this.files.get(normalized);
    if (!entry) {
      throw new Error(`File not found: ${filePath}`);
    }
    if (entry.isDirectory) {
      throw new Error(`Path is directory: ${filePath}`);
    }
    return entry.content || '';
  }

  async readFileBuffer(filePath: string): Promise<Buffer> {
    const content = await this.readFile(filePath);
    return Buffer.from(content);
  }

  async readJson<T = unknown>(filePath: string): Promise<T> {
    const normalized = this.normalize(filePath);
    const entry = this.files.get(normalized);
    if (!entry) {
      throw new Error(`File not found: ${filePath}`);
    }
    if (entry.json !== undefined) {
      return entry.json as T;
    }
    if (entry.content) {
      return JSON.parse(entry.content || '{}') as T;
    }
    throw new Error(`No JSON content: ${filePath}`);
  }

  async writeFile(filePath: string, content: string): Promise<void> {
    const normalized = this.normalize(filePath);
    this.files.set(normalized, { path: normalized, isDirectory: false, isFile: true, content });
  }

  async writeJson(filePath: string, data: unknown): Promise<void> {
    const normalized = this.normalize(filePath);
    this.files.set(normalized, { path: normalized, isDirectory: false, isFile: true, json: data });
  }

  async readdir(filePath: string): Promise<DirEntry[]> {
    const normalized = this.normalize(filePath);
    const results: DirEntry[] = [];

    for (const [path, entry] of this.files.entries()) {
      if (path.startsWith(normalized + '/')) {
        const relative = path.substring(normalized.length + 1);
        if (!relative.includes('/')) {
          results.push({
            name: entry.path.split('/').pop()!,
            isDirectory: () => entry.isDirectory,
            isFile: () => entry.isFile,
          });
        }
      }
    }

    return results;
  }

  async readdirNames(filePath: string): Promise<string[]> {
    const entries = await this.readdir(filePath);
    return entries.map(e => e.name);
  }

  async remove(filePath: string): Promise<void> {
    const normalized = this.normalize(filePath);
    this.files.delete(normalized);
    for (const key of this.files.keys()) {
      if (key.startsWith(normalized + '/')) {
        this.files.delete(key);
      }
    }
  }

  async ensureDir(filePath: string): Promise<void> {
    const normalized = this.normalize(filePath);
    if (!this.files.has(normalized)) {
      this.files.set(normalized, { path: normalized, isDirectory: true, isFile: false });
    }
  }

  async stat(filePath: string): Promise<{ isDirectory: () => boolean; isFile: () => boolean }> {
    const normalized = this.normalize(filePath);
    const entry = this.files.get(normalized);
    if (!entry) {
      throw new Error(`Path not found: ${filePath}`);
    }
    return {
      isDirectory: () => entry.isDirectory,
      isFile: () => entry.isFile,
    };
  }
  async mkdir(path: string): Promise<void> {}
  async copy(src: string, dest: string): Promise<void> {}
  async ensureFile(path: string): Promise<void> {}
}
