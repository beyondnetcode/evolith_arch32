import { IFileSystem, ILogger } from '../../domain/interfaces';
import { UpgradeChange, UpgradeOptions, UpgradePlan, UpgradeResult } from './satellite-upgrade.types';
import { createBackup } from './satellite-upgrade-fs';
import { diffSatelliteVsCore, getCoreVersion, getSatelliteVersion, listTrackedFiles } from './satellite-upgrade-diff';
import { applyChange, buildUpgradeReport, NO_FINGERPRINT_HINT, updateSatelliteVersion } from './satellite-upgrade-apply';
import { readScaffoldManifest, recordScaffoldedFiles, ScaffoldedFile } from './scaffold-manifest';

export { UpgradePlan, UpgradeChange, UpgradeResult, UpgradeOptions, UpgradeClassification, ConflictReason } from './satellite-upgrade.types';
export { NO_FINGERPRINT_HINT } from './satellite-upgrade-apply';
export {
  SCAFFOLD_MANIFEST_RELATIVE_PATH,
  ScaffoldManifest,
  ScaffoldManifestEntry,
  ScaffoldManifestError,
} from './scaffold-manifest';

export class SatelliteUpgradeService {
  private readonly fs: IFileSystem;
  private readonly logger: ILogger;

  constructor(options?: { fileSystem?: unknown; logger?: unknown }) {
    this.fs = options?.fileSystem as any;
    this.logger = options?.logger as any;
  }

  /**
   * The divergence report. Read-only: `--dry-run` and the MCP `upgrade-plan`
   * tool end here. GT-673: every change carries its classification and the plan
   * carries the three classes separately.
   */
  async planUpgrade(options: UpgradeOptions): Promise<UpgradePlan> {
    const currentVersion = await getSatelliteVersion(this.fs, options.satellitePath);
    const targetVersion = await getCoreVersion(this.fs, options.corePath);

    this.logger.info('Planning satellite upgrade', JSON.stringify({ currentVersion, targetVersion }));

    // A malformed manifest throws here on purpose: a baseline that cannot be
    // read must not quietly become "no baseline".
    const manifest = await readScaffoldManifest(this.fs, options.satellitePath);
    const changes = await diffSatelliteVsCore(this.fs, options.satellitePath, options.corePath, manifest);

    const upstreamOnly = changes.filter(c => c.classification === 'upstream-only');
    const localOnly = changes.filter(c => c.classification === 'local-only');
    const conflicts = changes.filter(c => c.classification === 'conflict');

    // A local-only change is never applied, so it cannot be a breaking one.
    const breakingChanges = [...upstreamOnly, ...conflicts].filter(c => c.breaking);

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
      backupRequired: upstreamOnly.length + conflicts.length > 0,
      estimatedRisk,
      upstreamOnly,
      localOnly,
      conflicts,
      manifestPresent: manifest !== null,
    };
  }

  async executeUpgrade(options: UpgradeOptions): Promise<UpgradeResult> {
    const plan = await this.planUpgrade(options);

    if (options.acceptLocal) {
      return this.acceptLocal(options, plan);
    }

    if (plan.changes.length === 0) {
      this.logger.info('No upgrades needed - satellite is up to date');
      return this.result(plan, true, 0, 0, null, [], ['Satellite is already up to date']);
    }

    // GT-673: what a run may write. Conflicts join only under --overwrite-local;
    // local-only never does.
    const toApply: UpgradeChange[] = options.overwriteLocal
      ? [...plan.upstreamOnly, ...plan.conflicts]
      : plan.upstreamOnly;
    const heldBack = plan.changes.length - toApply.length;
    const warnings = this.classificationWarnings(plan, Boolean(options.overwriteLocal));

    // `--force` is about breaking changes among what WOULD be written. A
    // breaking conflict that --overwrite-local does not include is not applied,
    // so it does not block either.
    const breakingToApply = toApply.filter(c => c.breaking);
    if (breakingToApply.length > 0 && !options.force) {
      return this.result(
        plan, false, 0, plan.changes.length, null,
        [`Breaking changes detected (${breakingToApply.length}). Use --force to proceed.`],
        [...breakingToApply.map(c => `Breaking: ${c.description}`), ...warnings],
      );
    }

    if (options.dryRun) {
      this.logger.info('Dry run - no changes applied');
      return this.result(plan, true, 0, plan.changes.length, null, [], ['Dry run mode - no changes were applied', ...warnings]);
    }

    let backupPath: string | null = null;
    if (toApply.length > 0 && !options.skipBackup) {
      backupPath = await createBackup(this.fs, this.logger, options.satellitePath);
    }

    const errors: string[] = [];
    const overwrittenFiles: string[] = [];
    const delivered: ScaffoldedFile[] = [];
    let changesApplied = 0;
    let changesSkipped = heldBack;

    for (const change of toApply) {
      try {
        const outcome = await applyChange(this.fs, this.logger, change, { overwriteLocal: options.overwriteLocal });
        if (!outcome.applied) {
          changesSkipped++;
          continue;
        }
        changesApplied++;
        delivered.push({ relativePath: change.relativePath, content: outcome.content });
        if (change.classification === 'conflict') overwrittenFiles.push(change.relativePath);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        errors.push(`Failed to apply change: ${change.description} - ${message}`);
        changesSkipped++;
      }
    }

    // GT-673: what was just delivered becomes the baseline for the next
    // upgrade; otherwise the next run would see its own write as a tenant edit.
    if (delivered.length > 0) {
      await recordScaffoldedFiles(this.fs, options.satellitePath, plan.targetVersion, delivered);
    }

    if (errors.length > 0 && backupPath) {
      warnings.push(`Backup available at: ${backupPath}`);
    }

    await updateSatelliteVersion(this.fs, this.logger, options.satellitePath, plan.targetVersion);

    return {
      ...this.result(plan, errors.length === 0, changesApplied, changesSkipped, backupPath, errors, warnings),
      overwrittenFiles,
    };
  }

  async getUpgradeReport(result: UpgradeResult): Promise<string> {
    return buildUpgradeReport(result);
  }

  /**
   * `--accept-local` (GT-673): record the Core's CURRENT content as the baseline
   * for every tracked ruleset present on both sides, and copy nothing.
   *
   * The baseline is the Core side of the three-way merge, not the satellite's
   * content: recording the tenant's content as "what the Core delivered" would
   * make the very next upstream change look upstream-only and overwrite the
   * edit — the defect this gap closes. Recording the Core side instead turns the
   * tenant's divergence into `local-only` now and into `conflict` the moment
   * upstream moves, which is the honest state of affairs.
   */
  private async acceptLocal(options: UpgradeOptions, plan: UpgradePlan): Promise<UpgradeResult> {
    const files: ScaffoldedFile[] = [];
    for (const tracked of await listTrackedFiles(this.fs, options.satellitePath, options.corePath)) {
      if (tracked.corpus !== 'rulesets') continue;
      if (!await this.fs.exists(tracked.targetPath)) continue;
      files.push({ relativePath: tracked.relativePath, content: await this.fs.readFile(tracked.sourcePath) });
    }
    const baselinedFiles = files.map(f => f.relativePath);

    if (options.dryRun) {
      this.logger.info('Dry run - baseline not recorded');
      return {
        ...this.result(plan, true, 0, plan.changes.length, null, [], ['Dry run mode - baseline was not recorded']),
        baselinedFiles,
      };
    }

    await recordScaffoldedFiles(this.fs, options.satellitePath, plan.targetVersion, files);
    this.logger.info('Baseline recorded', JSON.stringify({ files: baselinedFiles.length, coreVersion: plan.targetVersion }));

    return {
      ...this.result(plan, true, 0, plan.changes.length, null, [], [
        `Baseline recorded for ${baselinedFiles.length} file(s) against Core ${plan.targetVersion}; nothing was copied`,
      ]),
      baselinedFiles,
    };
  }

  private classificationWarnings(plan: UpgradePlan, overwriteLocal: boolean): string[] {
    const warnings: string[] = [];
    if (plan.localOnly.length > 0) {
      warnings.push(`${plan.localOnly.length} local-only change(s) kept: ${plan.localOnly.map(c => c.relativePath).join(', ')}`);
    }
    if (plan.conflicts.length > 0) {
      warnings.push(overwriteLocal
        ? `${plan.conflicts.length} conflict(s) will be OVERWRITTEN with the Core version (--overwrite-local): ${plan.conflicts.map(c => c.relativePath).join(', ')}`
        : `${plan.conflicts.length} conflict(s) not applied; use --overwrite-local to take the Core version: ${plan.conflicts.map(c => c.relativePath).join(', ')}`);
    }
    if (!plan.manifestPresent && plan.conflicts.some(c => c.reason === 'no-fingerprint')) {
      warnings.push(NO_FINGERPRINT_HINT);
    }
    return warnings;
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
    return { success, plan, changesApplied, changesSkipped, backupPath, errors, warnings, overwrittenFiles: [], baselinedFiles: [] };
  }
}
