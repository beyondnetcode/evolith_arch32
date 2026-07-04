import { Command, Option } from 'nest-commander';
import { randomUUID } from 'node:crypto';
import { BaseEvolithCommand } from '../../infrastructure/cli/base-command';
import { WorkspaceManagerStrategy } from '@evolith/core-domain/application/architecture/workspace-manager.strategy';
import { NxWorkspaceStrategy } from '../../infrastructure/architecture/nx-workspace.strategy';
import { commandExecutor } from '../../infrastructure/cli/command-executor';
import { createSuccessEnvelope, createErrorEnvelope, OUTPUT_ENVELOPE_SCHEMA_VERSION } from '@evolith/core-domain/domain/gate-evidence';
import { toProgressivePhase } from '../../infrastructure/architecture/topology-catalog';

@Command({
  name: 'scaffold',
  description: 'Scaffolds an Evolith satellite along the progressive maturity axis (phase 1 modular-monolith → 2 distributed-modules → 3 microservices). Phases 2–3 are generated as a Module Federation host + remotes.',
})
export class ScaffoldCommand extends BaseEvolithCommand {
  private strategy: WorkspaceManagerStrategy;

  constructor() {
    super('ScaffoldCommand');
    this.strategy = new NxWorkspaceStrategy(commandExecutor, this.promptService);
  }

  async executeCommand(passedParam: string[], options?: Record<string, unknown>): Promise<void> {
    const dryRun = Boolean(options?.dryRun);
    const json = options?.format === 'json';
    const commandId = 'evolith architecture scaffold';
    const startedAt = Date.now();
    const meta = {
      command: commandId,
      executedAt: new Date().toISOString(),
      durationMs: 0,
      correlationId: randomUUID(),
      schemaVersion: OUTPUT_ENVELOPE_SCHEMA_VERSION,
    };

    if (this.strategy.setDryRun) {
      this.strategy.setDryRun(dryRun);
    }

    if (json) {
      try {
        const frontendFramework = options?.frontend as string;
        const orm = options?.orm as string;
        const rawPhase = options?.phase as string;
        const apiName = (options?.apiName as string) || 'tracker-api';

        if (!frontendFramework || !orm || !rawPhase) {
          console.log(JSON.stringify(createErrorEnvelope(
            'VALIDATION_FAILED',
            'In --format json mode, --frontend, --orm, and --phase are required.',
            { ...meta, durationMs: Date.now() - startedAt },
          ), null, 2));
          process.exit(1);
        }

        // Accept progressive-axis ids (modular-monolith/distributed-modules/
        // microservices) and legacy F1/F2/F3 in addition to plain 1/2/3.
        const phase = toProgressivePhase(rawPhase);
        if (!phase) {
          console.log(JSON.stringify(createErrorEnvelope(
            'VALIDATION_FAILED',
            `Unknown --phase "${rawPhase}". Use 1|2|3, a progressive-axis id ` +
            `(modular-monolith, distributed-modules, microservices) or legacy F1/F2/F3.`,
            { ...meta, durationMs: Date.now() - startedAt },
          ), null, 2));
          process.exit(1);
        }

        await this.strategy.installDependencies(frontendFramework, orm);
        await this.strategy.generateApiApp(apiName);

        if (phase === '1') {
          const webAppName = (options?.webAppName as string) || 'tracker-web';
          await this.strategy.generateStandardWebApp(webAppName, frontendFramework);
        } else {
          const hostName = (options?.hostName as string) || 'tracker-host';
          const remotesInput = (options?.remotes as string) || '';
          const remotes = remotesInput.split(',').map((r: string) => r.trim()).filter((r: string) => r.length > 0);
          await this.strategy.generateHostApp(hostName, remotes, frontendFramework);
        }

        await this.strategy.generateLibrary('workflow-engine', 'shell');
        await this.strategy.generateLibrary('integration-fabric', 'shell');
        await this.strategy.generateLibrary('tenant-config', 'shell');

        const domains = options?.domains as string[] | undefined;
        if (domains) {
          for (const domain of domains) {
            await this.strategy.generateLibrary(domain, 'domain');
          }
        }

        await this.strategy.generateLibrary('db-schema', 'shared');
        await this.strategy.generateLibrary('mocks', 'shared');

        console.log(JSON.stringify(createSuccessEnvelope({
          status: dryRun ? 'dry-run' : 'scaffolded',
          frontendFramework,
          orm,
          phase,
          apiName,
          domains: domains || [],
        }, { ...meta, durationMs: Date.now() - startedAt }), null, 2));
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.log(JSON.stringify(createErrorEnvelope('INTERNAL_ERROR', message, { ...meta, durationMs: Date.now() - startedAt }), null, 2));
        process.exit(1);
      }
      return;
    }

    console.log();
    this.promptService.showIntro('Evolith Architecture Scaffolding');

    let frontendFramework = options?.frontend as string | undefined;
    if (!frontendFramework) {
      frontendFramework = await this.promptService.select({
        message: '¿Qué framework de Frontend utilizarás para los Microfrontends?',
        options: [
          { value: 'react', label: 'React' },
          { value: 'angular', label: 'Angular' },
          { value: 'vue', label: 'Vue 3 (Vite)' },
        ],
      });
    }

    let orm = options?.orm as string | undefined;
    if (!orm) {
      orm = await this.promptService.select({
        message: '¿Qué ORM usarás para la capa de persistencia compartida?',
        options: [
          { value: 'prisma', label: 'Prisma' },
          { value: 'typeorm', label: 'TypeORM' },
        ],
      });
    }

    const phase = await this.promptService.select({
      message: '¿En qué fase del eje progresivo (progressive axis) se encuentra este proyecto?',
      options: [
        { value: '1', label: 'Fase 1 · modular-monolith (The Lean Foundation, MVP)' },
        { value: '2', label: 'Fase 2 · distributed-modules (Scale & Decoupling, Service Extraction)' },
        { value: '3', label: 'Fase 3 · microservices (North Star, Microservices & Microfrontends)' },
      ],
    });

    const apiName = await this.promptService.text({
      message: '¿Cuál será el nombre de la API principal (Backend)?',
      placeholder: 'tracker-api',
      defaultValue: 'tracker-api'
    });

    let webAppName = '';
    let hostName = '';
    let remotesInput = '';
    let remotes: string[] = [];

    if (phase === '1') {
      webAppName = await this.promptService.text({
        message: '¿Cuál será el nombre de la aplicación Web estándar (SPA)?',
        placeholder: 'tracker-web',
        defaultValue: 'tracker-web'
      });
    } else {
      hostName = await this.promptService.text({
        message: '¿Cuál será el nombre de la aplicación Host (Microfrontend Web principal)?',
        placeholder: 'tracker-host',
        defaultValue: 'tracker-host'
      });

      remotesInput = await this.promptService.text({
        message: 'Ingresa los nombres de los Microfrontends Remotos separados por comas:',
        placeholder: 'trackerRemoteAgile, trackerRemoteQa',
        defaultValue: 'trackerRemoteAgile, trackerRemoteQa'
      });

      remotes = remotesInput.split(',').map(r => r.trim()).filter(r => r.length > 0);
    }

    const domains = await this.promptService.multiselect({
      message: 'Selecciona las fases SDLC de Evolith que este proyecto va a implementar:',
      options: [
        { value: 'discovery', label: 'Discovery' },
        { value: 'design', label: 'Design' },
        { value: 'construction', label: 'Construction' },
        { value: 'qa', label: 'QA' },
        { value: 'release', label: 'Release' },
      ],
      required: true
    });

    this.promptService.startSpinner('Iniciando el proceso de andamiaje...');

    // 1. Instalar dependencias
    this.promptService.startSpinner('Instalando plugins y dependencias base...');
    await this.strategy.installDependencies(frontendFramework, orm);

    // 2. Generar Backend API
    this.promptService.startSpinner(`Generando la Service API (NestJS) [${apiName}]...`);
    await this.strategy.generateApiApp(apiName);

    // 3. Generar Frontend
    if (phase === '1') {
      this.promptService.startSpinner(`Generando Single Page App estándar (${frontendFramework.toUpperCase()}) [${webAppName}]...`);
      await this.strategy.generateStandardWebApp(webAppName, frontendFramework);
    } else {
      this.promptService.startSpinner(`Generando Microfrontends Host y Remotes (${frontendFramework.toUpperCase()})...`);
      await this.strategy.generateHostApp(hostName, remotes, frontendFramework);
    }

    // 4. Generar Shells (Kernels Compartidos)
    this.promptService.startSpinner('Generando Shells transversales...');
    await this.strategy.generateLibrary('workflow-engine', 'shell');
    await this.strategy.generateLibrary('integration-fabric', 'shell');
    await this.strategy.generateLibrary('tenant-config', 'shell');

    // 5. Generar Dominios (Capas Puras)
    this.promptService.startSpinner('Generando Bounded Contexts (DDD)...');
    for (const domain of domains) {
      await this.strategy.generateLibrary(domain, 'domain');
    }

    // 6. Generar Shared
    this.promptService.startSpinner('Generando repositorios compartidos...');
    await this.strategy.generateLibrary('db-schema', 'shared');
    await this.strategy.generateLibrary('mocks', 'shared');

    this.promptService.stopSpinner('Andamiaje arquitectónico completado exitosamente.');
    if (dryRun) {
      this.promptService.showWarning('Modo DRY-RUN activado: No se realizaron cambios en el disco.');
    } else {
      this.promptService.showSuccess('Toda la topología Evolith ha sido generada en el directorio ./src.');
    }
    this.promptService.showOutro('Completed');
  }

  @Option({
    flags: '--frontend [framework]',
    description: 'Framework para el frontend (react, angular)',
  })
  parseFrontend(val: string): string {
    return val;
  }

  @Option({
    flags: '--orm [orm]',
    description: 'ORM para base de datos (prisma, typeorm)',
  })
  parseOrm(val: string): string {
    return val;
  }

  @Option({
    flags: '-d, --dry-run',
    description: 'Ejecuta en modo simulacro sin alterar archivos',
  })
  parseDryRun(): boolean {
    return true;
  }

  @Option({
    flags: '-f, --format [string]',
    description: 'Output format: json (ADR-0073 envelope) or human (default)',
  })
  parseFormat(val: string): string {
    return val;
  }

  @Option({
    flags: '--phase [phase]',
    description: 'Progressive-axis phase — 1|2|3 or a canonical id (modular-monolith, distributed-modules, microservices); F1/F2/F3 accepted as legacy. Required with --format json',
  })
  parsePhase(val: string): string {
    return val;
  }

  @Option({
    flags: '--api-name [name]',
    description: 'Backend API name (default: tracker-api)',
  })
  parseApiName(val: string): string {
    return val;
  }

  @Option({
    flags: '--web-app-name [name]',
    description: 'Web app name for phase 1 (default: tracker-web)',
  })
  parseWebAppName(val: string): string {
    return val;
  }

  @Option({
    flags: '--host-name [name]',
    description: 'Host app name for phase 2/3 (default: tracker-host)',
  })
  parseHostName(val: string): string {
    return val;
  }

  @Option({
    flags: '--remotes [remotes]',
    description: 'Comma-separated remote names for phase 2/3',
  })
  parseRemotes(val: string): string {
    return val;
  }

  @Option({
    flags: '--domains [domains]',
    description: 'Comma-separated domain names to generate',
  })
  parseDomains(val: string): string[] {
    return val.split(',').map((d: string) => d.trim()).filter((d: string) => d.length > 0);
  }
}
