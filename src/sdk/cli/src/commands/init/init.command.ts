import { PromptService } from '../../infrastructure/prompts/prompt.service';
import { Command, Option } from 'nest-commander';
import chalk from 'chalk';
import { Inject } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { InitializeProjectUseCase, InitProjectInput } from '@beyondnet/evolith-core-domain/application/services';
import { logger, errorReporter, OperationTimer } from '../../infrastructure/observability';
import { Injectable } from '@nestjs/common';
import { BaseEvolithCommand } from '../../infrastructure/cli/base-command';
import { CatalogLoader } from '../../infrastructure/catalog/catalog-loader';
import { IFileSystem } from '@beyondnet/evolith-core-domain/domain/interfaces';
import {
  createSuccessEnvelope,
  OUTPUT_ENVELOPE_SCHEMA_VERSION,
} from '@beyondnet/evolith-core-domain/domain/gate-evidence';

interface InitCommandOptions {
  dryRun?: boolean;
  config?: string;
  name?: string;
  runtime?: string;
  monorepo?: string;
  arch?: string;
  db?: string;
  yes?: boolean;
  format?: string;
}

@Injectable()
@Command({
  name: 'init',
  description:
    'Inicializa un repositorio satélite de Evolith. Interactivo por defecto; ' +
    'modo batch/CI con `--config <evolith.setup.json>` o `--name <proyecto> --yes` ' +
    '(sin prompts). Ejemplo: `smart-cli init --name my-sat --runtime nodejs --arch clean --yes`.',
})
export class InitCommand extends BaseEvolithCommand {
  private readonly operationTimer = new OperationTimer();

  constructor(
    private readonly catalogLoader: CatalogLoader,
    @Inject('IFileSystem') private readonly fileSystem: IFileSystem,
    promptService: PromptService
  ) {
    super('InitCommand', promptService);
  }

  async executeCommand(
    passedParam: string[],
    options?: InitCommandOptions,
  ): Promise<void> {
    const json = (options?.format as string | undefined) === 'json';
    const startedAt = Date.now();
    const meta = {
      command: 'evolith init',
      executedAt: new Date().toISOString(),
      durationMs: 0,
      correlationId: randomUUID(),
      schemaVersion: OUTPUT_ENVELOPE_SCHEMA_VERSION,
    };

    this.operationTimer.start('InitCommand.executeCommand');

    if (!json) {
      logger.info('Starting project initialization', { options });
    }

    const fs = this.fileSystem;
    const useCase = new InitializeProjectUseCase(fs, this.catalogLoader);

    // Non-interactive (batch) path: a `--config` file or a `--name --yes` fully
    // flagged invocation bypasses all prompts. Otherwise fall back to the wizard.
    const batchInput = await this.resolveBatchInput(options);

    let inputData: Partial<InitProjectInput> | null;
    if (batchInput) {
      inputData = batchInput;
    } else {
      if (!json) {
        console.clear();
        this.promptService.showIntro('Evolith - Project Initialization');
      }
      inputData = await this.promptService.askInitOptions(this.catalogLoader);
    }

    if (!inputData) {
      if (!json) {
        this.promptService.showOutro(chalk.yellow('Inicialización cancelada.'));
      }
      return;
    }

    if (!json) {
      this.promptService.startSpinner('Aplicando estándares de Evolith...');
    }

    const input: InitProjectInput = {
      ...inputData,
      name: inputData.name || (inputData as Record<string, string>).projectName,
    } as InitProjectInput;

    const result = await useCase.execute(input, process.cwd());

    if (!json) {
      this.promptService.stopSpinner();
    }

    const durationMs = this.operationTimer.end();

    if (json) {
      console.log(JSON.stringify(createSuccessEnvelope(result, { ...meta, durationMs }), null, 2));
      return;
    }

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

  /**
   * Build a complete, prompt-free InitProjectInput for batch/CI usage.
   *
   * Precedence:
   *   1. `--config <evolith.setup.json>` — read name/runtime/monorepo/arch/db
   *      (and any other InitProjectInput fields) directly from the file. CLI flags
   *      still override individual fields.
   *   2. `--name` + `--yes` (all flags) — fully flagged invocation, no file needed.
   *
   * Returns `null` when neither batch mode applies, so the caller falls back to
   * the interactive wizard.
   */
  private async resolveBatchInput(
    options?: InitCommandOptions,
  ): Promise<Partial<InitProjectInput> | null> {
    const fromFile = options?.config ? await this.readSetupFile(options.config) : {};

    // Map CLI flags onto canonical InitProjectInput field names.
    const flagOverrides: Partial<InitProjectInput> = {};
    if (options?.name) flagOverrides.name = options.name;
    if (options?.runtime) flagOverrides.runtime = options.runtime;
    if (options?.monorepo) flagOverrides.monorepo = options.monorepo;
    if (options?.arch) flagOverrides.architecture = options.arch;
    if (options?.db) flagOverrides.database = options.db;

    const merged: Partial<InitProjectInput> = { ...fromFile, ...flagOverrides };

    // A config file OR an explicit --yes opts into batch mode.
    const batchRequested = Boolean(options?.config) || Boolean(options?.yes);
    if (!batchRequested) return null;

    // Apply safe defaults so a minimal `--name X --yes` never prompts.
    const resolved: InitProjectInput = {
      name: merged.name ?? '',
      runtime: merged.runtime ?? 'nodejs',
      monorepo: merged.monorepo ?? 'none',
      architecture: merged.architecture ?? 'clean',
      database: merged.database ?? 'postgresql',
      apiProtocol: merged.apiProtocol ?? 'rest',
      ciCd: merged.ciCd ?? 'github-actions',
      observability: merged.observability ?? 'opentelemetry',
      features: merged.features ?? [],
      agents: merged.agents ?? [],
    };

    if (!resolved.name) {
      throw new Error(
        'Non-interactive init requires a project name. Pass --name <project> ' +
          '(with --yes) or set "name" in the --config file.',
      );
    }

    return resolved;
  }

  private async readSetupFile(configPath: string): Promise<Partial<InitProjectInput>> {
    const fsExtra = await import('fs-extra');
    const path = await import('path');
    const resolved = path.resolve(configPath);
    if (!(await fsExtra.pathExists(resolved))) {
      throw new Error(`Config file not found: ${resolved}`);
    }
    const raw = await fsExtra.readFile(resolved, 'utf-8');
    try {
      return JSON.parse(raw) as Partial<InitProjectInput>;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Invalid JSON in config file ${resolved}: ${message}`);
    }
  }

  @Option({
    flags: '-d, --dry-run',
    description: 'Ejecuta en modo simulacro sin alterar archivos',
  })
  parseDryRun(): boolean {
    return true;
  }

  @Option({
    flags: '-n, --name [string]',
    description: 'Nombre del proyecto (modo batch, con --yes o --config)',
  })
  parseName(val: string): string {
    return val;
  }

  @Option({
    flags: '-y, --yes',
    description: 'Modo batch no interactivo: usa flags/--config y valores por defecto, sin prompts',
  })
  parseYes(): boolean {
    return true;
  }

  @Option({
    flags: '-c, --config [string]',
    description: 'Ruta al archivo evolith.setup.json para modo batch (bypass total de prompts)',
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

  @Option({
    flags: '-f, --format <string>',
    description: 'Output format: json (ADR-0073 envelope) or human (default)',
  })
  parseFormat(val: string): string {
    return val;
  }
}
