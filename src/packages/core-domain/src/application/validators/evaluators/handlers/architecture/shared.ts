import * as path from 'path';
import { IFileSystem } from '../../../../../domain/interfaces';

export type SubResult = { result: 'passed' | 'failed' | 'skipped'; message?: string };

export const PASSED: SubResult = { result: 'passed' };
export const SKIPPED: SubResult = { result: 'skipped' };

export function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : undefined;
}

export function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string' && item.length > 0) : [];
}

export function isRestrictedAccess(value: unknown): boolean {
  return value === 'deny' || value === 'allowlist';
}

export function isPositiveNumber(value: unknown): boolean {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

export function pathsOverlap(left: string[], right: string[]): boolean {
  return left.some(leftPath => right.some(rightPath => {
    const normalizedLeft = leftPath.replace(/\\+|\/+/g, '/').replace(/\/$/, '');
    const normalizedRight = rightPath.replace(/\\+|\/+/g, '/').replace(/\/$/, '');
    return normalizedLeft === normalizedRight || normalizedLeft.startsWith(`${normalizedRight}/`) || normalizedRight.startsWith(`${normalizedLeft}/`);
  }));
}

export async function getAllFilesRecursive(fs: IFileSystem, dir: string): Promise<string[]> {
  const files: string[] = [];
  if (!await fs.exists(dir)) return files;
  const entries = await fs.readdirNames(dir);
  for (const entry of entries) {
    if (entry === '.' || entry === '..') continue;
    const full = path.join(dir, entry);
    const stat = await fs.stat(full);
    if (stat.isDirectory()) {
      files.push(...await getAllFilesRecursive(fs, full));
    } else {
      files.push(full);
    }
  }
  return files;
}

export async function readJsonConfig(fs: IFileSystem, satellitePath: string, fileName: string): Promise<Record<string, unknown> | undefined> {
  const configPath = path.join(satellitePath, fileName);
  if (!await fs.exists(configPath)) return undefined;
  return asRecord(await fs.readJson(configPath));
}
