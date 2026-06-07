import { Command, CommandRunner, Option } from 'nest-commander';
import chalk from 'chalk';
import * as p from '@clack/prompts';
import { ArchitectureDriftService, DriftReport, DriftViolation } from '../../core/validators/architecture-drift.service';

interface DriftOptions {
  path?: string;
  level?: string;
  json?: boolean;
  history?: boolean;
  trend?: boolean;
}

@Command({
  name: 'drift',
  description: 'Detect architecture drift from declared architecture level (F1/F2/F3)',
})
export class DriftCommand extends CommandRunner {
  async run(
    _passedParam: string[],
    options?: DriftOptions,
  ): Promise<void> {
    const projectPath = options?.path || process.cwd();
    const declaredLevel = options?.level as 'F1' | 'F2' | 'F3' | undefined;

    const service = new ArchitectureDriftService();

    if (options?.trend) {
      await this.showTrend(service, projectPath);
      return;
    }

    if (options?.history) {
      await this.showHistory(service, projectPath);
      return;
    }

    const spinner = p.spinner();
    spinner.start('Detecting architecture drift...');

    try {
      const report = await service.detectDrift({
        projectPath,
        declaredLevel,
        storeHistory: true,
      });

      spinner.stop();

      if (options?.json) {
        console.log(JSON.stringify(report, null, 2));
        return;
      }

      this.printDriftReport(report);
    } catch (error: unknown) {
      spinner.stop();
      const message = error instanceof Error ? error.message : String(error);
      p.log.error(`Drift detection failed: ${message}`);
      process.exit(1);
    }
  }

  private printDriftReport(report: DriftReport): void {
    console.log(chalk.bold('\n📐 Architecture Drift Report\n'));

    const levelIcon = report.driftDetected ? chalk.red('⚠') : chalk.green('✓');
    console.log(`${levelIcon} ${chalk.bold('Declared Level:')} ${chalk.cyan(report.declaredLevel)}`);
    console.log(`  ${chalk.bold('Detected Level:')} ${chalk.cyan(report.detectedLevel)}`);

    if (report.declaredLevel !== report.detectedLevel) {
      console.log(`  ${chalk.red('⚠ LEVEL DRIFT DETECTED')}`);
    }

    console.log(`\n${chalk.bold('Overall Score:')} ${this.getScoreColor(report.overallScore)}${report.overallScore}%`);
    console.log(`${chalk.bold('Drift Severity:')} ${this.getSeverityColor(report.driftSeverity)}${report.driftSeverity.toUpperCase()}`);

    if (report.newViolations.length > 0) {
      console.log(chalk.red(`\n🆕 New Violations (${report.newViolations.length}):`));
      this.printViolations(report.newViolations);
    }

    if (report.persistentViolations.length > 0) {
      console.log(chalk.yellow(`\n⚠ Persistent Violations (${report.persistentViolations.length}):`));
      this.printViolations(report.persistentViolations);
    }

    if (report.resolvedViolations.length > 0) {
      console.log(chalk.green(`\n✓ Resolved Violations (${report.resolvedViolations.length}):`));
      this.printViolations(report.resolvedViolations);
    }

    if (report.newViolations.length === 0 && report.persistentViolations.length === 0) {
      console.log(chalk.green('\n✓ No architecture drift detected. Codebase is compliant.'));
    }

    console.log(`\n${chalk.gray(`History stored at: ${report.historyPath}`)}`);
    console.log('');
  }

  private printViolations(violations: DriftViolation[]): void {
    for (const v of violations) {
      const icon = v.blocking ? chalk.red('⛔') : chalk.yellow('⚠');
      const severity = v.severity === 'MUST' ? chalk.red('[MUST]') : v.severity === 'SHOULD' ? chalk.yellow('[SHOULD]') : chalk.gray('[COULD]');
      console.log(`  ${icon} ${severity} ${v.ruleId}: ${v.title}`);
      console.log(`    ${chalk.gray(v.description)}`);
    }
  }

  private async showTrend(service: ArchitectureDriftService, projectPath: string): Promise<void> {
    const { trend, entries } = await service.getDriftTrend(projectPath);

    console.log(chalk.bold('\n📈 Architecture Drift Trend\n'));
    console.log(`${chalk.bold('Trend:')} ${this.getTrendColor(trend)}${trend.toUpperCase()}`);

    if (entries.length > 0) {
      console.log(`\n${chalk.gray('Last ' + entries.length + ' scans:')}`);
      for (const entry of entries) {
        const date = new Date(entry.timestamp).toLocaleDateString();
        const score = this.getScoreColor(entry.overallScore);
        console.log(`  ${date} - Score: ${score}${entry.overallScore}% - Violations: ${entry.violationsCount} (${entry.blockingViolationsCount} blocking)`);
      }
    } else {
      console.log(chalk.gray('\nNo history available. Run drift detection first.'));
    }

    console.log('');
  }

  private async showHistory(service: ArchitectureDriftService, projectPath: string): Promise<void> {
    const history = await service.getDriftHistory(projectPath);

    console.log(chalk.bold('\n📋 Architecture Drift History\n'));

    if (history.length === 0) {
      console.log(chalk.gray('No drift history available. Run drift detection first.'));
    } else {
      console.log(`Total scans: ${history.length}`);
      for (const entry of history.slice(-10)) {
        const date = new Date(entry.timestamp).toLocaleString();
        console.log(`\n  ${chalk.cyan(date)}`);
        console.log(`    Level: ${entry.declaredLevel} → ${entry.detectedLevel}`);
        console.log(`    Score: ${this.getScoreColor(entry.overallScore)}${entry.overallScore}%`);
        console.log(`    Violations: ${entry.violationsCount} (${entry.blockingViolationsCount} blocking)`);
      }
    }

    console.log('');
  }

  private getScoreColor(score: number): (text: string) => string {
    if (score >= 90) return chalk.green;
    if (score >= 70) return chalk.yellow;
    return chalk.red;
  }

  private getSeverityColor(severity: string): (text: string) => string {
    switch (severity) {
      case 'critical': return chalk.red;
      case 'high': return chalk.redBright;
      case 'medium': return chalk.yellow;
      case 'low': return chalk.blue;
      default: return chalk.green;
    }
  }

  private getTrendColor(trend: string): (text: string) => string {
    switch (trend) {
      case 'improving': return chalk.green;
      case 'degrading': return chalk.red;
      default: return chalk.yellow;
    }
  }

  @Option({
    flags: '-p, --path [path]',
    description: 'Project path to analyze (default: current directory)',
  })
  parsePath(val: string): string {
    return val;
  }

  @Option({
    flags: '-l, --level [level]',
    description: 'Declared architecture level (F1, F2, F3)',
  })
  parseLevel(val: string): string {
    return val;
  }

  @Option({
    flags: '--json',
    description: 'Output report as JSON',
  })
  parseJson(): boolean {
    return true;
  }

  @Option({
    flags: '--history',
    description: 'Show drift history',
  })
  parseHistory(): boolean {
    return true;
  }

  @Option({
    flags: '--trend',
    description: 'Show drift trend analysis',
  })
  parseTrend(): boolean {
    return true;
  }
}
