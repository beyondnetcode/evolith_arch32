import { IFileSystem } from '../../abstractions';

let cachedFs: IFileSystem | null = null;

export function getFileSystem(): IFileSystem {
  if (!cachedFs) {
    cachedFs = require('../../abstractions/providers/node-filesystem.provider').NodeFileSystemProvider.prototype.createFileSystem();
  }
  return cachedFs;
}

export function clearFileSystemCache(): void {
  cachedFs = null;
}

