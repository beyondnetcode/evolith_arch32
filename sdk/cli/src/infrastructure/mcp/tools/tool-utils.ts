import { IFileSystem } from '../../../domain/interfaces';

let cachedFs: IFileSystem | null = null;

export function getFileSystem(): IFileSystem {
  if (!cachedFs) {
    cachedFs = require('../../infrastructure/providers/node-filesystem.provider').NodeFileSystemProvider.prototype.createFileSystem();
  }
  return cachedFs;
}

export function clearFileSystemCache(): void {
  cachedFs = null;
}

