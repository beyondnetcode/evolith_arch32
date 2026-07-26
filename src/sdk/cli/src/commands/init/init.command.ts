import { PromptService } from '../../infrastructure/prompts/prompt.service';
import { Command, Option } from 'nest-commander';
import chalk from 'chalk';
import { Inject } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { basename, relative, resolve } from 'node:path';
import { InitializeProjectUseCase, InitProjectInput } from '@beyondnet/evolith-core-domain/application/services';
import { logger, errorReporter, OperationTimer } from '../../infrastructure/observability';
import { Injectable } from '@nestjs/common';
import { BaseEvolithCommand } from '../../infrastructure/cli/base-command';
import { CatalogLoader } from '../../infrastructure/catalog/catalog-loader';
import { IFileSystem } from '@beyondnet/evolith-core-domain/domain/interfaces';
import {
  createErrorEnvelope,
  createSuccessEnvelope,
  OUTPUT_ENVELOPE_SCHEMA_VERSION,
} from '@beyondnet/evolith-core-domain/domain/gate-evidence';
import { DryRunFileSystem, TargetDirectoryFileSystem } from './target-file-system';

interface InitCommandOptions {
  dryRun?: boolean;
  config?: string;
  name?: string;
  dir?: string;
  runtime?: string;
  monorepo?: string;
  arch?: string;
  db?: string;
  yes?: boolean;
  format?: string;
}

/** Where the satellite is scaffolded, and under which project name. */
interface InitTarget {
  /** Absolute directory that will hold `evolith.yaml`. */
  targetDir: string;
  /** True when the target is the current working directory. */
  inPlace: boolean;
}

@Injectable()
@Command({
  name: 'init',
  arguments: '[directory]',
  argsDescription: {
    directory:
      'Directorio destino (por defecto el actual). `evolith init` inicializa aqui; ' +
      '`evolith init my-sat` crea e inicializa ./my-sat',
  },
  description:
    'Inicializa un repositorio satélite de Evolith EN EL DIRECTORIO ACTUAL ' +
    '(o en `[directory]` si se indica). Interactivo solo en TTY; modo batch/CI con ' +
    '`--config <evolith.setup.json>`, `--yes`, `--format json` o stdin no interactivo. ' +
    'Ejemplo: `evolith init --name my-sat --runtime nodejs --arch clean --yes && evolith validate`.',
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

    const target = this.resolveTarget(passedParam, options);

    // Non-interactive (batch) path: a `--config` file, `--yes`, `--format json`
    // or a stdin that is not a TTY bypasses every prompt. Otherwise the wizard.
    const batchInput = await this.resolveBatchInput(options, target);

    let inputData: Partial<InitProjectInput> | null;
    if (batchInput) {
      inputData = batchInput;
    } else {
      console.clear();
      this.promptService.showIntro('Evolith - Project Initialization');
      inputData = await this.promptService.askInitOptions(this.catalogLoader);
    }

    if (!inputData) {
      const durationMs = this.operationTimer.end();
      if (json) {
        process.exitCode = 1;
        console.log(
          JSON.stringify(
            createErrorEnvelope('VALIDATION_FAILED', 'Initialization cancelled', { ...meta, durationMs }),
            null,
            2,
          ),
        );
        return;
      }
      this.promptService.showOutro(chalk.yellow('Inicialización cancelada.'));
      return;
    }

    if (!json) {
      this.promptService.startSpinner('Aplicando estándares de Evolith...');
    }

    const input: InitProjectInput = {
      ...inputData,
      name: inputData.name || (inputData as Record<string, string>).projectName,
    } as InitProjectInput;

    // The use case scaffolds into `${cwd}/${name}`; redirect that root onto the
    // directory the user actually asked for (GT-571) without forking the domain.
    // `--dry-run` swaps the sink, so the flag stops lying now that the default
    // target is the directory the user is standing in.
    const dryRun = Boolean(options?.dryRun);
    const cwd = process.cwd();
    const fs = new TargetDirectoryFileSystem(
      dryRun ? new DryRunFileSystem() : this.fileSystem,
      `${cwd}/${input.name}`,
      target.targetDir,
    );
    const useCase = new InitializeProjectUseCase(fs, this.catalogLoader);

    const result = await useCase.execute(input, cwd);

    if (!json) {
      this.promptService.stopSpinner();
    }

    const durationMs = this.operationTimer.end();
    // Artifacts come back prefixed with the project name because the use case
    // assumes a subdirectory; report them relative to the real target instead.
    const artifacts = result.artifacts.map(a =>
      a.startsWith(`${input.name}/`) ? a.slice(input.name.length + 1) : a,
    );
    const nextSteps = this.buildNextSteps(target);

    if (json) {
      if (!result.success) {
        process.exitCode = 1;
        console.log(
          JSON.stringify(
            createErrorEnvelope('INTERNAL_ERROR', 'Project initialization failed', { ...meta, durationMs }, {
              errors: result.errors,
              warnings: result.warnings,
              targetDir: target.targetDir,
              projectName: input.name,
            }),
            null,
            2,
          ),
        );
        return;
      }
      console.log(
        JSON.stringify(
          createSuccessEnvelope(
            { ...result, artifacts, projectName: input.name, targetDir: target.targetDir, dryRun, nextSteps },
            { ...meta, durationMs },
          ),
          null,
          2,
        ),
      );
      return;
    }

    if (result.success) {
      logger.info('Project initialization completed successfully', {
        projectName: input.name,
        targetDir: target.targetDir,
        artifacts: artifacts.length,
        durationMs,
      });

      this.promptService.showSuccess(
        dryRun ? `✓ Simulacro: ${input.name} NO se ha escrito` : `✓ Satélite ${input.name} inicializado`,
      );
      this.promptService.showInfo(`  Directorio: ${target.targetDir}`);
      this.promptService.showInfo(`  Artifacts creados: ${artifacts.length}`);
      artifacts.forEach(a => this.promptService.showInfo(`    - ${a}`));

      if (result.warnings.length > 0) {
        logger.warn('Initialization completed with warnings', { warnings: result.warnings });
        this.promptService.showWarning('Warnings:');
        result.warnings.forEach(w => this.promptService.showWarning(`  - ${w}`));
      }

      console.log(chalk.cyan(`\nProximos pasos:\n${nextSteps.map((s, i) => `  ${i + 1}. ${s}`).join('\n')}\n`));
    } else {
      errorReporter.report(result.errors, { operation: 'InitializeProjectUseCase.execute' });
      logger.error('Project initialization failed', { errors: result.errors, durationMs });
      this.promptService.showError('✗ Inicialización fallida');
      result.errors.forEach(e => this.promptService.showError(`  - ${e}`));
      errorReporter.printSummary();
      // nest-commander exits 0 unless the exit code is set explicitly: a failed
      // init used to be indistinguishable from a successful one for any script.
      process.exitCode = 1;
    }

    this.promptService.showOutro(result.success ? chalk.green('¡Completado!') : chalk.red('Error'));
  }

  /**
   * Resolve WHERE the satellite is initialized.
   *
   * `evolith init`                -> the current directory (the documented
   *                                  `init && validate` sequence works as written)
   * `evolith init my-sat`         -> ./my-sat
   * `evolith init --dir ./my-sat` -> ./my-sat (flag form, for machine surfaces)
   *
   * `--name` names the PROJECT, never the directory.
   */
  private resolveTarget(passedParam?: string[], options?: InitCommandOptions): InitTarget {
    const explicit = (options?.dir ?? passedParam?.[0] ?? '').trim();
    const cwd = process.cwd();
    const targetDir = resolve(cwd, explicit.length > 0 ? explicit : '.');
    return { targetDir, inPlace: targetDir === resolve(cwd) };
  }

  private buildNextSteps(target: InitTarget): string[] {
    const steps = target.inPlace ? [] : [`cd ${relative(process.cwd(), target.targetDir) || target.targetDir}`];
    return [...steps, 'evolith validate', 'evolith agents install', 'evolith sdlc handoff --from phase-0 --to phase-1'];
  }

  /**
   * True when the invocation must not prompt: no TTY on stdin (CI, a pipe, an
   * agent, a closed stdin) or a machine-readable output format was requested.
   * Prompting there emitted a raw ANSI escape sequence instead of an envelope.
   */
  private isNonInteractive(options?: InitCommandOptions): boolean {
    return options?.format === 'json' || !process.stdin.isTTY;
  }

  /**
   * Build a complete, prompt-free InitProjectInput for batch/CI usage.
   *
   * Precedence:
   *   1. `--config <evolith.setup.json>` — read name/runtime/monorepo/arch/db
   *      (and any other InitProjectInput fields) directly from the file. CLI flags
   *      still override individual fields.
   *   2. `--name` + `--yes` (all flags) — fully flagged invocation, no file needed.
   *   3. A non-interactive invocation (`--format json`, or stdin without a TTY):
   *      prompting there is never right, so batch mode is implied.
   *
   * The project name defaults to the target directory name, the way every other
   * scaffolder does it, so `evolith init --yes` is enough to get a satellite.
   *
   * Returns `null` when none of those applies, so the caller falls back to the
   * interactive wizard.
   */
  private async resolveBatchInput(
    options?: InitCommandOptions,
    target?: InitTarget,
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

    // A config file, an explicit --yes, or an invocation that cannot prompt.
    const batchRequested =
      Boolean(options?.config) || Boolean(options?.yes) || this.isNonInteractive(options);
    if (!batchRequested) return null;

    const defaultName = target ? basename(target.targetDir) : '';

    // Apply safe defaults so a minimal `--name X --yes` never prompts.
    const resolved: InitProjectInput = {
      name: merged.name ?? defaultName,
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
    description:
      'Nombre del PROYECTO (no del directorio). Por defecto, el nombre del directorio destino',
  })
  parseName(val: string): string {
    return val;
  }

  @Option({
    flags: '-D, --dir [string]',
    description:
      'Directorio destino; equivale al argumento posicional [directory]. Por defecto el actual (.)',
  })
  parseDir(val: string): string {
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
