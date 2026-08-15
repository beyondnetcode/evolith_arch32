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

/**
 * GT-683 — resolve a path a config DECLARED, against the satellite it describes.
 *
 * Absolute paths are honoured as written; relative ones hang off the satellite,
 * which is the convention `agent.config.json`'s `runbooksPath` already used.
 */
export function resolveDeclaredPath(satellitePath: string, declared: string): string {
  return path.isAbsolute(declared) ? declared : path.join(satellitePath, declared);
}

/**
 * GT-683 — a declared directory that exists AND holds something.
 *
 * The agentic-AI rules compared two arrays of strings and never looked at the
 * repository, so a descriptor naming directories that do not exist satisfied
 * them. An EMPTY directory is refused too: `promptSources: ["prompts"]` with an
 * empty `prompts/` is the same claim with one `mkdir` of camouflage, and the
 * self-conformance spec already asserted non-emptiness on disk — this moves that
 * assertion from a test about ourselves into the rule that judges everyone.
 */
export async function declaredDirectoryIsPopulated(fs: IFileSystem, satellitePath: string, declared: string): Promise<boolean> {
  const full = resolveDeclaredPath(satellitePath, declared);
  if (!await fs.exists(full)) return false;
  try {
    if (!(await fs.stat(full)).isDirectory()) return false;
    return (await fs.readdirNames(full)).some((entry) => entry !== '.' && entry !== '..');
  } catch {
    return false;
  }
}

/**
 * GT-683 — a declared document that is a readable FILE with content.
 *
 * `fs.exists` was the whole check behind AAI-R08's "a runbooksPath that exists",
 * and `exists` is true of a DIRECTORY: an empty folder satisfied a rule whose
 * own text demands "a readable runbook document". A zero-byte file is refused
 * for the same reason — the rule asks for something an operator can act on.
 */
export async function declaredFileHasContent(fs: IFileSystem, satellitePath: string, declared: string): Promise<boolean> {
  const full = resolveDeclaredPath(satellitePath, declared);
  if (!await fs.exists(full)) return false;
  try {
    if (!(await fs.stat(full)).isFile()) return false;
    return (await fs.readFile(full)).trim().length > 0;
  } catch {
    return false;
  }
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
