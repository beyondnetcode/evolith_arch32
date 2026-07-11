import * as fs from 'node:fs';
import * as path from 'node:path';
import { Command, Option } from 'nest-commander';
import { randomUUID } from 'node:crypto';
import { BaseEvolithCommand } from '../../infrastructure/cli/base-command';
import { WorkspaceManagerStrategy } from '@beyondnet/evolith-core-domain/application/architecture/workspace-manager.strategy';
import { NxWorkspaceStrategy } from '@beyondnet/evolith-infra-providers';
import { DotnetWorkspaceStrategy } from '../../infrastructure/architecture/dotnet-workspace.strategy';
import { commandExecutor } from '../../infrastructure/cli/command-executor';
import { createSuccessEnvelope, createErrorEnvelope, OUTPUT_ENVELOPE_SCHEMA_VERSION } from '@beyondnet/evolith-core-domain/domain/gate-evidence';
import { toProgressivePhase } from '../../infrastructure/architecture/topology-catalog';

@Command({
  name: 'scaffold',
  description: 'Scaffolds an Evolith satellite along the progressive maturity axis (phase 1 modular-monolith → 2 distributed-modules → 3 microservices). Phases 2–3 are generated as a Module Federation host + remotes.',
})
export class ScaffoldCommand extends BaseEvolithCommand {
  private strategy: WorkspaceManagerStrategy;
  /** When true (--format json), progress goes to stderr so stdout stays a clean envelope. */
  private jsonMode = false;

  constructor() {
    super('ScaffoldCommand');
    this.strategy = new NxWorkspaceStrategy(commandExecutor, {
      // Route step progress to stderr in json mode; stdout is reserved for the
      // single ADR-0073 envelope (matches the CLI's --format json contract).
      progress: (message) =>
        this.jsonMode ? process.stderr.write(`${message}\n`) : this.promptService.showInfo(message),
    });
  }

  async executeCommand(passedParam: string[], options?: Record<string, unknown>): Promise<void> {
    const dryRun = Boolean(options?.dryRun);
    const json = options?.format === 'json';
    this.jsonMode = json;
    const commandId = 'evolith architecture scaffold';
    const startedAt = Date.now();
    const meta = {
      command: commandId,
      executedAt: new Date().toISOString(),
      durationMs: 0,
      correlationId: randomUUID(),
      schemaVersion: OUTPUT_ENVELOPE_SCHEMA_VERSION,
    };

    // GT-455: .NET target. The suite (UMS/Tracker/MMS) is .NET; scaffold a
    // clean/hexagonal ASP.NET Core solution instead of the Node/Nx workspace.
    const runtime = ((options?.runtime as string) || 'nodejs').toLowerCase();
    if (runtime === 'dotnet' || runtime === 'csharp' || runtime === '.net') {
      return this.scaffoldDotnet(options, { dryRun, json, meta, startedAt });
    }

    if (this.strategy.setDryRun) {
      this.strategy.setDryRun(dryRun);
    }

    // Guard: the Nx strategy runs `npm install` / `nx g` in `<cwd>/src`. If that
    // workspace does not exist, the spawn fails deep with a raw `spawn ENOENT`.
    // Fail fast with an actionable message instead. Dry-run doesn't spawn, so skip.
    if (!dryRun) {
      const workspaceError = this.checkWorkspace();
      if (workspaceError) {
        if (json) {
          process.exitCode = 1;
          console.log(JSON.stringify(createErrorEnvelope(
            'NOT_A_SATELLITE',
            workspaceError,
            { ...meta, durationMs: Date.now() - startedAt },
          ), null, 2));
          return;
        }
        throw new Error(workspaceError);
      }
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
        // microservices) and plain 1/2/3.
        const phase = toProgressivePhase(rawPhase);
        if (!phase) {
          console.log(JSON.stringify(createErrorEnvelope(
            'VALIDATION_FAILED',
            `Unknown --phase "${rawPhase}". Use 1|2|3 or a progressive-axis id ` +
            `(modular-monolith, distributed-modules, microservices).`,
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

  /**
   * The Nx strategy operates in `<cwd>/src`. Verify that directory exists and is
   * an Nx workspace before we spawn any `npm`/`nx` process there. Returns an
   * actionable error message, or `undefined` when the workspace is usable.
   */
  private checkWorkspace(): string | undefined {
    const cwd = process.cwd();
    const workspaceDir = path.join(cwd, 'src');
    if (!fs.existsSync(workspaceDir)) {
      return (
        `No workspace found at ${workspaceDir}. Run \`evolith-cli init\` first to ` +
        `scaffold a satellite, then re-run \`evolith-cli architecture scaffold\`.`
      );
    }
    const isNxWorkspace =
      fs.existsSync(path.join(workspaceDir, 'nx.json')) ||
      fs.existsSync(path.join(workspaceDir, 'package.json'));
    if (!isNxWorkspace) {
      return (
        `${workspaceDir} exists but is not an Nx workspace (no nx.json/package.json). ` +
        `Run \`evolith-cli init\` first to scaffold the base workspace.`
      );
    }
    return undefined;
  }

  /**
   * GT-455: generate a .NET satellite (ASP.NET Core, clean/hexagonal modular
   * monolith mirroring UMS) under `src/apps/<api-name>`: a solution with
   * Domain/Application/Infrastructure/Presentation projects + references, plus
   * one class library per `--domains` bounded context. Honors --dry-run and
   * the ADR-0073 JSON envelope.
   */
  private async scaffoldDotnet(
    options: Record<string, unknown> | undefined,
    ctx: {
      dryRun: boolean;
      json: boolean;
      meta: { command: string; executedAt: string; durationMs: number; correlationId: string; schemaVersion: string };
      startedAt: number;
    },
  ): Promise<void> {
    const { dryRun, json, meta, startedAt } = ctx;
    const apiName = (options?.apiName as string) || 'satellite-api';
    const rawPhase = (options?.phase as string) || '1';
    const phase = toProgressivePhase(rawPhase);
    const base = this.toPascalBase(apiName);
    const appDir = path.join(process.cwd(), 'src', 'apps', apiName);

    const domainsOpt = options?.domains;
    const domains: string[] = Array.isArray(domainsOpt)
      ? (domainsOpt as string[])
      : typeof domainsOpt === 'string'
        ? (domainsOpt as string).split(',').map(d => d.trim()).filter(Boolean)
        : [];

    const strategy = new DotnetWorkspaceStrategy(commandExecutor, this.promptService);
    strategy.setDryRun(dryRun);

    try {
      if (!phase) {
        throw new Error(
          `Unknown --phase "${rawPhase}". Use 1|2|3 or a progressive-axis id ` +
          `(modular-monolith, distributed-modules, microservices).`,
        );
      }
      await strategy.ensureAvailable();
      if (!dryRun) {
        fs.mkdirSync(appDir, { recursive: true });
      }
      await strategy.generateSolution(base, appDir);
      for (const context of domains) {
        await strategy.generateDomainContext(base, this.toPascalBase(context), appDir);
      }

      const result = {
        status: dryRun ? 'dry-run' : 'scaffolded',
        runtime: 'dotnet',
        apiName,
        base,
        phase,
        path: `src/apps/${apiName}`,
        projects: ['Domain', 'Application', 'Infrastructure', 'Presentation'],
        contexts: domains.map(d => `${base}.${this.toPascalBase(d)}`),
      };

      if (json) {
        console.log(JSON.stringify(createSuccessEnvelope(result, { ...meta, durationMs: Date.now() - startedAt }), null, 2));
        return;
      }
      this.promptService.showSuccess(`✓ .NET satellite scaffolded at src/apps/${apiName} (${base}.sln)`);
      this.promptService.showInfo(`  Projects: ${base}.Domain, ${base}.Application, ${base}.Infrastructure, ${base}.Presentation`);
      if (result.contexts.length) {
        this.promptService.showInfo(`  Bounded contexts: ${result.contexts.join(', ')}`);
      }
      if (dryRun) {
        this.promptService.showWarning('DRY-RUN: no files were written.');
      }
      this.promptService.showOutro('Completed');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      if (json) {
        process.exitCode = 1;
        console.log(JSON.stringify(createErrorEnvelope('INTERNAL_ERROR', message, { ...meta, durationMs: Date.now() - startedAt }), null, 2));
        return;
      }
      throw error;
    }
  }

  /** Derive a PascalCase namespace root from a satellite/app name (mms-api → Mms). */
  private toPascalBase(name: string): string {
    return name
      .replace(/[-_. ]*(api|web|app|host|service)$/i, '')
      .split(/[-_. ]+/)
      .filter(Boolean)
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join('')
      .replace(/[^A-Za-z0-9]/g, '') || 'Satellite';
  }

  @Option({
    flags: '--runtime [runtime]',
    description: 'Backend runtime: nodejs (default, Nx/React) or dotnet (ASP.NET Core hexagonal, UMS-style)',
  })
  parseRuntime(val: string): string {
    return val;
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
