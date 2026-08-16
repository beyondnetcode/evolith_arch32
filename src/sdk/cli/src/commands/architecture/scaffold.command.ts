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
import {
  bootstrapNxWorkspace,
  canBootstrapNxWorkspace,
  isNxWorkspace,
  isSatellite,
  nxWorkspaceDir,
  type NxWorkspaceBootstrapResult,
} from './scaffold/nx-workspace-bootstrap';

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

    // GT-626: the Nx strategy runs `npm install` / `nx g` in `<cwd>/src`, so that
    // directory must BE an Nx workspace. `scaffold` now creates it when it is
    // missing (see `nx-workspace-bootstrap.ts` for why this command owns it), and
    // the precondition below stays as strict as before for the case where it
    // cannot: an ambiguous `src/` still earns a fast, clear refusal rather than a
    // crash deep inside Nx. Dry-run doesn't spawn, so it neither writes nor checks.
    let nxWorkspace: NxWorkspaceBootstrapResult | undefined;
    if (!dryRun) {
      nxWorkspace = this.ensureNxWorkspace();
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

        // M10: Validate against allowlists to prevent command injection (CWE-78)
        const ALLOWED_FRONTEND = ['react', 'angular', 'vue'];
        const ALLOWED_ORM = ['prisma', 'typeorm', 'drizzle'];
        if (frontendFramework && !ALLOWED_FRONTEND.includes(frontendFramework)) {
          throw new Error(`Invalid frontend "${frontendFramework}". Allowed: ${ALLOWED_FRONTEND.join(', ')}`);
        }
        if (orm && !ALLOWED_ORM.includes(orm)) {
          throw new Error(`Invalid orm "${orm}". Allowed: ${ALLOWED_ORM.join(', ')}`);
        }

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
          // GT-626: an Nx workspace must never appear out of nowhere. Say whether
          // this run created it, so a machine consumer can tell a scaffold into a
          // pre-existing workspace from one that bootstrapped its own.
          nxWorkspace: nxWorkspace
            ? { action: nxWorkspace.action, files: nxWorkspace.files }
            : { action: 'skipped', files: [] },
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

    if (nxWorkspace?.action === 'created') {
      this.promptService.showInfo(
        `Nx workspace created at ${nxWorkspace.workspaceDir} (${nxWorkspace.files.join(', ')}).`,
      );
    }

    let frontendFramework = options?.frontend as string | undefined;
    if (!frontendFramework) {
      frontendFramework = await this.promptService.select({
        message: 'Which frontend framework will you use for the microfrontends?',
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
        message: 'Which ORM will you use for the shared persistence layer?',
        options: [
          { value: 'prisma', label: 'Prisma' },
          { value: 'typeorm', label: 'TypeORM' },
        ],
      });
    }

    // GT-626: `--phase` was declared, documented, and prompted for
    // UNCONDITIONALLY — so the flag was silently ignored on the human path while
    // `--frontend` and `--orm` right above were honoured. That is what stopped
    // the README quickstart from running non-interactively even once the
    // workspace check was fixed: every flag the user supplied was discarded and
    // the command then refused to prompt on a non-TTY.
    //
    // Every declared flag is now authoritative, with the same `if (!option)`
    // shape already used above, and the phase goes through the SAME
    // `toProgressivePhase` canonicalisation as the JSON path so `1`,
    // `modular-monolith` and the legacy `F1` all mean one thing on both paths.
    let phase = options?.phase ? String(toProgressivePhase(options.phase as string)) : undefined;
    if (!phase) {
      phase = await this.promptService.select({
        message: 'Which phase of the progressive axis is this project in?',
        options: [
          { value: '1', label: 'Fase 1 · modular-monolith (The Lean Foundation, MVP)' },
          { value: '2', label: 'Fase 2 · distributed-modules (Scale & Decoupling, Service Extraction)' },
          { value: '3', label: 'Fase 3 · microservices (North Star, Microservices & Microfrontends)' },
        ],
      });
    }

    const apiName = await this.resolveWithDefault(options?.apiName, {
      message: 'What is the name of the main API (backend)?',
      placeholder: 'tracker-api',
      defaultValue: 'tracker-api',
    });

    let webAppName = '';
    let hostName = '';
    let remotesInput = '';
    let remotes: string[] = [];

    if (phase === '1') {
      webAppName = await this.resolveWithDefault(options?.webAppName, {
        message: 'What is the name of the standard web app (SPA)?',
        placeholder: 'tracker-web',
        defaultValue: 'tracker-web',
      });
    } else {
      hostName = await this.resolveWithDefault(options?.hostName, {
        message: 'What is the name of the host app (main web microfrontend)?',
        placeholder: 'tracker-host',
        defaultValue: 'tracker-host',
      });

      remotesInput = await this.resolveWithDefault(options?.remotes, {
        message: 'Enter the names of the remote microfrontends, comma-separated:',
        placeholder: 'trackerRemoteAgile, trackerRemoteQa',
        defaultValue: 'trackerRemoteAgile, trackerRemoteQa',
      });

      remotes = remotesInput.split(',').map(r => r.trim()).filter(r => r.length > 0);
    }

    // `--domains` accepts the comma-separated form the JSON path already parses.
    const domainsOpt = options?.domains;
    const declaredDomains: string[] = Array.isArray(domainsOpt)
      ? (domainsOpt as string[])
      : typeof domainsOpt === 'string'
        ? domainsOpt.split(',').map((d) => d.trim()).filter(Boolean)
        : [];
    const domains = declaredDomains.length > 0
      ? declaredDomains
      : await this.promptService.multiselect({
          message: 'Select the Evolith SDLC phases this project will implement:',
          options: [
            { value: 'discovery', label: 'Discovery' },
            { value: 'design', label: 'Design' },
            { value: 'construction', label: 'Construction' },
            { value: 'qa', label: 'QA' },
            { value: 'release', label: 'Release' },
          ],
          required: true
        });

    this.promptService.startSpinner('Starting the scaffolding process...');

    // 1. Instalar dependencias
    this.promptService.startSpinner('Installing plugins and base dependencies...');
    await this.strategy.installDependencies(frontendFramework, orm);

    // 2. Generar Backend API
    this.promptService.startSpinner(`Generating the Service API (NestJS) [${apiName}]...`);
    await this.strategy.generateApiApp(apiName);

    // 3. Generar Frontend
    if (phase === '1') {
      this.promptService.startSpinner(`Generating the standard single-page app (${frontendFramework.toUpperCase()}) [${webAppName}]...`);
      await this.strategy.generateStandardWebApp(webAppName, frontendFramework);
    } else {
      this.promptService.startSpinner(`Generating host and remote microfrontends (${frontendFramework.toUpperCase()})...`);
      await this.strategy.generateHostApp(hostName, remotes, frontendFramework);
    }

    // 4. Generar Shells (Kernels Compartidos)
    this.promptService.startSpinner('Generating cross-cutting shells...');
    await this.strategy.generateLibrary('workflow-engine', 'shell');
    await this.strategy.generateLibrary('integration-fabric', 'shell');
    await this.strategy.generateLibrary('tenant-config', 'shell');

    // 5. Generar Dominios (Capas Puras)
    this.promptService.startSpinner('Generating bounded contexts (DDD)...');
    for (const domain of domains) {
      await this.strategy.generateLibrary(domain, 'domain');
    }

    // 6. Generar Shared
    this.promptService.startSpinner('Generating shared repositories...');
    await this.strategy.generateLibrary('db-schema', 'shared');
    await this.strategy.generateLibrary('mocks', 'shared');

    this.promptService.stopSpinner('Architectural scaffolding completed.');
    if (dryRun) {
      this.promptService.showWarning('DRY-RUN mode: nothing was written to disk.');
    } else {
      this.promptService.showSuccess('The whole Evolith topology was generated under ./src.');
    }
    this.promptService.showOutro('Completed');
  }

  /**
   * GT-626: resolve a value that has a DOCUMENTED default (`--help` prints
   * "default: tracker-api" and friends).
   *
   * Order: an explicit flag wins; otherwise ask a human if there is one;
   * otherwise take the documented default. Refusing to run because nobody is
   * there to retype a value we would have defaulted to anyway is friction, not
   * safety — and `init --yes` already sets the precedent that a non-interactive
   * run takes defaults.
   *
   * Values with no sensible default (the frontend framework, the ORM, the SDLC
   * domains) still go through `promptService`, which raises `NonInteractiveError`
   * (exit 3) on a non-TTY. That distinction is the point: exit 3 should mean
   * "this run genuinely needs a decision", never "you did not retype a default".
   */
  private async resolveWithDefault(
    provided: unknown,
    prompt: { message: string; placeholder?: string; defaultValue: string },
  ): Promise<string> {
    const explicit = typeof provided === 'string' ? provided.trim() : '';
    if (explicit) return explicit;
    if (!this.promptService.isInteractive()) return prompt.defaultValue;
    return this.promptService.text(prompt);
  }

  /**
   * GT-626 — make the precondition TRUE instead of merely checking it.
   *
   * `init` and `scaffold` disagreed about the workspace root: `init` scaffolds
   * the satellite AROUND `src/` and leaves it empty, while the Nx strategy runs
   * `npm` and `nx` INSIDE it. Nobody created the workspace, so step 5 of the
   * README quickstart could not follow step 2, and the refusal named
   * `create-nx-workspace` — a step the documented sequence never performs.
   *
   * `scaffold` now creates it, because `scaffold` is the only command that runs
   * `nx`; the full argument for that owner (and against `init` and against
   * shelling out to `create-nx-workspace`) is in `nx-workspace-bootstrap.ts`.
   *
   * This is deliberately NOT the permissive fix. It writes the workspace only
   * where writing it is unambiguous, and `checkWorkspace()` still runs
   * afterwards, unchanged in strictness: if the bootstrap declined, the command
   * still refuses in milliseconds instead of crashing inside Nx after a
   * minutes-long install.
   */
  private ensureNxWorkspace(): NxWorkspaceBootstrapResult | undefined {
    const cwd = process.cwd();
    if (isNxWorkspace(cwd)) {
      return { action: 'already-present', workspaceDir: nxWorkspaceDir(cwd), files: [] };
    }
    if (!canBootstrapNxWorkspace(cwd)) return undefined;
    return bootstrapNxWorkspace(cwd);
  }

  /**
   * GT-626. The Nx strategy runs `npm install` and `npx nx g` INSIDE `<cwd>/src`
   * (`NxWorkspaceStrategy.getTargetDir`), so that directory must really be an Nx
   * workspace.
   *
   * `package.json` alone is NOT proof of one: Nx needs `nx.json`, and without it
   * the generator dies deep inside Nx with `Cannot read properties of null
   * (reading 'useInferencePlugins')` after a minutes-long dependency install.
   * Failing here, in milliseconds, with a sentence a human can act on, is
   * strictly better than failing there.
   *
   * Since `ensureNxWorkspace()` runs first, reaching a failure here means one
   * specific thing: `src/` already carries a `package.json` that is not an Nx
   * workspace, so it belongs to another project and we will not convert it. The
   * message says exactly that, and names a command that actually creates a
   * workspace rather than `init`, which the user has already run.
   */
  private checkWorkspace(): string | undefined {
    const cwd = process.cwd();
    const workspaceDir = path.join(cwd, 'src');

    if (fs.existsSync(path.join(workspaceDir, 'nx.json'))) return undefined;

    if (!isSatellite(cwd)) {
      return (
        `${cwd} is not an Evolith satellite (no evolith.yaml), so \`scaffold\` will ` +
        `not create files here. Run \`evolith init\` first — it declares the ` +
        `satellite, and \`scaffold\` then creates the Nx workspace in ./src itself.`
      );
    }

    return (
      `${workspaceDir} is not an Nx workspace (no nx.json), and the scaffolder ` +
      `runs \`nx\` there. It already contains a package.json, so it belongs to ` +
      `another project and Evolith will not convert it. Either scaffold from a ` +
      `directory whose \`src/\` is free, or turn that one into an Nx workspace ` +
      `yourself (\`npx create-nx-workspace@latest src --preset apps\`) and re-run.`
    );
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

    // GT-580: in a machine format, step progress is a DIAGNOSTIC and belongs on
    // stderr — `promptService.showInfo` writes to stdout, which put prose in
    // front of the envelope and broke `... --format json | jq`. Same treatment the
    // Nx path already gives its progress callback.
    const strategy = new DotnetWorkspaceStrategy(
      commandExecutor,
      json
        ? { showInfo: (message: string) => { process.stderr.write(`${message}\n`); } }
        : this.promptService,
    );
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
    description: 'Frontend framework (react, angular)',
  })
  parseFrontend(val: string): string {
    return val;
  }

  @Option({
    flags: '--orm [orm]',
    description: 'Database ORM (prisma, typeorm)',
  })
  parseOrm(val: string): string {
    return val;
  }

  @Option({
    flags: '-d, --dry-run',
    description: 'Dry run: change nothing on disk',
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
