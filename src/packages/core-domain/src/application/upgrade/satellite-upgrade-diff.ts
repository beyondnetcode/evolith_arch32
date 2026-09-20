import * as path from 'path';
import { IFileSystem } from '../../domain/interfaces';
import { UpgradeChange } from './satellite-upgrade.types';
import { findJsonFiles } from './satellite-upgrade-fs';
import { classifyChange } from './satellite-upgrade-classify';
import { ScaffoldManifest, sha256Of, toManifestKey } from './scaffold-manifest';

export async function getSatelliteVersion(fs: IFileSystem, satellitePath: string): Promise<string> {
  const evolithYamlPath = path.join(satellitePath, 'evolith.yaml');
  if (!await fs.exists(evolithYamlPath)) return 'unknown';
  try {
    const content = await fs.readFile(evolithYamlPath);
    const config = JSON.parse(content) as { coreRef?: { version?: string } };
    return config.coreRef?.version || 'unknown';
  } catch {
    return 'unknown';
  }
}

export async function getCoreVersion(fs: IFileSystem, corePath: string): Promise<string> {
  const versionPath = path.join(corePath, 'package.json');
  if (!await fs.exists(versionPath)) return 'unknown';
  try {
    const pkg = await fs.readJson(versionPath) as { version?: string };
    return pkg.version || 'unknown';
  } catch {
    return 'unknown';
  }
}

const BREAKING_PATTERNS = ['inheritance', 'anti-corruption', 'open-core-boundary', 'governance'];

export function isBreakingChange(relativePath: string): boolean {
  const lower = relativePath.toLowerCase();
  return BREAKING_PATTERNS.some(pattern => lower.includes(pattern));
}

/**
 * A Core file the upgrade tracks, and where it lands in the satellite.
 * `relativePath` is the manifest key (satellite-relative, POSIX).
 */
export interface TrackedFile {
  sourcePath: string;
  targetPath: string;
  relativePath: string;
  /** Which corpus it belongs to; harness files are only ever added, never modified. */
  corpus: 'rulesets' | 'harness';
}

/**
 * Every Core file `upgrade` compares — rulesets and harness JSON. Shared by the
 * diff and by `--accept-local`, so the two cannot disagree on what is tracked.
 */
export async function listTrackedFiles(fs: IFileSystem, satellitePath: string, corePath: string): Promise<TrackedFile[]> {
  const tracked: TrackedFile[] = [];

  // GT-632: the rulesets moved under `src/` and this join was left behind. It is
  // guarded by an early return, so the failure was SILENT — a satellite upgrade
  // simply reported no ruleset changes, which reads exactly like having none.
  const coreRulesetsPath = await fs.exists(path.join(corePath, 'src', 'rulesets'))
    ? path.join(corePath, 'src', 'rulesets')
    : path.join(corePath, 'rulesets');
  if (await fs.exists(coreRulesetsPath)) {
    const satelliteRulesetsPath = path.join(satellitePath, 'rulesets');
    for (const sourcePath of await findJsonFiles(fs, coreRulesetsPath)) {
      const targetPath = path.join(satelliteRulesetsPath, path.relative(coreRulesetsPath, sourcePath));
      tracked.push({ sourcePath, targetPath, relativePath: toManifestKey(satellitePath, targetPath), corpus: 'rulesets' });
    }
  }

  const coreHarnessPath = path.join(corePath, '.harness');
  if (await fs.exists(coreHarnessPath)) {
    const satelliteHarnessPath = path.join(satellitePath, '.harness');
    for (const sourcePath of await findJsonFiles(fs, coreHarnessPath)) {
      const targetPath = path.join(satelliteHarnessPath, path.relative(coreHarnessPath, sourcePath));
      tracked.push({ sourcePath, targetPath, relativePath: toManifestKey(satellitePath, targetPath), corpus: 'harness' });
    }
  }

  return tracked;
}

/**
 * GT-673: every difference is classified against the scaffold manifest. A
 * `null` manifest is a satellite with no baseline — every content difference
 * becomes a `conflict` with reason `no-fingerprint` (fail-closed).
 */
export async function diffSatelliteVsCore(
  fs: IFileSystem,
  satellitePath: string,
  corePath: string,
  manifest: ScaffoldManifest | null,
): Promise<UpgradeChange[]> {
  const changes: UpgradeChange[] = [];

  for (const file of await listTrackedFiles(fs, satellitePath, corePath)) {
    const exists = await fs.exists(file.targetPath);

    if (file.corpus === 'harness') {
      // Harness files are only ever added; the satellite's copies are its own
      // (pre-GT-673 behaviour, kept: the diff never emitted `modify` for them).
      if (!exists) {
        changes.push({
          type: 'add',
          sourcePath: file.sourcePath,
          targetPath: file.targetPath,
          relativePath: file.relativePath,
          description: `Add harness file: ${relativeWithinCorpus(file)}`,
          breaking: false,
          classification: 'upstream-only',
        });
      }
      continue;
    }

    const coreContent = await fs.readFile(file.sourcePath);
    const outcome = classifyChange({
      core: sha256Of(coreContent),
      satellite: exists ? sha256Of(await fs.readFile(file.targetPath)) : null,
      baseline: manifest?.files[file.relativePath]?.sha256 ?? null,
    });

    if (outcome.kind === 'unchanged') continue;

    const breaking = isBreakingChange(relativeWithinCorpus(file));
    if (outcome.kind === 'add') {
      changes.push({
        type: 'add',
        sourcePath: file.sourcePath,
        targetPath: file.targetPath,
        relativePath: file.relativePath,
        description: `Add new ruleset: ${relativeWithinCorpus(file)}`,
        breaking,
        classification: outcome.classification,
      });
      continue;
    }

    changes.push({
      type: 'modify',
      sourcePath: file.sourcePath,
      targetPath: file.targetPath,
      relativePath: file.relativePath,
      description: describeModify(relativeWithinCorpus(file), outcome),
      breaking,
      classification: outcome.classification,
      ...(outcome.classification === 'conflict' ? { reason: outcome.reason } : {}),
    });
  }

  return changes;
}

/** The path as the pre-GT-673 descriptions printed it: relative to the corpus root. */
function relativeWithinCorpus(file: TrackedFile): string {
  return file.relativePath.replace(/^(rulesets|\.harness)\//, '');
}

function describeModify(
  corpusRelative: string,
  outcome: Extract<ReturnType<typeof classifyChange>, { kind: 'modify' }>,
): string {
  switch (outcome.classification) {
    case 'upstream-only':
      return `Update ruleset: ${corpusRelative}`;
    case 'local-only':
      return `Local edit kept: ${corpusRelative}`;
    case 'conflict':
      return outcome.reason === 'no-fingerprint'
        ? `Conflict (no fingerprint): ${corpusRelative}`
        : `Conflict (both changed): ${corpusRelative}`;
  }
}
