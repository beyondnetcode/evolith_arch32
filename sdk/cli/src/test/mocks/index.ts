import { IFileSystem, IConfigParser, ILogger } from '../../../domain/interfaces';

export class MockFileSystem implements IFileSystem {
  private files: Map<string, string> = new Map();
  private directories: Set<string> = new Set();

  async exists(path: string): Promise<boolean> {
    return this.files.has(path) || this.directories.has(path);
  }

  async readFile(path: string): Promise<string> {
    const content = this.files.get(path);
    if (content === undefined) {
      throw new Error(`File not found: ${path}`);
    }
    return content;
  }

  async writeFile(path: string, content: string): Promise<void> {
    this.files.set(path, content);
  }

  async readJson<T>(path: string): Promise<T> {
    const content = await this.readFile(path);
    return JSON.parse(content) as T;
  }

  async writeJson(path: string, data: unknown): Promise<void> {
    await this.writeFile(path, JSON.stringify(data, null, 2));
  }

  async ensureDir(path: string): Promise<void> {
    this.directories.add(path);
  }

  async readdirNames(path: string): Promise<string[]> {
    const prefix = path.endsWith('/') ? path : path + '/';
    const entries: string[] = [];

    for (const key of this.files.keys()) {
      if (key.startsWith(prefix) && key !== path) {
        const remainder = key.slice(prefix.length);
        const firstSlash = remainder.indexOf('/');
        const entry = firstSlash === -1 ? remainder : remainder.slice(0, firstSlash);
        if (!entries.includes(entry)) {
          entries.push(entry);
        }
      }
    }

    for (const dir of this.directories) {
      if (dir.startsWith(prefix) && dir !== path) {
        const remainder = dir.slice(prefix.length);
        const firstSlash = remainder.indexOf('/');
        const entry = firstSlash === -1 ? remainder : remainder.slice(0, firstSlash);
        if (!entries.includes(entry)) {
          entries.push(entry);
        }
      }
    }

    return entries;
  }

  async remove(path: string): Promise<void> {
    this.files.delete(path);
    this.directories.delete(path);
  }

  setFile(path: string, content: string): void {
    this.files.set(path, content);
  }

  setJsonFile(path: string, data: unknown): void {
    this.files.set(path, JSON.stringify(data, null, 2));
  }

  setDirectory(path: string): void {
    this.directories.add(path);
  }

  clear(): void {
    this.files.clear();
    this.directories.clear();
  }

  getFilePaths(): string[] {
    return Array.from(this.files.keys());
  }

  getDirectoryPaths(): string[] {
    return Array.from(this.directories);
  }
}

export class MockConfigParser implements IConfigParser {
  parse(content: string): unknown {
    try {
      return JSON.parse(content);
    } catch {
      return content;
    }
  }

  stringify(data: unknown): string {
    return JSON.stringify(data);
  }
}

export class MockLogger implements ILogger {
  private logs: Array<{ level: string; message: string; context?: Record<string, unknown> }> = [];

  info(message: string, context?: Record<string, unknown>): void {
    this.logs.push({ level: 'INFO', message, context });
  }

  warn(message: string, context?: Record<string, unknown>): void {
    this.logs.push({ level: 'WARN', message, context });
  }

  error(message: string, context?: Record<string, unknown>): void {
    this.logs.push({ level: 'ERROR', message, context });
  }

  debug(message: string, context?: Record<string, unknown>): void {
    this.logs.push({ level: 'DEBUG', message, context });
  }

  getLogs(): Array<{ level: string; message: string; context?: Record<string, unknown> }> {
    return [...this.logs];
  }

  clear(): void {
    this.logs = [];
  }

  getLogsByLevel(level: string): Array<{ level: string; message: string; context?: Record<string, unknown> }> {
    return this.logs.filter(l => l.level === level);
  }
}

export function createMockFileSystem(): MockFileSystem {
  return new MockFileSystem();
}

export function createMockConfigParser(): MockConfigParser {
  return new MockConfigParser();
}

export function createMockLogger(): MockLogger {
  return new MockLogger();
}