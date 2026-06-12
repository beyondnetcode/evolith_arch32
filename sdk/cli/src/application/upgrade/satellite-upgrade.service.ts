/* eslint-disable boundaries/element-types */
import * as path from 'path';
import { IFileSystem, ILogger } from '../../domain/interfaces';
import { NodeFileSystemProvider } from '../../infrastructure/providers/node-filesystem.provider';
import { NestLoggerProvider } from '../../infrastructure/providers/logger.provider';

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

export class SatelliteUpgradeService {
  private readonly fs: IFileSystem;
  private readonly logger: ILogger;

  constructor(options?: { fileSystem?: any; logger?: any }) {
    this.fs = options?.fileSystem ?? new NodeFileSystemProvider().createFileSystem();
    this.logger = options?.logger ?? new NestLoggerProvider().createLogger('SatelliteUpgradeService');
  }

  async planUpgrade(options: UpgradeOptions): Promise<UpgradePlan> {
    const currentVersion = await this.getSatelliteVersion(options.satellitePath);
    const targetVersion = await this.getCoreVersion(options.corePath);

    this.logger.info('Planning satellite upgrade', JSON.stringify({ currentVersion, targetVersion }));

    const changes = await this.diffSatelliteVsCore(options.satellitePath, options.corePath);
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
      return {
        success: true,
        plan,
        changesApplied: 0,
        changesSkipped: 0,
        backupPath: null,
        errors: [],
        warnings: ['Satellite is already up to date'],
      };
    }

    if (plan.breakingChanges.length > 0 && !options.force) {
      return {
        success: false,
        plan,
        changesApplied: 0,
        changesSkipped: plan.changes.length,
        backupPath: null,
        errors: [`Breaking changes detected (${plan.breakingChanges.length}). Use --force to proceed.`],
        warnings: plan.breakingChanges.map(c => `Breaking: ${c.description}`),
      };
    }

    if (options.dryRun) {
      this.logger.info('Dry run - no changes applied');
      return {
        success: true,
        plan,
        changesApplied: 0,
        changesSkipped: plan.changes.length,
        backupPath: null,
        errors: [],
        warnings: ['Dry run mode - no changes were applied'],
      };
    }

    let backupPath: string | null = null;
    if (plan.backupRequired && !options.skipBackup) {
      backupPath = await this.createBackup(options.satellitePath);
    }

    const errors: string[] = [];
    const warnings: string[] = [];
    let changesApplied = 0;
    let changesSkipped = 0;

    for (const change of plan.changes) {
      try {
        await this.applyChange(change, options.satellitePath, options.corePath);
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

    await this.updateSatelliteVersion(options.satellitePath, plan.targetVersion);

    return {
      success: errors.length === 0,
      plan,
      changesApplied,
      changesSkipped,
      backupPath,
      errors,
      warnings,
    };
  }

  async getUpgradeReport(result: UpgradeResult): Promise<string> {
    const lines: string[] = [];

    lines.push('Satellite Upgrade Report');
    lines.push('='.repeat(40));
    lines.push(`Current Version: ${result.plan.currentVersion}`);
    lines.push(`Target Version: ${result.plan.targetVersion}`);
    lines.push(`Risk Level: ${result.plan.estimatedRisk}`);
    lines.push('');
    lines.push(`Changes Applied: ${result.changesApplied}`);
    lines.push(`Changes Skipped: ${result.changesSkipped}`);

    if (result.backupPath) {
      lines.push(`Backup: ${result.backupPath}`);
    }

    if (result.warnings.length > 0) {
      lines.push('');
      lines.push('Warnings:');
      for (const w of result.warnings) {
        lines.push(`  ⚠ ${w}`);
      }
    }

    if (result.errors.length > 0) {
      lines.push('');
      lines.push('Errors:');
      for (const e of result.errors) {
        lines.push(`  ✗ ${e}`);
      }
    }

    lines.push('');
    lines.push(result.success ? '✓ Upgrade completed successfully' : '✗ Upgrade completed with errors');

    return lines.join('\n');
  }

  private async getSatelliteVersion(satellitePath: string): Promise<string> {
    const evolithYamlPath = path.join(satellitePath, 'evolith.yaml');

    if (await this.fs.exists(evolithYamlPath)) {
      try {
        const content = await this.fs.readFile(evolithYamlPath);
        const config = JSON.parse(content) as { coreRef?: { version?: string } };
        return config.coreRef?.version || 'unknown';
      } catch {
        return 'unknown';
      }
    }

    return 'unknown';
  }

  private async getCoreVersion(corePath: string): Promise<string> {
    const versionPath = path.join(corePath, 'package.json');

    if (await this.fs.exists(versionPath)) {
      try {
        const pkg = await this.fs.readJson(versionPath) as { version?: string };
        return pkg.version || 'unknown';
      } catch {
        return 'unknown';
      }
    }

    return 'unknown';
  }

  private async diffSatelliteVsCore(satellitePath: string, corePath: string): Promise<UpgradeChange[]> {
    const changes: UpgradeChange[] = [];

    const coreRulesetsPath = path.join(corePath, 'rulesets');
    const satelliteRulesetsPath = path.join(satellitePath, 'rulesets');

    if (await this.fs.exists(coreRulesetsPath)) {
      const coreFiles = await this.findJsonFiles(coreRulesetsPath);

      for (const coreFile of coreFiles) {
        const relativePath = path.relative(coreRulesetsPath, coreFile);
        const satelliteFile = path.join(satelliteRulesetsPath, relativePath);

        if (!await this.fs.exists(satelliteFile)) {
          changes.push({
            type: 'add',
            sourcePath: coreFile,
            targetPath: satelliteFile,
            description: `Add new ruleset: ${relativePath}`,
            breaking: this.isBreakingChange(relativePath),
          });
        } else {
          const coreContent = await this.fs.readFile(coreFile);
          const satelliteContent = await this.fs.readFile(satelliteFile);

          if (coreContent !== satelliteContent) {
            changes.push({
              type: 'modify',
              sourcePath: coreFile,
              targetPath: satelliteFile,
              description: `Update ruleset: ${relativePath}`,
              breaking: this.isBreakingChange(relativePath),
            });
          }
        }
      }
    }

    const coreHarnessPath = path.join(corePath, '.harness');
    const satelliteHarnessPath = path.join(satellitePath, '.harness');

    if (await this.fs.exists(coreHarnessPath)) {
      const coreHarnessFiles = await this.findJsonFiles(coreHarnessPath);

      for (const coreFile of coreHarnessFiles) {
        const relativePath = path.relative(coreHarnessPath, coreFile);
        const satelliteFile = path.join(satelliteHarnessPath, relativePath);

        if (!await this.fs.exists(satelliteFile)) {
          changes.push({
            type: 'add',
            sourcePath: coreFile,
            targetPath: satelliteFile,
            description: `Add harness file: ${relativePath}`,
            breaking: false,
          });
        }
      }
    }

    return changes;
  }

  private isBreakingChange(relativePath: string): boolean {
    const breakingPatterns = [
      'inheritance',
      'anti-corruption',
      'open-core-boundary',
      'governance',
    ];

    return breakingPatterns.some(pattern => relativePath.toLowerCase().includes(pattern));
  }

  private async findJsonFiles(dirPath: string): Promise<string[]> {
    const files: string[] = [];

    if (!await this.fs.exists(dirPath)) {
      return files;
    }

    const entries = await this.fs.readdirNames(dirPath);

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry);

      try {
        const stat = await this.fs.stat(fullPath);
        if (stat.isDirectory && stat.isDirectory()) {
          const subFiles = await this.findJsonFiles(fullPath);
          files.push(...subFiles);
        } else if (entry.endsWith('.json')) {
          files.push(fullPath);
        }
      } catch {
        // Skip entries that can't be stat'd
      }
    }

    return files;
  }

  private async createBackup(satellitePath: string): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(satellitePath, `.evolith-backup-${timestamp}`);

    await this.fs.ensureDir(backupPath);

    const dirsToBackup = ['rulesets', '.harness', 'reference'];

    for (const dir of dirsToBackup) {
      const sourceDir = path.join(satellitePath, dir);
      const backupDir = path.join(backupPath, dir);

      if (await this.fs.exists(sourceDir)) {
        await this.fs.ensureDir(backupDir);
        await this.copyDirectory(sourceDir, backupDir);
      }
    }

    this.logger.info('Backup created', JSON.stringify({ backupPath }));
    return backupPath;
  }

  private async copyDirectory(source: string, target: string): Promise<void> {
    const entries = await this.fs.readdirNames(source);

    for (const entry of entries) {
      const sourcePath = path.join(source, entry);
      const targetPath = path.join(target, entry);

      try {
        const stat = await this.fs.stat(sourcePath);
        if (stat.isDirectory && stat.isDirectory()) {
          await this.fs.ensureDir(targetPath);
          await this.copyDirectory(sourcePath, targetPath);
        } else {
          const content = await this.fs.readFile(sourcePath);
          await this.fs.writeFile(targetPath, content);
        }
      } catch {
        // Skip entries that can't be copied
      }
    }
  }

  private async applyChange(change: UpgradeChange, satellitePath: string, corePath: string): Promise<void> {
    switch (change.type) {
      case 'add':
        if (await this.fs.exists(change.sourcePath)) {
          const content = await this.fs.readFile(change.sourcePath);
          const targetDir = path.dirname(change.targetPath);
          await this.fs.ensureDir(targetDir);
          await this.fs.writeFile(change.targetPath, content);
        }
        break;

      case 'modify':
        if (await this.fs.exists(change.sourcePath)) {
          const content = await this.fs.readFile(change.sourcePath);
          const targetDir = path.dirname(change.targetPath);
          await this.fs.ensureDir(targetDir);
          await this.fs.writeFile(change.targetPath, content);
        }
        break;

      case 'migrate':
        this.logger.warn('Migration changes require manual review', JSON.stringify({ change: change.description }));
        break;

      case 'remove':
        this.logger.warn('Remove changes require manual review', JSON.stringify({ change: change.description }));
        break;
    }
  }

  private async updateSatelliteVersion(satellitePath: string, version: string): Promise<void> {
    const evolithYamlPath = path.join(satellitePath, 'evolith.yaml');

    if (await this.fs.exists(evolithYamlPath)) {
      try {
        const content = await this.fs.readFile(evolithYamlPath);
        const config = JSON.parse(content) as Record<string, unknown>;

        if (config.coreRef && typeof config.coreRef === 'object') {
          (config.coreRef as Record<string, unknown>).version = version;
        }

        await this.fs.writeJson(evolithYamlPath, config);
      } catch {
        this.logger.warn('Failed to update satellite version');
      }
    }
  }
}
