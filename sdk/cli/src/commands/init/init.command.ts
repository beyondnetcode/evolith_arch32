import { Command, Option } from 'nest-commander';
import chalk from 'chalk';
import { getContainer } from '../../core/di/container';
import { InitializeProjectUseCase, InitProjectInput } from '../../application/services';
import { logger, errorReporter, OperationTimer } from '../../core/observability';
import { Injectable } from '@nestjs/common';
import { BaseEvolithCommand } from '../../infrastructure/cli/base-command';
import { CatalogLoader } from '../../infrastructure/catalog/catalog-loader';

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
export class InitCommand extends BaseEvolithCommand {
  private readonly operationTimer = new OperationTimer();

  constructor(private readonly catalogLoader: CatalogLoader) {
    super('InitCommand');
  }

  async executeCommand(
    passedParam: string[],
    options?: InitCommandOptions,
  ): Promise<void> {
    this.operationTimer.start('InitCommand.executeCommand');

    logger.info('Starting project initialization', { options });

    const fs = getContainer().createFileSystem() as any;
    const useCase = new InitializeProjectUseCase(fs, this.catalogLoader);

    console.clear();
    this.promptService.showIntro('Evolith - Project Initialization');

    const inputData = await this.promptService.askInitOptions(this.catalogLoader);

    if (!inputData) {
      this.promptService.showOutro(chalk.yellow('Inicialización cancelada.'));
      return;
    }

    this.promptService.startSpinner('Aplicando estándares de Evolith...');

    const input: InitProjectInput = {
      ...inputData,
      name: (inputData as any).name || (inputData as any).projectName,
    } as InitProjectInput;

    const result = await useCase.execute(input, process.cwd());

    this.promptService.stopSpinner();

    const durationMs = this.operationTimer.end();

    if (result.success) {
      logger.info('Project initialization completed successfully', {
        projectName: input.name,
        artifacts: result.artifacts.length,
        durationMs,
      });

      this.promptService.showSuccess(`✓ Proyecto ${input.name} inicializado`);
      this.promptService.showInfo(`  Artifacts creados: ${result.artifacts.length}`);
      result.artifacts.forEach(a => this.promptService.showInfo(`    - ${a}`));

      if (result.warnings.length > 0) {
        logger.warn('Initialization completed with warnings', { warnings: result.warnings });
        this.promptService.showWarning('Warnings:');
        result.warnings.forEach(w => this.promptService.showWarning(`  - ${w}`));
      }

      const nextSteps = `
Proximos pasos:
  1. cd ${input.name}
  2. evolith validate
  3. evolith agents install
  4. evolith sdlc handoff --from phase-0 --to phase-1
`;
      // p.note is removed, use showInfo or console.log
      console.log(chalk.cyan(`\nSiguiente paso:\n${nextSteps}`));
    } else {
      errorReporter.report(result.errors, { operation: 'InitializeProjectUseCase.execute' });
      logger.error('Project initialization failed', { errors: result.errors, durationMs });
      this.promptService.showError('✗ Inicialización fallida');
      result.errors.forEach(e => this.promptService.showError(`  - ${e}`));
      errorReporter.printSummary();
    }

    this.promptService.showOutro(result.success ? chalk.green('¡Completado!') : chalk.red('Error'));
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
