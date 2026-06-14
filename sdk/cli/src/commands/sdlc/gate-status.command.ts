import { Command, Option } from 'nest-commander';
import chalk from 'chalk';
import { Inject } from '@nestjs/common';
import { PhaseTransitionUseCase } from '../../application/services';
import { GateResult } from '../../domain/gate-evidence';
import { IFileSystem } from '../../domain/interfaces';
import { readGitLog, isGitRepo } from '../../domain/metrics/git-log-reader';
import { calculateDora, DoraMetric, DoraRating } from '../../domain/metrics/dora-calculator';
import { BaseEvolithCommand } from '../../infrastructure/cli/base-command';

function ratingBadge(rating: DoraRating): string {
  switch (rating) {
    case 'elite':   return chalk.blueBright('◆ elite');
    case 'high':    return chalk.green('● high');
    case 'medium':  return chalk.yellow('● medium');
    case 'low':     return chalk.red('● low');
    default:        return chalk.gray('○ unknown');
  }
}

@Command({
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
    const useCase = new PhaseTransitionUseCase(fs);
    const cwd = process.cwd();
    const sinceDays: number = options?.since ?? 90;

    this.promptService.startSpinner('Validating phase gates…');

    try {
      const status = await useCase.getGateStatus(cwd);
      this.promptService.stopSpinner();
      this.printGateStatus(status);
    } catch (error: unknown) {
      this.promptService.stopSpinner();
      throw error; // Let BaseEvolithCommand handle it
    }

    // ── DORA metrics ────────────────────────────────────────────────────────
    this.promptService.startSpinner('Reading git history for DORA metrics…');
    try {
      const hasGit = await isGitRepo(cwd);
      if (!hasGit) {
        this.promptService.stopSpinner('');
        this.promptService.showWarning('DORA metrics skipped — not a git repository.');
        return;
      }

      const commits = await readGitLog({ cwd, sinceDays });
      this.promptService.stopSpinner(`Analysed ${commits.length} commits (last ${sinceDays} days)`);

      const dora = calculateDora(commits, sinceDays);
      this.printDora(dora);
    } catch (err: unknown) {
      this.promptService.stopSpinner('');
      const msg = err instanceof Error ? err.message : String(err);
      this.promptService.showWarning(`DORA metrics unavailable: ${msg}`);
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
    console.log(chalk.bold('\n📋 SDLC Phase Gate Status\n'));

    console.log(chalk.cyan('Summary:'));
    console.log(`  Current Phase: ${chalk.yellow(`Phase ${status.currentPhase}`)}`);
    console.log(`  Gates Passed: ${chalk.green(status.gatesPassed)}`);
    console.log(`  Gates Failed: ${status.gatesFailed > 0 ? chalk.red(status.gatesFailed) : chalk.green(status.gatesFailed)}`);
    console.log(`  Gates Pending: ${chalk.gray(status.gatesPending)}`);

    console.log(chalk.cyan('\nGate Details:'));

    for (const gate of status.results) {
      const icon = gate.passed ? chalk.green('✓') : chalk.red('✗');
      const phaseLabel = chalk.bold(`Phase ${gate.phase}: ${gate.name}`);

      console.log(`\n  ${icon} ${phaseLabel}`);
      console.log(`    Accountable: ${chalk.gray(gate.accountableRole)}`);

      if (!gate.passed) {
        console.log(`    Waiver Authority: ${chalk.gray(gate.waiverAuthority)}`);
      }

      console.log(chalk.gray('    Evidence:'));
      for (const evidence of gate.evidenceResults) {
        const eIcon = evidence.passed ? chalk.green('✓') : chalk.red('✗');
        const required = evidence.required ? chalk.red('[REQUIRED]') : chalk.gray('[OPTIONAL]');
        console.log(`      ${eIcon} ${required} ${evidence.artifact}`);
        if (!evidence.passed) {
          console.log(`        ${chalk.gray(evidence.validationMessage)}`);
        }
      }

      const triggeredBlocks = gate.blockingChecks.filter(b => b.triggered);
      if (triggeredBlocks.length > 0) {
        console.log(chalk.red('    Blocking Criteria:'));
        for (const block of triggeredBlocks) {
          console.log(`      ${chalk.red('⛔')} ${block.criterion}`);
          console.log(`        ${chalk.gray(block.action)}`);
        }
      }
    }

    console.log('');
  }

  private printDora(dora: ReturnType<typeof calculateDora>): void {
    console.log(chalk.bold('\n📊 DORA Metrics\n'));

    if (!dora.available) {
      console.log(chalk.gray('  No commit history found in the analysis window.'));
      console.log('');
      return;
    }

    console.log(chalk.dim(`  Based on ${dora.totalCommits} commits over the last ${dora.analyzedDays} days\n`));

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
      console.log(`  ${nameCol} ${valueCol} ${badge}`);
    }

    console.log('');
    console.log(chalk.dim('  Ratings: ') +
      chalk.blueBright('◆ elite') + chalk.dim('  ') +
      chalk.green('● high') + chalk.dim('  ') +
      chalk.yellow('● medium') + chalk.dim('  ') +
      chalk.red('● low') + chalk.dim('  ') +
      chalk.gray('○ unknown'));
    console.log('');
  }
}
