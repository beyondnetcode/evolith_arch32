import * as path from 'path';
import { IFileSystem, ILogger } from '../../domain/interfaces';
import { UpgradeChange, UpgradeResult } from './satellite-upgrade.types';

export async function applyChange(fs: IFileSystem, logger: ILogger, change: UpgradeChange): Promise<void> {
  switch (change.type) {
    case 'add':
    case 'modify':
      if (await fs.exists(change.sourcePath)) {
        const content = await fs.readFile(change.sourcePath);
        await fs.ensureDir(path.dirname(change.targetPath));
        await fs.writeFile(change.targetPath, content);
      }
      return;

    case 'migrate':
      logger.warn('Migration changes require manual review', JSON.stringify({ change: change.description }));
      return;

    case 'remove':
      logger.warn('Remove changes require manual review', JSON.stringify({ change: change.description }));
      return;
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
