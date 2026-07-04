import { PromptService } from '../../infrastructure/prompts/prompt.service';
import { Command, Option } from 'nest-commander';
import chalk from 'chalk';
import { Inject } from '@nestjs/common';
import { AdoptRepoUseCase, AdoptRepoResult } from '@evolith/core-domain/application/use-cases/adopt-repo.use-case';
import { RepoDetectorService } from '@evolith/core-domain/application/services/repo-detector.service';
import { logger, errorReporter, OperationTimer } from '../../infrastructure/observability';
import { Injectable } from '@nestjs/common';
import { BaseEvolithCommand } from '../../infrastructure/cli/base-command';
import { CatalogLoader } from '../../infrastructure/catalog/catalog-loader';
import { IFileSystem, ICommandExecutor } from '@evolith/core-domain/domain/interfaces';

interface InitCommandOptions {
  dryRun?: boolean;
  monorepo?: string;
  features?: string;
  agents?: string;
}

@Injectable()
@Command({
  name: 'init',
  description: 'Initialize Evolith governance on the current repository (satellite adoption)',
})
export class InitCommand extends BaseEvolithCommand {
  private readonly operationTimer = new OperationTimer();

  constructor(
    private readonly catalogLoader: CatalogLoader,
    @Inject('IFileSystem') private readonly fileSystem: IFileSystem,
    @Inject('ICommandExecutor') private readonly commandExecutor: ICommandExecutor,
    promptService: PromptService
  ) {
    super('InitCommand', promptService);
  }

  async executeCommand(
    passedParam: string[],
    options?: InitCommandOptions,
  ): Promise<void> {
    this.operationTimer.start('InitCommand.executeCommand');

    logger.info('Starting satellite adoption', { options });

    const cwd = process.cwd();

    // Validate we're inside a git repository
    try {
      await this.commandExecutor.executeOrThrow('git rev-parse --is-inside-work-tree', cwd);
    } catch {
      this.promptService.showError('Not inside a Git repository. Initialize a Git repo first: git init');
      return;
    }

    // Detect repository properties
    this.promptService.startSpinner('Detecting repository properties...');
    const detector = new RepoDetectorService(this.fileSystem, this.commandExecutor);
    const detection = await detector.detect(cwd);
    this.promptService.stopSpinner();

    console.clear();
    this.promptService.showIntro('Evolith - Satellite Adoption');

    // Run interactive adopt prompts
    const inputData = await this.promptService.askAdoptOptions(detection, this.catalogLoader);

    if (!inputData) {
      this.promptService.showOutro(chalk.yellow('Adoption cancelled.'));
      return;
    }

    // Apply CLI overrides
    if (options?.monorepo) inputData.monorepo = options.monorepo;
    if (options?.features) inputData.features = options.features.split(',').map(f => f.trim());
    if (options?.agents) inputData.agents = options.agents.split(',').map(a => a.trim());

    this.promptService.startSpinner('Applying Evolith governance...');

    const useCase = new AdoptRepoUseCase(this.fileSystem);
    const result = await useCase.execute(inputData, cwd);

    this.promptService.stopSpinner();

    const durationMs = this.operationTimer.end();

    if (result.success) {
      logger.info('Satellite adoption completed successfully', {
        projectName: inputData.name,
        created: result.created.length,
        merged: result.merged.length,
        skipped: result.skipped.length,
        durationMs,
      });

      this.promptService.showSuccess(`Repository adopted as Evolith satellite: ${inputData.name}`);

      if (result.created.length > 0) {
        this.promptService.showInfo(`  Created: ${result.created.length} files`);
        result.created.forEach(a => this.promptService.showInfo(`    + ${a}`));
      }

      if (result.merged.length > 0) {
        this.promptService.showInfo(`  Merged: ${result.merged.length} files`);
        result.merged.forEach(a => this.promptService.showInfo(`    ~ ${a}`));
      }

      if (result.skipped.length > 0) {
        this.promptService.showInfo(`  Skipped: ${result.skipped.length} files (already exist)`);
      }

      if (result.warnings.length > 0) {
        logger.warn('Adoption completed with warnings', { warnings: result.warnings });
        this.promptService.showWarning('Warnings:');
        result.warnings.forEach(w => this.promptService.showWarning(`  - ${w}`));
      }

      const nextSteps = `
Next steps:
  1. evolith validate
  2. evolith sdlc status
  3. evolith agents install
  4. evolith sdlc handoff --from phase-0 --to phase-1
`;
      console.log(chalk.cyan(`\n${nextSteps}`));
    } else {
      errorReporter.report(result.errors, { operation: 'AdoptRepoUseCase.execute' });
      logger.error('Satellite adoption failed', { errors: result.errors, durationMs });
      this.promptService.showError('Adoption failed');
      result.errors.forEach(e => this.promptService.showError(`  - ${e}`));
      errorReporter.printSummary();
    }

    this.promptService.showOutro(result.success ? chalk.green('Done!') : chalk.red('Error'));
  }

  @Option({
    flags: '-d, --dry-run',
    description: 'Dry run mode — detect and show what would be done',
  })
  parseDryRun(): boolean {
    return true;
  }

  @Option({
    flags: '-m, --monorepo [string]',
    description: 'Monorepo strategy: none, nx, npm-workspaces, pnpm-workspaces, rush, turborepo',
  })
  parseMonorepo(val: string): string {
    return val;
  }

  @Option({
    flags: '--features [string]',
    description: 'Comma-separated features: adr, hooks, bilingual, acl, otel',
  })
  parseFeatures(val: string): string {
    return val;
  }

  @Option({
    flags: '--agents [string]',
    description: 'Comma-separated agents: bmad, architecture, qa, sdlc',
  })
  parseAgents(val: string): string {
    return val;
  }
}
