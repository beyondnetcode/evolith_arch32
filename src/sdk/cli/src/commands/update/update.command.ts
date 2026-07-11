import { execFileSync } from 'child_process';
import { Command, Option } from 'nest-commander';
import chalk from 'chalk';
import { randomUUID } from 'node:crypto';
import { BaseEvolithCommand } from '../../infrastructure/cli/base-command';
import { createSuccessEnvelope, createErrorEnvelope, OUTPUT_ENVELOPE_SCHEMA_VERSION } from '@beyondnet/evolith-core-domain/domain/gate-evidence';
import packageJson from '../../../package.json';

const SEMVER_REGEX = /^\d+\.\d+\.\d+(-[\w.]+)?(\+[\w.]+)?$/;

interface UpdateCommandOptions {
  check?: boolean;
  install?: boolean;
  current?: boolean;
  format?: string;
}

@Command({
  name: 'update',
  description: 'Check for CLI updates and apply them',
})
export class UpdateCommand extends BaseEvolithCommand {
  constructor() {
    super('UpdateCommand');
  }

  async executeCommand(passedParam: string[], options?: UpdateCommandOptions): Promise<void> {
    const json = options?.format === 'json';
    const startedAt = Date.now();
    const meta = {
      command: 'evolith update',
      executedAt: new Date().toISOString(),
      durationMs: 0,
      correlationId: randomUUID(),
      schemaVersion: OUTPUT_ENVELOPE_SCHEMA_VERSION,
      startedAt,
    };

    try {
      if (options?.current) {
        await this.showCurrentVersion(json, meta);
        return;
      }

      if (options?.check) {
        await this.checkForUpdates(json, meta);
        return;
      }

      if (options?.install) {
        await this.installUpdate(json, meta);
        return;
      }

      await this.showUpdateHelp(json, meta);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      if (json) {
        process.exitCode = 1;
        console.log(JSON.stringify(createErrorEnvelope('INTERNAL_ERROR', message, { ...meta, durationMs: Date.now() - startedAt }), null, 2));
      } else {
        throw error;
      }
    }
  }

  private async showCurrentVersion(json = false, meta?: any): Promise<void> {
    const currentVersion = this.getCurrentVersion();
    const latestVersion = await this.getLatestVersion();

    if (json) {
      const result = {
        current: currentVersion,
        latest: latestVersion,
        updateAvailable: latestVersion ? this.isNewerVersion(latestVersion, currentVersion) : false,
      };
      console.log(JSON.stringify(createSuccessEnvelope(result, { ...meta, durationMs: Date.now() - meta.startedAt }), null, 2));
      return;
    }

    this.promptService.showIntro('Evolith CLI Version');

    this.promptService.showInfo(`Current Version: ${chalk.cyan(currentVersion)}`);

    if (latestVersion) {
      this.promptService.showInfo(`Latest Version:  ${chalk.cyan(latestVersion)}`);

      if (this.isNewerVersion(latestVersion, currentVersion)) {
        this.promptService.showWarning(`A new version is available!`);
        this.promptService.showInfo(`Run: evolith update --install to upgrade`);
      } else {
        this.promptService.showSuccess(`You are on the latest version.`);
      }
    } else {
      this.promptService.showInfo(chalk.dim('Could not fetch latest version from registry'));
    }
  }

  private async checkForUpdates(json = false, meta?: any): Promise<void> {
    if (!json) {
      this.promptService.showIntro('Checking for CLI Updates');
      this.promptService.startSpinner('Checking npm registry...');
    }

    const currentVersion = this.getCurrentVersion();
    const latestVersion = await this.getLatestVersion();

    if (!json) {
      this.promptService.stopSpinner();
    }

    if (!latestVersion) {
      const message = 'Could not reach npm registry';
      if (json) {
        process.exitCode = 1;
        console.log(JSON.stringify(createErrorEnvelope('IO_ERROR', message, { ...meta, durationMs: Date.now() - meta.startedAt }), null, 2));
      } else {
        this.promptService.showError(message);
        this.promptService.showInfo('Check your internet connection and try again');
      }
      return;
    }

    if (json) {
      const result = {
        current: currentVersion,
        latest: latestVersion,
        updateAvailable: this.isNewerVersion(latestVersion, currentVersion),
      };
      console.log(JSON.stringify(createSuccessEnvelope(result, { ...meta, durationMs: Date.now() - meta.startedAt }), null, 2));
    } else {
      this.promptService.showInfo(`Current: ${chalk.cyan(currentVersion)}`);
      this.promptService.showInfo(`Latest:  ${chalk.cyan(latestVersion)}`);

      if (this.isNewerVersion(latestVersion, currentVersion)) {
        this.promptService.showWarning(`\n⚠ Update available: ${currentVersion} → ${latestVersion}`);
        this.promptService.showInfo(`\nTo install the update, run:`);
        this.promptService.showInfo(chalk.cyan(`  npm install -g @beyondnet/evolith-cli@${latestVersion}`));
        this.promptService.showInfo(`\nOr use the built-in installer:`);
        this.promptService.showInfo(chalk.cyan(`  evolith update --install`));
      } else {
        this.promptService.showSuccess(`\n✓ You are running the latest version (${currentVersion})`);
      }
    }
  }

  private async installUpdate(json = false, meta?: any): Promise<void> {
    if (!json) {
      this.promptService.showIntro('Installing CLI Update');
      this.promptService.startSpinner('Installing latest version...');
    }

    const latestVersion = await this.getLatestVersion();

    if (!latestVersion) {
      const message = 'Could not fetch latest version';
      if (json) {
        process.exitCode = 1;
        console.log(JSON.stringify(createErrorEnvelope('IO_ERROR', message, { ...meta, durationMs: Date.now() - meta.startedAt }), null, 2));
      } else {
        this.promptService.stopSpinner();
        this.promptService.showError(message);
      }
      return;
    }

    const currentVersion = this.getCurrentVersion();

    if (!this.isNewerVersion(latestVersion, currentVersion)) {
      if (json) {
        const result = { current: currentVersion, latest: latestVersion, installed: false };
        console.log(JSON.stringify(createSuccessEnvelope(result, { ...meta, durationMs: Date.now() - meta.startedAt }), null, 2));
      } else {
        this.promptService.stopSpinner();
        this.promptService.showSuccess(`You are already on the latest version (${currentVersion})`);
      }
      return;
    }

    try {
      if (!json) {
        this.promptService.stopSpinner();
        this.promptService.showInfo(`Installing @beyondnet/evolith-cli@${latestVersion}...`);
      }

      execFileSync('npm', ['install', '-g', `@beyondnet/evolith-cli@${latestVersion}`], {
        stdio: json ? 'pipe' : 'inherit',
      });

      const newVersion = this.getCurrentVersion();
      if (json) {
        const result = {
          previous: currentVersion,
          current: newVersion,
          installed: true,
        };
        console.log(JSON.stringify(createSuccessEnvelope(result, { ...meta, durationMs: Date.now() - meta.startedAt }), null, 2));
      } else {
        this.promptService.showSuccess(`\n✓ Update installed successfully`);
        this.promptService.showInfo(`Run ${chalk.cyan('evolith --version')} to verify`);

        if (newVersion === latestVersion) {
          this.promptService.showSuccess(`Now running ${chalk.cyan(newVersion)}`);
        } else {
          this.promptService.showWarning(`Installed version differs. You may need to restart your terminal.`);
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (json) {
        process.exitCode = 1;
        console.log(JSON.stringify(createErrorEnvelope('IO_ERROR', message, { ...meta, durationMs: Date.now() - meta.startedAt }), null, 2));
      } else {
        this.promptService.stopSpinner();
        this.promptService.showError('Update failed');
        this.promptService.showInfo('You can also manually run:');
        this.promptService.showInfo(chalk.cyan(`  npm install -g @beyondnet/evolith-cli@${latestVersion}`));
      }
    }
  }

  private async showUpdateHelp(json = false, meta?: any): Promise<void> {
    if (json) {
      const result = { usage: 'Use --current, --check, or --install flags' };
      console.log(JSON.stringify(createSuccessEnvelope(result, { ...meta, durationMs: Date.now() - meta.startedAt }), null, 2));
      return;
    }

    this.promptService.showIntro('Evolith CLI Update');
    this.promptService.showInfo('Check for and apply CLI updates.\n');

    this.promptService.showInfo(chalk.bold('Usage:'));
    this.promptService.showInfo('  evolith update                    Show this help');
    this.promptService.showInfo('  evolith update --current          Show current version');
    this.promptService.showInfo('  evolith update --check            Check for updates');
    this.promptService.showInfo('  evolith update --install          Install latest version\n');

    this.promptService.showInfo(chalk.bold('Examples:'));
    this.promptService.showInfo('  evolith update --check            Check if update available');
    this.promptService.showInfo('  evolith update --install          Auto-install latest version');
    this.promptService.showInfo('  evolith update --current          Show version info');
  }

  private getCurrentVersion(): string {
    return packageJson.version || '1.0.0';
  }

  private async getLatestVersion(): Promise<string | null> {
    try {
      const result = execFileSync('npm', ['view', '@beyondnet/evolith-cli', 'version', '--json'], {
        encoding: 'utf8',
        timeout: 10000,
      });
      const version = JSON.parse(result.trim());
      if (typeof version !== 'string' || !SEMVER_REGEX.test(version)) {
        this.logger.warn(`Invalid version format from registry: ${version}`);
        return null;
      }
      return version;
    } catch {
      this.logger.warn('Failed to fetch latest version from npm registry');
      return null;
    }
  }

  private isNewerVersion(latest: string, current: string): boolean {
    const latestParts = latest.split('.').map(Number);
    const currentParts = current.split('.').map(Number);

    for (let i = 0; i < 3; i++) {
      const l = latestParts[i] || 0;
      const c = currentParts[i] || 0;
      if (l > c) return true;
      if (l < c) return false;
    }
    return false;
  }

  @Option({
    flags: '-c, --current',
    description: 'Show current CLI version',
  })
  parseCurrent(): boolean {
    return true;
  }

  @Option({
    flags: '--check',
    description: 'Check for available updates',
  })
  parseCheck(): boolean {
    return true;
  }

  @Option({
    flags: '-i, --install',
    description: 'Install the latest version',
  })
  parseInstall(): boolean {
    return true;
  }

  @Option({
    flags: '-f, --format [string]',
    description: 'Output format: json (ADR-0073 envelope) or human (default)',
  })
  parseFormat(val: string): string {
    return val;
  }
}