import { getContainer, IFileSystem } from '../../abstractions';

let cachedFs: IFileSystem | null = null;

export function getFileSystem(): IFileSystem {
  if (!cachedFs) {
    cachedFs = getContainer().createFileSystem();
  }
  return cachedFs;
}

export function clearFileSystemCache(): void {
  cachedFs = null;
}

export { getContainer };