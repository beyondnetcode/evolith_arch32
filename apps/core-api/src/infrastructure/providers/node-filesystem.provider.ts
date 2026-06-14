import * as fs from 'fs-extra';
import * as path from 'path';
import {
  IFileSystem,
  IFileSystemProvider,
  FileExistsOptions,
  FileReadOptions,
  FileWriteOptions,
  DirEntry,
} from '@evolith/core-domain/domain/interfaces';

export class NodeFileSystemProvider implements IFileSystemProvider, IFileSystem {
  createFileSystem(): IFileSystem {
    return this;
  }
  private resolvePath(filePath: string, cwd?: string): string {
    if (path.isAbsolute(filePath)) {
      return filePath;
    }
    return cwd ? path.join(cwd, filePath) : path.resolve(filePath);
  }

  async exists(filePath: string, options?: FileExistsOptions): Promise<boolean> {
    const resolved = this.resolvePath(filePath, options?.cwd);
    return fs.pathExists(resolved);
  }

  existsSync(filePath: string): boolean {
    const resolved = this.resolvePath(filePath);
    return fs.existsSync(resolved);
  }

  async readFile(filePath: string, options?: FileReadOptions): Promise<string> {
    const resolved = this.resolvePath(filePath, options?.cwd);
    return fs.readFile(resolved, options?.encoding || 'utf-8');
  }

  async readFileBuffer(filePath: string): Promise<Buffer> {
    const resolved = this.resolvePath(filePath);
    return fs.readFile(resolved);
  }

  async readJson<T = unknown>(filePath: string, options?: FileReadOptions): Promise<T> {
    const content = await this.readFile(filePath, options);
    return JSON.parse(content);
  }

  async writeFile(filePath: string, content: string, options?: FileWriteOptions): Promise<void> {
    const resolved = this.resolvePath(filePath, options?.cwd);
    await fs.writeFile(resolved, content, options?.encoding || 'utf-8');
  }

  async writeJson(filePath: string, data: unknown, options?: FileWriteOptions): Promise<void> {
    const resolved = this.resolvePath(filePath, options?.cwd);
    await fs.writeJson(resolved, data, { spaces: 2, ...options });
  }

  async readdir(filePath: string): Promise<DirEntry[]> {
    const resolved = this.resolvePath(filePath);
    const entries = await fs.readdir(resolved, { withFileTypes: true });
    return entries.map(entry => ({
      name: entry.name,
      isDirectory: () => entry.isDirectory(),
      isFile: () => entry.isFile(),
    }));
  }

  async readdirNames(filePath: string): Promise<string[]> {
    const resolved = this.resolvePath(filePath);
    return fs.readdir(resolved);
  }

  async remove(filePath: string): Promise<void> {
    const resolved = this.resolvePath(filePath);
    await fs.remove(resolved);
  }

  async ensureDir(filePath: string): Promise<void> {
    const resolved = this.resolvePath(filePath);
    await fs.ensureDir(resolved);
  }

  async stat(filePath: string): Promise<{ isDirectory: () => boolean; isFile: () => boolean }> {
    const resolved = this.resolvePath(filePath);
    const stat = await fs.stat(resolved);
    return {
      isDirectory: () => stat.isDirectory(),
      isFile: () => stat.isFile(),
    };
  }
  async mkdir(path: string): Promise<void> {
    await fs.promises.mkdir(path, { recursive: true });
  }

  async copy(src: string, dest: string): Promise<void> {
    await fs.promises.copyFile(src, dest);
  }

  async ensureFile(path: string): Promise<void> {
    const fs = require('fs-extra');
    await fs.ensureFile(path);
  }
}
