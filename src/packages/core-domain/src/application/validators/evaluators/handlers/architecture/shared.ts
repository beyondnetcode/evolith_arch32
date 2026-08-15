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

/** GT-683 — a contradiction found in code the descriptor points at. */
export interface DeclaredBoundaryBreach {
  readonly file: string;
  readonly line: number;
  readonly evidence: string;
}

/** Source files worth reading; anything else is data or build output. */
const SCANNABLE = /\.(ts|tsx|js|jsx|mjs|cjs)$/;
const SKIP_SEGMENT = /(^|\/)(node_modules|dist|build|coverage|\.git)(\/|$)/;

/**
 * GT-683 — raw outbound sockets and environment-inheriting child processes.
 *
 * Deliberately NARROW. A broad scan (every `fetch`, every `exec`) would fire on
 * legitimate code, and a rule that cries wolf is disabled within a week — which is
 * worse than no rule. These patterns are unambiguous: a raw socket is not an HTTP
 * client behind a policy, and `env: process.env` is the literal act of handing the
 * ambient environment to a child.
 */
const BREACH_PATTERNS: readonly { readonly re: RegExp; readonly what: string }[] = [
  { re: /\bnet\s*\.\s*(connect|createConnection)\s*\(/, what: 'raw outbound socket (net)' },
  { re: /\btls\s*\.\s*connect\s*\(/, what: 'raw outbound socket (tls)' },
  { re: /\bdgram\s*\.\s*createSocket\s*\(/, what: 'raw datagram socket' },
  { re: /env\s*:\s*process\.env\b/, what: 'child process inheriting the ambient environment' },
];

/**
 * Scan the roots a descriptor DECLARES for acts its own declaration forbids.
 *
 * Scope is the declared `implementationRoots` and nothing else: the claim under test
 * is about the agent's implementation, the descriptor is what says where that lives,
 * and scanning a whole repository would judge code the claim never covered.
 */
export async function findDeclaredBoundaryBreaches(
  fs: IFileSystem,
  satellitePath: string,
  roots: readonly string[],
): Promise<DeclaredBoundaryBreach[]> {
  const breaches: DeclaredBoundaryBreach[] = [];
  for (const root of roots) {
    const full = resolveDeclaredPath(satellitePath, root);
    if (!await fs.exists(full)) continue;
    for (const file of await getAllFilesRecursive(fs, full)) {
      if (!SCANNABLE.test(file) || SKIP_SEGMENT.test(file)) continue;
      let content: string;
      try {
        content = await fs.readFile(file);
      } catch {
        continue;
      }
      content.split('\n').forEach((text, index) => {
        for (const { re, what } of BREACH_PATTERNS) {
          if (re.test(text)) breaches.push({ file, line: index + 1, evidence: `${what}: ${text.trim().slice(0, 80)}` });
        }
      });
    }
  }
  return breaches;
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
