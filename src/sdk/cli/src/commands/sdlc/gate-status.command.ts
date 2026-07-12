import { SubCommand, Option } from 'nest-commander';
import chalk from 'chalk';
import { Inject } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { PhaseTransitionUseCase } from '@beyondnet/evolith-core-domain/application/services';
import { IFileSystem } from '@beyondnet/evolith-core-domain/domain/interfaces';
import { readGitLog, isGitRepo } from '@beyondnet/evolith-core-domain/domain/metrics/git-log-reader';
import { calculateDora, DoraMetric, DoraRating } from '@beyondnet/evolith-core-domain/domain/metrics/dora-calculator';
import {
  createSuccessEnvelope,
  createErrorEnvelope,
  OUTPUT_ENVELOPE_SCHEMA_VERSION,
} from '@beyondnet/evolith-core-domain/domain/gate-evidence';
import { BaseEvolithCommand } from '../../infrastructure/cli/base-command';
import { resolveCoreOverride } from '../../infrastructure/paths/core-resolver';

function ratingBadge(rating: DoraRating): string {
  switch (rating) {
    case 'elite':   return chalk.blueBright('◆ elite');
    case 'high':    return chalk.green('● high');
    case 'medium':  return chalk.yellow('● medium');
    case 'low':     return chalk.red('● low');
    default:        return chalk.gray('○ unknown');
  }
}

@SubCommand({
  name: 'gate-status',
  description: 'Display current SDLC phase gate validation status and DORA metrics',
})
export class GateStatusCommand extends BaseEvolithCommand {
  constructor(@Inject('IFileSystem') private readonly fileSystem: IFileSystem) {
    super('GateStatusCommand');
  }

  async executeCommand(
    _passedParam: string[],
    options?: Record<string, unknown>,
  ): Promise<void> {
    const fs = this.fileSystem;
    // GT-461 sub-finding: unify Core resolution with GT-456 so gate-status can
    // read the canonical gate-f*.json from an EXTERNAL Core checkout (via --core
    // → EVOLITH_CORE_PATH → profile.core). Without an override the validator
    // auto-detects the Core root by walking up from the project directory.
    const corePath = resolveCoreOverride({
      explicit: options?.core as string | undefined,
      profileCore: this.profile.core,
    });
    const useCase = new PhaseTransitionUseCase(fs, corePath);
    const cwd = process.cwd();
    const sinceDays: number = (options?.since as number | undefined) ?? 90;
    const json = (options?.format as string | undefined) === 'json';
    const startedAt = Date.now();
    const meta = {
      command: 'evolith sdlc gate-status',
      executedAt: new Date().toISOString(),
      durationMs: 0,
      correlationId: randomUUID(),
      schemaVersion: OUTPUT_ENVELOPE_SCHEMA_VERSION,
    };

    if (!json) {
      this.promptService.startSpinner('Validating phase gates…');
    }

    let status: any;
    try {
      status = await useCase.getGateStatus(cwd);
      if (!json) {
        this.promptService.stopSpinner();
        this.printGateStatus(status);
      }
    } catch (error: unknown) {
      if (!json) {
        this.promptService.stopSpinner();
      }
      if (json) {
        const msg = error instanceof Error ? error.message : String(error);
        console.log(JSON.stringify(createErrorEnvelope('INTERNAL_ERROR', msg, { ...meta, durationMs: Date.now() - startedAt }), null, 2));
        return;
      }
      throw error; // Let BaseEvolithCommand handle it
    }

    // ── DORA metrics ────────────────────────────────────────────────────────
    let dora: any = null;
    if (!json) {
      this.promptService.startSpinner('Reading git history for DORA metrics…');
    }
    try {
      const hasGit = await isGitRepo(cwd);
      if (!hasGit) {
        if (!json) {
          this.promptService.stopSpinner('');
          this.promptService.showWarning('DORA metrics skipped — not a git repository.');
        }
      } else {
        const commits = await readGitLog({ cwd, sinceDays });
        if (!json) {
          this.promptService.stopSpinner(`Analysed ${commits.length} commits (last ${sinceDays} days)`);
        }

        dora = calculateDora(commits, sinceDays);
        if (!json) {
          this.printDora(dora);
        }
      }
    } catch (err: unknown) {
      if (!json) {
        this.promptService.stopSpinner('');
        const msg = err instanceof Error ? err.message : String(err);
        this.promptService.showWarning(`DORA metrics unavailable: ${msg}`);
      }
    }

    if (json) {
      const result = {
        gateStatus: status,
        doraMetrics: dora,
      };
      console.log(JSON.stringify(createSuccessEnvelope(result, { ...meta, durationMs: Date.now() - startedAt }), null, 2));
    }
  }

  @Option({
    flags: '--since <days>',
    description: 'Days of git history to analyse for DORA metrics (default: 90)',
  })
  parseSince(val: string): number {
    const n = parseInt(val, 10);
    return isNaN(n) || n < 1 ? 90 : n;
  }

  @Option({
    flags: '-f, --format <string>',
    description: 'Output format: json (ADR-0073 envelope) or human (default)',
  })
  parseFormat(val: string): string {
    return val;
  }

  @Option({
    flags: '-c, --core [path]',
    description: 'Path to the Evolith Core checkout that holds the canonical SDLC gates (default: auto-detect)',
  })
  parseCore(val: string): string {
    return val;
  }

  private printGateStatus(status: {
    currentPhase: number;
    gatesPassed: number;
    gatesFailed: number;
    gatesPending: number;
    results: Array<{
      gateId: string;
      phase: number;
      name: string;
      passed: boolean;
      evidenceResults: Array<{
        artifact: string;
        passed: boolean;
        found: boolean;
        validationMessage: string;
        required: boolean;
      }>;
      blockingChecks: Array<{
        criterion: string;
        triggered: boolean;
        action: string;
      }>;
      waiverAvailable: boolean;
      accountableRole: string;
      waiverAuthority: string;
    }>;
  }): void {
    this.promptService.showInfo(chalk.bold('\n📋 SDLC Phase Gate Status\n'));

    this.promptService.showInfo(chalk.cyan('Summary:'));
    this.promptService.showInfo(`  Current Phase: ${chalk.yellow(`Phase ${status.currentPhase}`)}`);
    this.promptService.showInfo(`  Gates Passed: ${chalk.green(status.gatesPassed)}`);
    this.promptService.showInfo(`  Gates Failed: ${status.gatesFailed > 0 ? chalk.red(status.gatesFailed) : chalk.green(status.gatesFailed)}`);
    this.promptService.showInfo(`  Gates Pending: ${chalk.gray(status.gatesPending)}`);

    this.promptService.showInfo(chalk.cyan('\nGate Details:'));

    for (const gate of status.results) {
      const icon = gate.passed ? chalk.green('✓') : chalk.red('✗');
      const phaseLabel = chalk.bold(`Phase ${gate.phase}: ${gate.name}`);

      this.promptService.showInfo(`\n  ${icon} ${phaseLabel}`);
      this.promptService.showInfo(`    Accountable: ${chalk.gray(gate.accountableRole)}`);

      if (!gate.passed) {
        this.promptService.showInfo(`    Waiver Authority: ${chalk.gray(gate.waiverAuthority)}`);
      }

      this.promptService.showInfo(chalk.gray('    Evidence:'));
      for (const evidence of gate.evidenceResults) {
        const eIcon = evidence.passed ? chalk.green('✓') : chalk.red('✗');
        const required = evidence.required ? chalk.red('[REQUIRED]') : chalk.gray('[OPTIONAL]');
        this.promptService.showInfo(`      ${eIcon} ${required} ${evidence.artifact}`);
        if (!evidence.passed) {
          this.promptService.showInfo(`        ${chalk.gray(evidence.validationMessage)}`);
        }
      }

      const triggeredBlocks = gate.blockingChecks.filter(b => b.triggered);
      if (triggeredBlocks.length > 0) {
        this.promptService.showInfo(chalk.red('    Blocking Criteria:'));
        for (const block of triggeredBlocks) {
          this.promptService.showInfo(`      ${chalk.red('⛔')} ${block.criterion}`);
          this.promptService.showInfo(`        ${chalk.gray(block.action)}`);
        }
      }
    }

    this.promptService.showInfo('');
  }

  private printDora(dora: ReturnType<typeof calculateDora>): void {
    this.promptService.showInfo(chalk.bold('\n📊 DORA Metrics\n'));

    if (!dora.available) {
      this.promptService.showInfo(chalk.gray('  No commit history found in the analysis window.'));
      this.promptService.showInfo('');
      return;
    }

    this.promptService.showInfo(chalk.dim(`  Based on ${dora.totalCommits} commits over the last ${dora.analyzedDays} days\n`));

    const rows: Array<{ name: string; metric: DoraMetric }> = [
      { name: 'Deployment Frequency', metric: dora.deploymentFrequency },
      { name: 'Lead Time for Changes', metric: dora.leadTimeForChanges },
      { name: 'Change Failure Rate',   metric: dora.changeFailureRate },
      { name: 'Time to Restore',       metric: dora.timeToRestore },
    ];

    for (const { name, metric } of rows) {
      const badge = ratingBadge(metric.rating);
      const nameCol = name.padEnd(24);
      const valueCol = metric.label.padEnd(18);
      this.promptService.showInfo(`  ${nameCol} ${valueCol} ${badge}`);
    }

    this.promptService.showInfo('');
    this.promptService.showInfo(chalk.dim('  Ratings: ') +
      chalk.blueBright('◆ elite') + chalk.dim('  ') +
      chalk.green('● high') + chalk.dim('  ') +
      chalk.yellow('● medium') + chalk.dim('  ') +
      chalk.red('● low') + chalk.dim('  ') +
      chalk.gray('○ unknown'));
    this.promptService.showInfo('');
  }
}
