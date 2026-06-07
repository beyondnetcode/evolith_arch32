import { Command, CommandRunner, Option } from 'nest-commander';
import * as p from '@clack/prompts';
import chalk from 'chalk';
import { SatelliteUpgradeService, UpgradePlan } from '../../core/upgrade/satellite-upgrade.service';

interface UpgradeCommandOptions {
  dryRun?: boolean;
  force?: boolean;
  core?: string;
  report?: boolean;
}

@Command({
  name: 'upgrade',
  description: 'Actualiza el repositorio satélite cuando el upstream Evolith recibe nuevas reglas',
})
export class UpgradeCommand extends CommandRunner {
  async run(passedParam: string[], options?: UpgradeCommandOptions): Promise<void> {
    const satellitePath = process.cwd();
    const corePath = options?.core || this.findCorePath(satellitePath);

    const service = new SatelliteUpgradeService();

    p.intro(chalk.bgBlueBright.white.bold(' Evolith SDK - Satélite Upgrade '));

    const spinner = p.spinner();
    spinner.start('Planning upgrade...');

    try {
      const plan = await service.planUpgrade({ satellitePath, corePath });
      spinner.stop();

      if (plan.changes.length === 0) {
        p.log.info(chalk.green('✓ Satellite is already up to date'));
        p.outro(chalk.blue('No upgrade needed.'));
        return;
      }

      this.printUpgradePlan(plan);

      if (options?.dryRun) {
        const result = await service.executeUpgrade({
          satellitePath,
          corePath,
          dryRun: true,
        });

        p.log.info(chalk.yellow('Dry run complete - no changes applied'));
        p.outro(chalk.blue('Dry run finished.'));
        return;
      }

      if (plan.breakingChanges.length > 0 && !options?.force) {
        p.log.warn(chalk.red(`⚠ ${plan.breakingChanges.length} breaking change(s) detected`));
        p.log.info('Use --force to proceed with breaking changes');
        p.outro(chalk.yellow('Upgrade cancelled.'));
        return;
      }

      const confirm = await p.confirm({
        message: `Apply ${plan.changes.length} change(s)?`,
        initialValue: true,
      });

      if (!confirm) {
        p.outro(chalk.yellow('Upgrade cancelled.'));
        return;
      }

      spinner.start('Applying upgrade...');

      const result = await service.executeUpgrade({
        satellitePath,
        corePath,
        force: options?.force,
      });

      spinner.stop();

      const report = await service.getUpgradeReport(result);
      p.note(report, 'Upgrade Report');

      if (result.success) {
        p.log.success(chalk.green(`✓ Upgrade complete: ${result.changesApplied} change(s) applied`));
      } else {
        p.log.error(chalk.red(`✗ Upgrade completed with errors: ${result.errors.length}`));
      }

      p.outro(result.success ? chalk.green('Upgrade finished.') : chalk.red('Upgrade finished with errors.'));
    } catch (error: unknown) {
      spinner.stop();
      const message = error instanceof Error ? error.message : String(error);
      p.log.error(`Upgrade failed: ${message}`);
      process.exit(1);
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
    flags: '--report',
    description: 'Show detailed upgrade report',
  })
  parseReport(): boolean {
    return true;
  }
}
