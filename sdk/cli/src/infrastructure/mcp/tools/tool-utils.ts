import { IFileSystem } from '../../../core/abstractions';

let cachedFs: IFileSystem | null = null;

export function getFileSystem(): IFileSystem {
  if (!cachedFs) {
    cachedFs = require('../../core/abstractions/providers/node-filesystem.provider').NodeFileSystemProvider.prototype.createFileSystem();
  }
  return cachedFs;
}

export function clearFileSystemCache(): void {
  cachedFs = null;
}

