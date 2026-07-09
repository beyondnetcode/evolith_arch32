import { Command, Option } from 'nest-commander';
import chalk from 'chalk';
import { SatelliteUpgradeService, UpgradePlan } from '@beyondnet/evolith-core-domain/application/upgrade/satellite-upgrade.service';
import { BaseEvolithCommand } from '../../infrastructure/cli/base-command';
import { PromptService } from '../../infrastructure/prompts/prompt.service';
import { ConfigService } from '../../infrastructure/config/config.service';
import { NodeFileSystemProvider } from '../../infrastructure/providers/node-filesystem.provider';
import { resolveSatellitePath } from '../../infrastructure/paths/satellite-resolver';
import { logger } from '../../infrastructure/observability';

interface UpgradeCommandOptions {
  dryRun?: boolean;
  force?: boolean;
  core?: string;
  report?: boolean;
  satellite?: string;
}

@Command({
  name: 'upgrade',
  description: 'Actualiza el repositorio satélite cuando el upstream Evolith recibe nuevas reglas',
})
export class UpgradeCommand extends BaseEvolithCommand {
  constructor(
    promptService: PromptService,
    configService?: ConfigService,
  ) {
    super('UpgradeCommand', promptService, configService);
  }

  async executeCommand(passedParam: string[], options?: UpgradeCommandOptions): Promise<void> {
    // ADR-0109: unified satellite resolution replaces the process.cwd() hardcode
    // so `cd mms && evolith upgrade` and `evolith upgrade --satellite mms` both
    // target the project root. Order: explicit --satellite → nearest-ancestor
    // evolith.yaml from cwd → profile.satellite → cwd.
    const satellitePath = resolveSatellitePath({
      explicit: options?.satellite,
      profileSatellite: this.profile.satellite,
    });
    const corePath = options?.core || this.profile.core || this.findCorePath(satellitePath);

    // GT-459: SatelliteUpgradeService needs a filesystem + logger; constructing it
    // bare left `this.fs`/`this.logger` undefined and crashed with a raw
    // "Cannot read properties of undefined (reading 'exists')" stack trace.
    const service = new SatelliteUpgradeService({
      fileSystem: new NodeFileSystemProvider().createFileSystem(),
      logger,
    });

    this.promptService.showIntro('Evolith SDK - Satélite Upgrade');
    this.promptService.startSpinner('Planning upgrade...');

    try {
      const plan = await service.planUpgrade({ satellitePath, corePath });
      this.promptService.stopSpinner();

      if (plan.changes.length === 0) {
        this.promptService.showSuccess('Satellite is already up to date');
        this.promptService.showOutro('No upgrade needed.');
        return;
      }

      this.printUpgradePlan(plan);

      if (options?.dryRun) {
        const _result = await service.executeUpgrade({
          satellitePath,
          corePath,
          dryRun: true,
        });

        this.promptService.showInfo('Dry run complete - no changes applied');
        this.promptService.showOutro('Dry run finished.');
        return;
      }

      if (plan.breakingChanges.length > 0 && !options?.force) {
        this.promptService.showWarning(`⚠ ${plan.breakingChanges.length} breaking change(s) detected`);
        this.promptService.showInfo('Use --force to proceed with breaking changes');
        this.promptService.showOutro('Upgrade cancelled.');
        return;
      }

      const confirm = await this.promptService.confirm(`Apply ${plan.changes.length} change(s)?`, true);

      if (!confirm) {
        this.promptService.showOutro('Upgrade cancelled.');
        return;
      }

      this.promptService.startSpinner('Applying upgrade...');

      const result = await service.executeUpgrade({
        satellitePath,
        corePath,
        force: options?.force,
      });

      this.promptService.stopSpinner();

      const report = await service.getUpgradeReport(result);
      console.log(`\n${chalk.bgCyan.black(' Upgrade Report ')}\n${report}\n`);

      if (result.success) {
        this.promptService.showSuccess(`Upgrade complete: ${result.changesApplied} change(s) applied`);
      } else {
        this.promptService.showError(`Upgrade completed with errors: ${result.errors.length}`);
      }

      this.promptService.showOutro(result.success ? 'Upgrade finished.' : 'Upgrade finished with errors.');
    } catch (error: unknown) {
      this.promptService.stopSpinner();
      throw error;
    }
  }

  private printUpgradePlan(plan: UpgradePlan): void {
    console.log(chalk.bold('\n📋 Upgrade Plan\n'));
    console.log(`${chalk.bold('Current Version:')} ${chalk.cyan(plan.currentVersion)}`);
    console.log(`${chalk.bold('Target Version:')} ${chalk.cyan(plan.targetVersion)}`);
    console.log(`${chalk.bold('Risk Level:')} ${plan.estimatedRisk === 'high' ? chalk.red(plan.estimatedRisk.toUpperCase()) : plan.estimatedRisk === 'medium' ? chalk.yellow(plan.estimatedRisk.toUpperCase()) : chalk.green(plan.estimatedRisk.toUpperCase())}`);
    console.log(`${chalk.bold('Total Changes:')} ${plan.changes.length}`);

    if (plan.breakingChanges.length > 0) {
      console.log(`${chalk.red('⚠ Breaking Changes:')} ${plan.breakingChanges.length}`);
    }

    console.log(chalk.cyan('\nChanges:'));

    for (const change of plan.changes) {
      const icon = this.getChangeIcon(change.type);
      const breaking = change.breaking ? chalk.red(' [BREAKING]') : '';
      console.log(`  ${icon} ${change.description}${breaking}`);
    }

    console.log('');
  }

  private getChangeIcon(type: string): string {
    switch (type) {
      case 'add': return chalk.green('+');
      case 'modify': return chalk.yellow('~');
      case 'remove': return chalk.red('-');
      case 'migrate': return chalk.blue('»');
      default: return '?';
    }
  }

  private getRiskColor(risk: string): string {
    switch (risk) {
      case 'high': return 'high';
      case 'medium': return 'medium';
      default: return 'low';
    }
  }

  private findCorePath(satellitePath: string): string {
    return satellitePath;
  }

  @Option({
    flags: '-d, --dry-run',
    description: 'Ejecuta en modo simulacro sin alterar archivos',
  })
  parseDryRun(): boolean {
    return true;
  }

  @Option({
    flags: '-f, --force',
    description: 'Force upgrade even with breaking changes',
  })
  parseForce(): boolean {
    return true;
  }

  @Option({
    flags: '-c, --core [path]',
    description: 'Path to Evolith core repository',
  })
  parseCore(val: string): string {
    return val;
  }

  @Option({
    flags: '-s, --satellite [path]',
    description: 'Satellite project path (default: nearest-ancestor evolith.yaml from cwd)',
  })
  parseSatellite(val: string): string {
    return val;
  }

  @Option({
    flags: '--report',
    description: 'Show detailed upgrade report',
  })
  parseReport(): boolean {
    return true;
  }
}
