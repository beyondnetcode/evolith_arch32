/**
 * @file scaffold-manifest.ts
 * @description The satellite's record of what the Core gave it (GT-673).
 *
 * `evolith upgrade` compares the Core's files with the satellite's. A content
 * difference alone cannot say WHO moved: the Core (a new rule shipped) or the
 * tenant (a threshold tightened in a scaffolded ruleset). Before GT-673 every
 * difference was treated as upstream and copied over — the tenant's edit was
 * the casualty. This manifest is the third point of the comparison: for every
 * file a Core path scaffolded or copied into the satellite it records the
 * SHA-256 of the content the Core delivered, and the Core version it came from.
 *
 * With that baseline, classification is a three-way merge (see
 * `satellite-upgrade-classify.ts`): satellite == baseline means the tenant never
 * touched the file; core == baseline means upstream never moved it.
 *
 * Every path that writes Core-governed files into a satellite records here —
 * `InitializeProjectUseCase` (init) and the upgrade apply itself — and every
 * write MERGES into the existing manifest, so entries from one path survive the
 * others. The document is committed with the satellite: it is the satellite's
 * memory, not a cache.
 */
import { createHash } from 'node:crypto';
import * as path from 'path';
import { IFileSystem } from '../../domain/interfaces';

/** Where the manifest lives, relative to the satellite root (POSIX separators). */
export const SCAFFOLD_MANIFEST_RELATIVE_PATH = '.evolith/scaffold-manifest.json';

/** Bumped only when the document shape changes incompatibly. */
export const SCAFFOLD_MANIFEST_SCHEMA_VERSION = 1 as const;

export interface ScaffoldManifestEntry {
  /** SHA-256 (hex) of the content the Core delivered for this file. */
  sha256: string;
  /** The Core version that content came from. */
  coreVersion: string;
}

export interface ScaffoldManifest {
  schemaVersion: typeof SCAFFOLD_MANIFEST_SCHEMA_VERSION;
  /** The Core version of the most recent write. Entries carry their own. */
  coreVersion: string;
  /** ISO-8601 timestamp of the most recent write. */
  generatedAt: string;
  /** Keyed by satellite-relative POSIX path (`rulesets/acl/x.rules.json`). */
  files: Record<string, ScaffoldManifestEntry>;
}

/** One file to record: its satellite-relative path and the delivered content. */
export interface ScaffoldedFile {
  relativePath: string;
  content: string;
}

/** Raised when a manifest exists but cannot be trusted. Never swallowed: a
 * corrupt baseline must not silently degrade into "no baseline". */
export class ScaffoldManifestError extends Error {
  constructor(readonly manifestPath: string, detail: string) {
    super(`Scaffold manifest at ${manifestPath} is not usable: ${detail}`);
    this.name = 'ScaffoldManifestError';
  }
}

export function sha256Of(content: string): string {
  return createHash('sha256').update(content, 'utf8').digest('hex');
}

/** Absolute path of the manifest for a satellite root. */
export function scaffoldManifestPath(satellitePath: string): string {
  return path.join(satellitePath, ...SCAFFOLD_MANIFEST_RELATIVE_PATH.split('/'));
}

/**
 * Satellite-relative POSIX key for an absolute path inside the satellite. The
 * manifest is committed and read on every platform, so separators are
 * normalised on the way in.
 */
export function toManifestKey(satellitePath: string, absolutePath: string): string {
  return path.relative(satellitePath, absolutePath).split(path.sep).join('/');
}

/**
 * Read the manifest. `null` means the satellite has no baseline (a legacy
 * satellite, or one scaffolded before GT-673) — the caller must treat every
 * difference as a conflict. A present-but-malformed document throws.
 */
export async function readScaffoldManifest(fs: IFileSystem, satellitePath: string): Promise<ScaffoldManifest | null> {
  const manifestPath = scaffoldManifestPath(satellitePath);
  if (!await fs.exists(manifestPath)) return null;

  let raw: unknown;
  try {
    raw = JSON.parse(await fs.readFile(manifestPath));
  } catch (error: unknown) {
    throw new ScaffoldManifestError(manifestPath, `invalid JSON (${error instanceof Error ? error.message : String(error)})`);
  }
  return parseScaffoldManifest(raw, manifestPath);
}

/**
 * Typed parser — the manifest is a `.evolith/` document, not a ruleset, so it is
 * validated here rather than by a JSON schema under `src/rulesets/schema/`.
 */
export function parseScaffoldManifest(raw: unknown, manifestPath = SCAFFOLD_MANIFEST_RELATIVE_PATH): ScaffoldManifest {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new ScaffoldManifestError(manifestPath, 'expected a JSON object');
  }
  const doc = raw as Record<string, unknown>;
  if (doc.schemaVersion !== SCAFFOLD_MANIFEST_SCHEMA_VERSION) {
    throw new ScaffoldManifestError(manifestPath, `unsupported schemaVersion ${JSON.stringify(doc.schemaVersion)} (expected ${SCAFFOLD_MANIFEST_SCHEMA_VERSION})`);
  }
  if (typeof doc.coreVersion !== 'string') {
    throw new ScaffoldManifestError(manifestPath, '`coreVersion` must be a string');
  }
  if (typeof doc.generatedAt !== 'string') {
    throw new ScaffoldManifestError(manifestPath, '`generatedAt` must be a string');
  }
  if (!doc.files || typeof doc.files !== 'object' || Array.isArray(doc.files)) {
    throw new ScaffoldManifestError(manifestPath, '`files` must be an object');
  }

  const files: Record<string, ScaffoldManifestEntry> = {};
  for (const [key, value] of Object.entries(doc.files as Record<string, unknown>)) {
    const entry = value as Record<string, unknown> | null;
    if (!entry || typeof entry !== 'object' || typeof entry.sha256 !== 'string' || !/^[0-9a-f]{64}$/.test(entry.sha256) || typeof entry.coreVersion !== 'string') {
      throw new ScaffoldManifestError(manifestPath, `entry "${key}" must be { sha256: <64 hex chars>, coreVersion: <string> }`);
    }
    files[key] = { sha256: entry.sha256, coreVersion: entry.coreVersion };
  }

  return {
    schemaVersion: SCAFFOLD_MANIFEST_SCHEMA_VERSION,
    coreVersion: doc.coreVersion,
    generatedAt: doc.generatedAt,
    files,
  };
}

export async function writeScaffoldManifest(fs: IFileSystem, satellitePath: string, manifest: ScaffoldManifest): Promise<void> {
  const manifestPath = scaffoldManifestPath(satellitePath);
  await fs.ensureDir(path.dirname(manifestPath));
  // Keys sorted so the committed document diffs cleanly between upgrades.
  const files: Record<string, ScaffoldManifestEntry> = {};
  for (const key of Object.keys(manifest.files).sort()) files[key] = manifest.files[key];
  await fs.writeJson(manifestPath, { ...manifest, files });
}

/**
 * Record delivered content for `files`, merging into whatever manifest already
 * exists (a missing one is created). Returns the manifest as written.
 *
 * `now` is injectable so tests can pin `generatedAt`.
 */
export async function recordScaffoldedFiles(
  fs: IFileSystem,
  satellitePath: string,
  coreVersion: string,
  files: readonly ScaffoldedFile[],
  now: () => Date = () => new Date(),
): Promise<ScaffoldManifest> {
  const existing = await readScaffoldManifest(fs, satellitePath);
  const manifest: ScaffoldManifest = {
    schemaVersion: SCAFFOLD_MANIFEST_SCHEMA_VERSION,
    coreVersion,
    generatedAt: now().toISOString(),
    files: { ...(existing?.files ?? {}) },
  };
  for (const file of files) {
    manifest.files[file.relativePath.split(path.sep).join('/')] = { sha256: sha256Of(file.content), coreVersion };
  }
  await writeScaffoldManifest(fs, satellitePath, manifest);
  return manifest;
}
