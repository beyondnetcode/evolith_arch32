import { execSync } from 'child_process';
import { Command, Option } from 'nest-commander';
import chalk from 'chalk';
import { BaseEvolithCommand } from '../../infrastructure/cli/base-command';
import packageJson from '../../../package.json';

interface UpdateCommandOptions {
  check?: boolean;
  install?: boolean;
  current?: boolean;
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
    if (options?.current) {
      await this.showCurrentVersion();
      return;
    }

    if (options?.check) {
      await this.checkForUpdates();
      return;
    }

    if (options?.install) {
      await this.installUpdate();
      return;
    }

    await this.showUpdateHelp();
  }

  private async showCurrentVersion(): Promise<void> {
    this.promptService.showIntro('Evolith CLI Version');

    const currentVersion = this.getCurrentVersion();
    const latestVersion = await this.getLatestVersion();

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

  private async checkForUpdates(): Promise<void> {
    this.promptService.showIntro('Checking for CLI Updates');
    this.promptService.startSpinner('Checking npm registry...');

    const currentVersion = this.getCurrentVersion();
    const latestVersion = await this.getLatestVersion();

    this.promptService.stopSpinner();

    if (!latestVersion) {
      this.promptService.showError('Could not reach npm registry');
      this.promptService.showInfo('Check your internet connection and try again');
      return;
    }

    this.promptService.showInfo(`Current: ${chalk.cyan(currentVersion)}`);
    this.promptService.showInfo(`Latest:  ${chalk.cyan(latestVersion)}`);

    if (this.isNewerVersion(latestVersion, currentVersion)) {
      this.promptService.showWarning(`\n⚠ Update available: ${currentVersion} → ${latestVersion}`);
      this.promptService.showInfo(`\nTo install the update, run:`);
      this.promptService.showInfo(chalk.cyan(`  npm install -g @evolith/smart-cli@${latestVersion}`));
      this.promptService.showInfo(`\nOr use the built-in installer:`);
      this.promptService.showInfo(chalk.cyan(`  evolith update --install`));
    } else {
      this.promptService.showSuccess(`\n✓ You are running the latest version (${currentVersion})`);
    }
  }

  private async installUpdate(): Promise<void> {
    this.promptService.showIntro('Installing CLI Update');
    this.promptService.startSpinner('Installing latest version...');

    const latestVersion = await this.getLatestVersion();

    if (!latestVersion) {
      this.promptService.stopSpinner();
      this.promptService.showError('Could not fetch latest version');
      return;
    }

    const currentVersion = this.getCurrentVersion();

    if (!this.isNewerVersion(latestVersion, currentVersion)) {
      this.promptService.stopSpinner();
      this.promptService.showSuccess(`You are already on the latest version (${currentVersion})`);
      return;
    }

    try {
      this.promptService.stopSpinner();
      this.promptService.showInfo(`Installing @evolith/smart-cli@${latestVersion}...`);

      execSync(`npm install -g @evolith/smart-cli@${latestVersion}`, {
        stdio: 'inherit',
      });

      this.promptService.showSuccess(`\n✓ Update installed successfully`);
      this.promptService.showInfo(`Run ${chalk.cyan('evolith --version')} to verify`);

      const newVersion = this.getCurrentVersion();
      if (newVersion === latestVersion) {
        this.promptService.showSuccess(`Now running ${chalk.cyan(newVersion)}`);
      } else {
        this.promptService.showWarning(`Installed version differs. You may need to restart your terminal.`);
      }
    } catch (error) {
      this.promptService.stopSpinner();
      this.promptService.showError('Update failed');
      this.promptService.showInfo('You can also manually run:');
      this.promptService.showInfo(chalk.cyan(`  npm install -g @evolith/smart-cli@${latestVersion}`));
    }
  }

  private async showUpdateHelp(): Promise<void> {
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
      const result = execSync('npm view @evolith/smart-cli version --json', {
        encoding: 'utf8',
        timeout: 10000,
      });
      return JSON.parse(result.trim());
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
}