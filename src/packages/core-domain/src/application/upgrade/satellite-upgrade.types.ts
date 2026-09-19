import type { ConflictReason, UpgradeClassification } from './satellite-upgrade-classify';

export type { ConflictReason, UpgradeClassification } from './satellite-upgrade-classify';

export interface UpgradePlan {
  currentVersion: string;
  targetVersion: string;
  /** Every difference found, whatever its classification. */
  changes: UpgradeChange[];
  /**
   * Breaking changes among the ones an upgrade COULD apply (upstream-only and
   * conflicts). A local-only change is never applied, so it never blocks.
   */
  breakingChanges: UpgradeChange[];
  backupRequired: boolean;
  estimatedRisk: 'low' | 'medium' | 'high';
  // GT-673: the three classes, reported separately so a plan (and `--dry-run`)
  // is a divergence report, not just a list of files that differ.
  /** Applied by a plain `upgrade`. */
  upstreamOnly: UpgradeChange[];
  /** The tenant's own edits. Reported, never applied. */
  localOnly: UpgradeChange[];
  /** Both sides moved (or no fingerprint to tell). Applied only with `--overwrite-local`. */
  conflicts: UpgradeChange[];
  /** Whether `.evolith/scaffold-manifest.json` exists. False means every difference is fail-closed. */
  manifestPresent: boolean;
}

export interface UpgradeChange {
  type: 'add' | 'modify' | 'remove' | 'migrate';
  sourcePath: string;
  targetPath: string;
  /** Satellite-relative POSIX path — the key used in the scaffold manifest. */
  relativePath: string;
  description: string;
  breaking: boolean;
  // GT-673: who moved the file. `reason` is only present on conflicts.
  classification: UpgradeClassification;
  reason?: ConflictReason;
}

export interface UpgradeResult {
  success: boolean;
  plan: UpgradePlan;
  changesApplied: number;
  changesSkipped: number;
  backupPath: string | null;
  errors: string[];
  warnings: string[];
  // GT-673: named so the operator can see exactly which local content was lost
  // (only ever non-empty under `--overwrite-local`) ...
  overwrittenFiles: string[];
  // ... and which files `--accept-local` recorded as the baseline (nothing copied).
  baselinedFiles: string[];
}

export interface UpgradeOptions {
  satellitePath: string;
  corePath: string;
  dryRun?: boolean;
  /** Proceed past breaking changes. Does NOT apply conflicts. */
  force?: boolean;
  skipBackup?: boolean;
  /** GT-673: apply conflicts too, overwriting the tenant's content (backup still taken). */
  overwriteLocal?: boolean;
  /**
   * GT-673: record the Core's current content as the baseline for every file
   * present on both sides and copy nothing. The migration path for a satellite
   * without a manifest, and the way to say "keep mine" after a conflict.
   */
  acceptLocal?: boolean;
}
