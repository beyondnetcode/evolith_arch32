import { Command, CommandRunner } from 'nest-commander';
import chalk from 'chalk';
import * as p from '@clack/prompts';
import { getContainer } from '../../core/di/container';
import { PhaseTransitionUseCase } from '../../application/services';
import { PhaseGateValidatorService } from '../../core/validators/phase-gate-validator.service';

@Command({
  name: 'gate-status',
  description: 'Display current SDLC phase gate validation status',
})
export class GateStatusCommand extends CommandRunner {
  async run(
    _passedParam: string[],
    _options?: Record<string, any>,
  ): Promise<void> {
    const fs = getContainer().createFileSystem() as any;
    const useCase = new PhaseTransitionUseCase(fs);
    const cwd = process.cwd();

    const spinner = p.spinner();
    spinner.start('Validating phase gates...');

    try {
      const status = await useCase.getGateStatus(cwd);
      spinner.stop();

      this.printGateStatus(status);
    } catch (error: unknown) {
      spinner.stop();
      const message = error instanceof Error ? error.message : String(error);
      p.log.error(`Failed to validate gates: ${message}`);
      process.exit(1);
    }
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
}
