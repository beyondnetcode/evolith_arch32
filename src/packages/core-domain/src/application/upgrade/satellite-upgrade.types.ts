export interface UpgradePlan {
  currentVersion: string;
  targetVersion: string;
  changes: UpgradeChange[];
  breakingChanges: UpgradeChange[];
  backupRequired: boolean;
  estimatedRisk: 'low' | 'medium' | 'high';
}

export interface UpgradeChange {
  type: 'add' | 'modify' | 'remove' | 'migrate';
  sourcePath: string;
  targetPath: string;
  description: string;
  breaking: boolean;
}

export interface UpgradeResult {
  success: boolean;
  plan: UpgradePlan;
  changesApplied: number;
  changesSkipped: number;
  backupPath: string | null;
  errors: string[];
  warnings: string[];
}

export interface UpgradeOptions {
  satellitePath: string;
  corePath: string;
  dryRun?: boolean;
  force?: boolean;
  skipBackup?: boolean;
}
