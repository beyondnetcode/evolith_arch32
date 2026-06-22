/* eslint-disable boundaries/element-types */
import { IFileSystem, ILogger } from '../../domain/interfaces';
import { UpgradeOptions, UpgradePlan, UpgradeResult } from './satellite-upgrade.types';
import { createBackup } from './satellite-upgrade-fs';
import { diffSatelliteVsCore, getCoreVersion, getSatelliteVersion } from './satellite-upgrade-diff';
import { applyChange, buildUpgradeReport, updateSatelliteVersion } from './satellite-upgrade-apply';

export { UpgradePlan, UpgradeChange, UpgradeResult, UpgradeOptions } from './satellite-upgrade.types';

export class SatelliteUpgradeService {
  private readonly fs: IFileSystem;
  private readonly logger: ILogger;

  constructor(options?: { fileSystem?: unknown; logger?: unknown }) {
    this.fs = options?.fileSystem as any;
    this.logger = options?.logger as any;
  }

  async planUpgrade(options: UpgradeOptions): Promise<UpgradePlan> {
    const currentVersion = await getSatelliteVersion(this.fs, options.satellitePath);
    const targetVersion = await getCoreVersion(this.fs, options.corePath);

    this.logger.info('Planning satellite upgrade', JSON.stringify({ currentVersion, targetVersion }));

    const changes = await diffSatelliteVsCore(this.fs, options.satellitePath, options.corePath);
    const breakingChanges = changes.filter(c => c.breaking);

    const estimatedRisk = breakingChanges.length > 3
      ? 'high'
      : breakingChanges.length > 0
        ? 'medium'
        : 'low';

    return {
      currentVersion,
      targetVersion,
      changes,
      breakingChanges,
      backupRequired: changes.length > 0,
      estimatedRisk,
    };
  }

  async executeUpgrade(options: UpgradeOptions): Promise<UpgradeResult> {
    const plan = await this.planUpgrade(options);

    if (plan.changes.length === 0) {
      this.logger.info('No upgrades needed - satellite is up to date');
      return this.result(plan, true, 0, 0, null, [], ['Satellite is already up to date']);
    }

    if (plan.breakingChanges.length > 0 && !options.force) {
      return this.result(
        plan, false, 0, plan.changes.length, null,
        [`Breaking changes detected (${plan.breakingChanges.length}). Use --force to proceed.`],
        plan.breakingChanges.map(c => `Breaking: ${c.description}`),
      );
    }

    if (options.dryRun) {
      this.logger.info('Dry run - no changes applied');
      return this.result(plan, true, 0, plan.changes.length, null, [], ['Dry run mode - no changes were applied']);
    }

    let backupPath: string | null = null;
    if (plan.backupRequired && !options.skipBackup) {
      backupPath = await createBackup(this.fs, this.logger, options.satellitePath);
    }

    const errors: string[] = [];
    const warnings: string[] = [];
    let changesApplied = 0;
    let changesSkipped = 0;

    for (const change of plan.changes) {
      try {
        await applyChange(this.fs, this.logger, change);
        changesApplied++;
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        errors.push(`Failed to apply change: ${change.description} - ${message}`);
        changesSkipped++;
      }
    }

    if (errors.length > 0 && backupPath) {
      warnings.push(`Backup available at: ${backupPath}`);
    }

    await updateSatelliteVersion(this.fs, this.logger, options.satellitePath, plan.targetVersion);

    return this.result(plan, errors.length === 0, changesApplied, changesSkipped, backupPath, errors, warnings);
  }

  async getUpgradeReport(result: UpgradeResult): Promise<string> {
    return buildUpgradeReport(result);
  }

  private result(
    plan: UpgradePlan,
    success: boolean,
    changesApplied: number,
    changesSkipped: number,
    backupPath: string | null,
    errors: string[],
    warnings: string[],
  ): UpgradeResult {
    return { success, plan, changesApplied, changesSkipped, backupPath, errors, warnings };
  }
}
