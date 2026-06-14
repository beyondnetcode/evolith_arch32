import { IFileSystem } from '@evolith/core-domain/domain/interfaces';

let cachedFs: IFileSystem | null = null;

export function getFileSystem(): IFileSystem {
  if (!cachedFs) {
    cachedFs = require('../../providers/node-filesystem.provider').NodeFileSystemProvider.prototype.createFileSystem();
  }
  return cachedFs!;
}

export function clearFileSystemCache(): void {
  cachedFs = null;
}

