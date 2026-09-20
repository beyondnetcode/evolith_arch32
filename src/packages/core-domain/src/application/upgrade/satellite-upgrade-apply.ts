import * as path from 'path';
import { IFileSystem, ILogger } from '../../domain/interfaces';
import { UpgradeChange, UpgradeResult } from './satellite-upgrade.types';

/** What `applyChange` did: the delivered content is what the manifest records. */
export type AppliedChange =
  | { applied: true; content: string }
  | { applied: false };

/**
 * Apply one change. GT-673: the classification is enforced HERE, at the write,
 * not only in the service that loops — a `local-only` change is never written
 * and a `conflict` is written only when the caller says `overwriteLocal`. The
 * service decides what to attempt; this function refuses what must not happen.
 */
export async function applyChange(
  fs: IFileSystem,
  logger: ILogger,
  change: UpgradeChange,
  options: { overwriteLocal?: boolean } = {},
): Promise<AppliedChange> {
  if (change.classification === 'local-only') {
    return { applied: false };
  }
  if (change.classification === 'conflict' && !options.overwriteLocal) {
    return { applied: false };
  }

  switch (change.type) {
    case 'add':
    case 'modify':
      if (await fs.exists(change.sourcePath)) {
        const content = await fs.readFile(change.sourcePath);
        await fs.ensureDir(path.dirname(change.targetPath));
        await fs.writeFile(change.targetPath, content);
        return { applied: true, content };
      }
      return { applied: false };

    case 'migrate':
      logger.warn('Migration changes require manual review', JSON.stringify({ change: change.description }));
      return { applied: false };

    case 'remove':
      logger.warn('Remove changes require manual review', JSON.stringify({ change: change.description }));
      return { applied: false };
  }
}

export async function updateSatelliteVersion(fs: IFileSystem, logger: ILogger, satellitePath: string, version: string): Promise<void> {
  const evolithYamlPath = path.join(satellitePath, 'evolith.yaml');
  if (!await fs.exists(evolithYamlPath)) return;
  try {
    const content = await fs.readFile(evolithYamlPath);
    const config = JSON.parse(content) as Record<string, unknown>;
    if (config.coreRef && typeof config.coreRef === 'object') {
      (config.coreRef as Record<string, unknown>).version = version;
    }
    await fs.writeJson(evolithYamlPath, config);
  } catch {
    logger.warn('Failed to update satellite version');
  }
}

/** The operator-facing hint for a satellite with no baseline (GT-673). */
export const NO_FINGERPRINT_HINT =
  'No scaffold manifest (.evolith/scaffold-manifest.json): the upgrade cannot tell your edits from upstream changes, '
  + 'so nothing that differs was overwritten. Run `evolith upgrade --accept-local` to record the current Core content '
  + 'as the baseline without copying anything, then upgrade again; or `--overwrite-local` to take the Core version of every conflict.';

export function buildUpgradeReport(result: UpgradeResult): string {
  const lines: string[] = [];
  lines.push('Satellite Upgrade Report');
  lines.push('='.repeat(40));
  lines.push(`Current Version: ${result.plan.currentVersion}`);
  lines.push(`Target Version: ${result.plan.targetVersion}`);
  lines.push(`Risk Level: ${result.plan.estimatedRisk}`);
  lines.push('');
  lines.push(`Changes Applied: ${result.changesApplied}`);
  lines.push(`Changes Skipped: ${result.changesSkipped}`);
  if (result.backupPath) lines.push(`Backup: ${result.backupPath}`);

  // GT-673: the three classes, each listed by file.
  lines.push('');
  lines.push(`Upstream-only (applied): ${result.plan.upstreamOnly.length}`);
  for (const c of result.plan.upstreamOnly) lines.push(`  ~ ${c.relativePath}`);
  lines.push(`Local-only (kept, never applied): ${result.plan.localOnly.length}`);
  for (const c of result.plan.localOnly) lines.push(`  = ${c.relativePath}`);
  lines.push(`Conflicts (${result.overwrittenFiles.length > 0 ? 'overwritten with --overwrite-local' : 'NOT applied; --overwrite-local to take upstream'}): ${result.plan.conflicts.length}`);
  for (const c of result.plan.conflicts) lines.push(`  ! ${c.relativePath}${c.reason === 'no-fingerprint' ? ' (no fingerprint)' : ''}`);

  if (result.overwrittenFiles.length > 0) {
    lines.push('');
    lines.push('Overwritten local content:');
    for (const f of result.overwrittenFiles) lines.push(`  ✗ ${f}`);
  }
  if (result.baselinedFiles.length > 0) {
    lines.push('');
    lines.push('Baselined (--accept-local, nothing copied):');
    for (const f of result.baselinedFiles) lines.push(`  = ${f}`);
  }
  if (!result.plan.manifestPresent && result.plan.conflicts.some(c => c.reason === 'no-fingerprint')) {
    lines.push('');
    lines.push(NO_FINGERPRINT_HINT);
  }

  if (result.warnings.length > 0) {
    lines.push('');
    lines.push('Warnings:');
    for (const w of result.warnings) lines.push(`  ⚠ ${w}`);
  }
  if (result.errors.length > 0) {
    lines.push('');
    lines.push('Errors:');
    for (const e of result.errors) lines.push(`  ✗ ${e}`);
  }

  lines.push('');
  lines.push(result.success ? '✓ Upgrade completed successfully' : '✗ Upgrade completed with errors');
  return lines.join('\n');
}
