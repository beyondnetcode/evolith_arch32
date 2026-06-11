import { Command, CommandRunner, Option } from 'nest-commander';
import * as p from '@clack/prompts';
import chalk from 'chalk';
import { getContainer } from '../../core/di/container';
import { InitializeProjectUseCase, InitProjectInput } from '../../application/services';
import { logger, errorReporter, OperationTimer } from '../../core/observability';
import { PromptService } from '../../infrastructure/prompts/prompt.service';
import { Injectable } from '@nestjs/common';

interface InitCommandOptions {
  dryRun?: boolean;
  config?: string;
  runtime?: string;
  monorepo?: string;
  arch?: string;
  db?: string;
}

@Injectable()
@Command({
  name: 'init',
  description: 'Inicializa un repositorio satélite de Evolith con selección interactiva de herramientas',
})
export class InitCommand extends CommandRunner {
  private readonly operationTimer = new OperationTimer();

  constructor(private readonly promptService: PromptService) {
    super();
  }

  async run(
    passedParam: string[],
    options?: InitCommandOptions,
  ): Promise<void> {
    this.operationTimer.start('InitCommand.run');

    logger.info('Starting project initialization', { options });

    const fs = getContainer().createFileSystem() as any;
    const useCase = new InitializeProjectUseCase(fs);

    console.clear();
    p.intro(chalk.bgCyan.white.bold(' Evolith - Project Initialization '));

    const inputData = await this.promptService.askInitOptions();

    if (!inputData) {
      p.outro(chalk.yellow('Inicialización cancelada.'));
      return;
    }

    const spinner = p.spinner();
    spinner.start('Aplicando estándares de Evolith...');

    const input: InitProjectInput = {
      ...inputData,
      name: (inputData as any).projectName,
    } as InitProjectInput;

    const result = await useCase.execute(input, process.cwd());

    spinner.stop();

    const durationMs = this.operationTimer.end();

    if (result.success) {
      logger.info('Project initialization completed successfully', {
        projectName: input.name,
        artifacts: result.artifacts.length,
        durationMs,
      });

      p.log.success(chalk.green(`✓ Proyecto ${input.name} inicializado`));
      p.log.info(`  Artifacts creados: ${result.artifacts.length}`);
      result.artifacts.forEach(a => p.log.info(`    - ${a}`));

      if (result.warnings.length > 0) {
        logger.warn('Initialization completed with warnings', { warnings: result.warnings });
        p.log.warn('Warnings:');
        result.warnings.forEach(w => p.log.warn(`  - ${w}`));
      }

      const nextSteps = `
Proximos pasos:
  1. cd ${input.name}
  2. evolith validate
  3. evolith agents install
  4. evolith sdlc handoff --from phase-0 --to phase-1
`;
      p.note(nextSteps, 'Siguiente paso');
    } else {
      errorReporter.report(result.errors, { operation: 'InitializeProjectUseCase.execute' });
      logger.error('Project initialization failed', { errors: result.errors, durationMs });
      p.log.error(chalk.red('✗ Inicialización fallida'));
      result.errors.forEach(e => p.log.error(`  - ${e}`));
      errorReporter.printSummary();
    }

    p.outro(result.success ? chalk.green('¡Completado!') : chalk.red('Error'));
  }

  @Option({
    flags: '-d, --dry-run',
    description: 'Ejecuta en modo simulacro sin alterar archivos',
  })
  parseDryRun(): boolean {
    return true;
  }

  @Option({
    flags: '-c, --config [string]',
    description: 'Ruta al archivo evolith.setup.json para modo batch',
  })
  parseConfig(val: string): string {
    return val;
  }

  @Option({
    flags: '-r, --runtime [string]',
    description: 'Runtime: nodejs, dotnet, python',
  })
  parseRuntime(val: string): string {
    return val;
  }

  @Option({
    flags: '-m, --monorepo [string]',
    description: 'Monorepo: none, nx, npm-workspaces, rush',
  })
  parseMonorepo(val: string): string {
    return val;
  }

  @Option({
    flags: '-a, --arch [string]',
    description: 'Arquitectura: clean, hexagonal, ddd',
  })
  parseArch(val: string): string {
    return val;
  }

  @Option({
    flags: '--db [string]',
    description: 'Base de datos: postgresql, mongodb, sqlserver',
  })
  parseDb(val: string): string {
    return val;
  }
}