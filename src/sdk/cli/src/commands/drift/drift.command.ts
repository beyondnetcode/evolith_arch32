import { Command, Option } from 'nest-commander';
import { randomUUID } from 'node:crypto';
import chalk from 'chalk';
import { ArchitectureDriftService, DriftReport, DriftViolation } from '@beyondnet/evolith-core-domain/application/validators/architecture-drift.service';
import { createSuccessEnvelope, createErrorEnvelope, OUTPUT_ENVELOPE_SCHEMA_VERSION } from '@beyondnet/evolith-core-domain/domain/gate-evidence';
import { BaseEvolithCommand } from '../../infrastructure/cli/base-command';
import { PromptService } from '../../infrastructure/prompts/prompt.service';
import { toLegacyLevel } from '../../infrastructure/architecture/topology-catalog';

interface DriftOptions {
  path?: string;
  level?: string;
  format?: string;
  json?: boolean;
  history?: boolean;
  trend?: boolean;
}

@Command({
  name: 'drift',
  description: 'Detect architecture drift along the progressive maturity axis (modular-monolith → distributed-modules → microservices)',
})
export class DriftCommand extends BaseEvolithCommand {
  constructor(
    private readonly driftService: ArchitectureDriftService,
    promptService: PromptService,
  ) {
    super('DriftCommand', promptService);
  }

  async executeCommand(
    _passedParam: string[],
    options?: DriftOptions,
  ): Promise<void> {
    const projectPath = options?.path || process.cwd();
    // Drift is measured along the progressive maturity axis. Accept a canonical
    // progressive-axis id (modular-monolith/distributed-modules/microservices)
    // and normalize to the internal level the core-domain service consumes.
    let declaredLevel: 'F1' | 'F2' | 'F3' | undefined;
    if (options?.level) {
      const normalized = toLegacyLevel(options.level);
      if (!normalized) {
        throw new Error(
          `Nivel desconocido: "${options.level}". Use un id del eje progresivo ` +
          `(modular-monolith, distributed-modules, microservices).`,
        );
      }
      declaredLevel = normalized;
    }
    const json = options?.format === 'json' || options?.json === true;
    const commandId = 'evolith drift detect';
    const startedAt = Date.now();
    const meta = {
      command: commandId,
      executedAt: new Date().toISOString(),
      durationMs: 0,
      correlationId: randomUUID(),
      schemaVersion: OUTPUT_ENVELOPE_SCHEMA_VERSION,
    };

    const service = this.driftService;

    if (options?.trend) {
      try {
        const result = await service.getDriftTrend(projectPath);
        if (json) {
          console.log(JSON.stringify(createSuccessEnvelope(result, { ...meta, durationMs: Date.now() - startedAt }), null, 2));
        } else {
          await this.showTrend(service, projectPath);
        }
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        if (json) {
          process.exitCode = 1;
          console.log(JSON.stringify(createErrorEnvelope('INTERNAL_ERROR', message, { ...meta, durationMs: Date.now() - startedAt }), null, 2));
        } else {
          throw error;
        }
      }
      return;
    }

    if (options?.history) {
      try {
        const history = await service.getDriftHistory(projectPath);
        if (json) {
          console.log(JSON.stringify(createSuccessEnvelope(history, { ...meta, durationMs: Date.now() - startedAt }), null, 2));
        } else {
          await this.showHistory(service, projectPath);
        }
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        if (json) {
          process.exitCode = 1;
          console.log(JSON.stringify(createErrorEnvelope('INTERNAL_ERROR', message, { ...meta, durationMs: Date.now() - startedAt }), null, 2));
        } else {
          throw error;
        }
      }
      return;
    }

    this.promptService.startSpinner('Detecting architecture drift...');

    try {
      const report = await service.detectDrift({
        projectPath,
        declaredLevel,
        storeHistory: true,
      });

      this.promptService.stopSpinner();

      if (json) {
        console.log(JSON.stringify(createSuccessEnvelope(report, { ...meta, durationMs: Date.now() - startedAt }), null, 2));
        return;
      }

      this.printDriftReport(report);
    } catch (error: unknown) {
      this.promptService.stopSpinner();
      if (json) {
        const message = error instanceof Error ? error.message : String(error);
        process.exitCode = 1;
        console.log(JSON.stringify(createErrorEnvelope('INTERNAL_ERROR', message, { ...meta, durationMs: Date.now() - startedAt }), null, 2));
      } else {
        throw error;
      }
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
    description: 'Declared progressive-axis topology: modular-monolith, distributed-modules, microservices',
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

  @Option({
    flags: '-f, --format [string]',
    description: 'Output format: json (ADR-0073 envelope) or human (default)',
  })
  parseFormat(val: string): string {
    return val;
  }
}
