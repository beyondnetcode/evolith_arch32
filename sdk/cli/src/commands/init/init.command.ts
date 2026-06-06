import { Command, CommandRunner, Option } from 'nest-commander';
import * as p from '@clack/prompts';
import chalk from 'chalk';
import { getContainer } from '../../core/di/container';
import { catalogLoader } from '../../infrastructure/catalog/catalog-loader';
import { InitializeProjectUseCase, InitProjectInput } from '../../application/services';
import { logger, errorReporter, OperationTimer, commandWatcher } from '../../core/observability';

interface InitCommandOptions {
  dryRun?: boolean;
  config?: string;
  runtime?: string;
  monorepo?: string;
  arch?: string;
  db?: string;
}

@Command({
  name: 'init',
  description: 'Inicializa un repositorio satélite de Evolith con selección interactiva de herramientas',
})
export class InitCommand extends CommandRunner {
  private readonly operationTimer = new OperationTimer();

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

    const catalog = catalogLoader;

    const selection = await p.group({
      projectName: () => p.text({
        message: 'Nombre del proyecto:',
        placeholder: 'my-satellite-repo',
        validate: (value) => {
          if (!value) return 'Por favor ingresa un nombre.';
          if (value.includes(' ')) return 'El nombre no debe contener espacios.';
          if (!/^[a-zA-Z][a-zA-Z0-9-_]*$/.test(value)) {
            return 'El nombre debe empezar con letra y contener solo letras, números, guiones.';
          }
        }
      }),

      runtime: () => {
        const runtimes = catalog.loadRuntimeCatalog();
        return p.select({
          message: 'Selecciona el runtime principal:',
          options: runtimes.map(r => ({
            value: r.id,
            label: `${r.name} (${r.defaultVersion})`,
            hint: r.language,
          })),
          initialValue: 'nodejs',
        });
      },

      monorepo: () => {
        const monorepos = catalog.getMonorepoOptions();
        return p.select({
          message: 'Selecciona la estrategia de monorepo:',
          options: monorepos.map(m => ({
            value: m.id,
            label: m.name,
            hint: m.description,
          })),
          initialValue: 'none',
        });
      },

      architecture: () => {
        const architectures = catalog.getArchitecturePatterns();
        return p.select({
          message: 'Selecciona el patrón arquitectónico:',
          options: architectures.map(a => ({
            value: a.id,
            label: a.name,
            hint: a.description,
          })),
          initialValue: 'clean',
        });
      },

      database: ({ results }) => {
        const runtimes = catalog.loadRuntimeCatalog();
        const runtime = runtimes.find(r => r.id === results.runtime);
        const databases = runtime?.databases || [];
        return p.select({
          message: 'Selecciona el tipo de base de datos:',
          options: databases.map(db => ({
            value: db.id,
            label: db.name,
            hint: db.orm || db.type || '',
          })),
          initialValue: catalog.getDefaultDatabase(results.runtime),
        });
      },

      apiProtocol: () => {
        const protocols = catalog.getApiProtocols();
        return p.select({
          message: 'Selecciona el protocolo de API:',
          options: protocols.map(pr => ({
            value: pr.id,
            label: pr.name,
            hint: pr.description,
          })),
          initialValue: 'rest',
        });
      },

      ciCd: () => p.select({
        message: 'Selecciona la plataforma de CI/CD:',
        options: [
          { value: 'github', label: 'GitHub Actions', hint: 'Primary CI/CD' },
          { value: 'gitlab', label: 'GitLab CI', hint: 'Integrated registry' },
          { value: 'azure', label: 'Azure DevOps', hint: 'Enterprise ALM' },
          { value: 'none', label: 'None', hint: 'Skip CI/CD' },
        ],
        initialValue: 'github',
      }),

      observability: () => p.select({
        message: 'Selecciona el nivel de observabilidad:',
        options: [
          { value: 'otel', label: 'OpenTelemetry (All)', hint: 'Traces + Metrics + Logs' },
          { value: 'otel-traces', label: 'Traces only', hint: 'Distributed tracing' },
          { value: 'minimal', label: 'Minimal', hint: 'Basic logging' },
          { value: 'none', label: 'None', hint: 'Skip observability' },
        ],
        initialValue: 'otel',
      }),

      features: () => p.multiselect({
        message: '¿Qué características base quieres incluir?',
        options: [
          { value: 'otel', label: 'OpenTelemetry', hint: 'Traces + Metrics + Logs' },
          { value: 'acl', label: 'Anti-Corruption Layer', hint: 'Schema validation' },
          { value: 'bilingual', label: 'Bilingual Docs', hint: 'EN + ES docs' },
          { value: 'hooks', label: 'Git Hooks', hint: 'Husky pre-commit' },
          { value: 'adr', label: 'ADR System', hint: 'Architecture Decisions' },
        ],
        required: false,
      }),

      agents: () => p.multiselect({
        message: '¿Qué agentes de Evolith deseas configurar?',
        options: [
          { value: 'bmad', label: 'BMad', hint: 'Recommended' },
          { value: 'architecture', label: 'Architecture', hint: 'Recommended' },
          { value: 'qa', label: 'QA' },
          { value: 'sdlc', label: 'SDLC' },
        ],
        required: false,
      }),

      confirmInit: () => p.confirm({
        message: '¿Comenzar inicialización con las opciones seleccionadas?',
        initialValue: true,
      }),
    }, {
      onCancel: () => {
        p.cancel('Operación cancelada.');
        process.exit(0);
      }
    });

    if (!selection.confirmInit) {
      p.outro(chalk.yellow('Inicialización cancelada.'));
      return;
    }

    const spinner = p.spinner();
    spinner.start('Aplicando estándares de Evolith...');

    const input: InitProjectInput = {
      name: selection.projectName as string,
      runtime: selection.runtime as string,
      monorepo: selection.monorepo as string,
      architecture: selection.architecture as string,
      database: selection.database as string,
      apiProtocol: selection.apiProtocol as string,
      ciCd: selection.ciCd as string,
      observability: selection.observability as string,
      features: (selection.features as string[]) || [],
      agents: (selection.agents as string[]) || [],
    };

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