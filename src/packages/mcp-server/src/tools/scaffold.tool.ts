import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { NxWorkspaceStrategy } from '@beyondnet/evolith-infra-providers';
import type {
  ICommandExecutor,
  CommandResult,
  PlatformCheck,
} from '@beyondnet/evolith-core-domain/domain/interfaces';
import { McpTool } from '../mcp/tool.interface';

const execAsync = promisify(exec);

/**
 * Minimal {@link ICommandExecutor} for the MCP gateway: runs `npx nx` / `npm`
 * via child_process. Only `executeOrThrow` is exercised by
 * {@link NxWorkspaceStrategy}; `execute`/`checkTool` are provided to satisfy the
 * port. Kept here (not in the CLI's richer executor) so the MCP server has no
 * cross-package dependency on the CLI.
 */
class NodeCommandExecutor implements ICommandExecutor {
  async execute(command: string, cwd?: string): Promise<CommandResult> {
    try {
      const { stdout, stderr } = await execAsync(command, { cwd, env: process.env, timeout: 120000 });
      return { success: true, stdout, stderr, exitCode: 0 };
    } catch (err) {
      const e = err as { stdout?: string; stderr?: string; code?: number; message?: string };
      return { success: false, stdout: e.stdout ?? '', stderr: e.stderr ?? e.message ?? '', exitCode: e.code ?? 1 };
    }
  }

  async executeOrThrow(command: string, cwd?: string): Promise<string> {
    const result = await this.execute(command, cwd);
    if (!result.success) {
      throw new Error(`Command failed (exit ${result.exitCode}): ${command}\n${result.stderr}`);
    }
    return result.stdout;
  }

  async checkTool(name: string, versionCommand: string): Promise<PlatformCheck> {
    const result = await this.execute(versionCommand);
    return { name, command: versionCommand, available: result.success, version: result.stdout.trim() || undefined };
  }
}

/** Canonical progressive-axis id → phase number (plus the plain numbers). */
const PROGRESSIVE_PHASE: Record<string, '1' | '2' | '3'> = {
  'modular-monolith': '1',
  'distributed-modules': '2',
  microservices: '3',
  '1': '1',
  '2': '2',
  '3': '3',
};

function toProgressivePhase(value: string): '1' | '2' | '3' | null {
  return PROGRESSIVE_PHASE[value.trim()] ?? null;
}

function parseList(input: unknown): string[] {
  if (Array.isArray(input)) return input.map((d) => String(d).trim()).filter((d) => d.length > 0);
  if (typeof input === 'string') return input.split(',').map((d) => d.trim()).filter((d) => d.length > 0);
  return [];
}

/**
 * `evolith-scaffold` — MCP parity for the CLI `scaffold` command. Drives the
 * SAME {@link NxWorkspaceStrategy} (relocated to infra-providers) the CLI uses,
 * so there is no duplicated generation logic. Writes an Nx workspace under
 * `<path>/src`, so it is mutative/`write`: the dispatch requires
 * `{ apply:true, approvalToken }`. Returns the raw payload — the dispatch wraps
 * it in the ADR-0073 envelope; errors are thrown for the dispatch to map.
 *
 * Progress is routed to stderr; `dryRun` reports the planned nx/npm commands
 * without spawning anything.
 */
export function createScaffoldTools(): McpTool[] {
  return [
    {
      mutative: true,
      scope: 'write' as const,
      schema: {
        name: 'evolith-scaffold',
        description:
          'Scaffold an Evolith satellite along the progressive maturity axis ' +
          '(phase 1 modular-monolith → 2 distributed-modules → 3 microservices). ' +
          'Phase 1 generates a standard SPA; phases 2–3 a Module Federation host + ' +
          'remotes, plus the NestJS Service API, transversal shells and DDD ' +
          'bounded-context libraries. Mutative: writes the Nx workspace under ' +
          '<path>/src. MCP parity with `evolith scaffold`.',
        inputSchema: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'Satellite root under which <path>/src is generated (default: server cwd)' },
            frontend: { type: 'string', description: 'Frontend framework (react, angular, vue)' },
            orm: { type: 'string', description: 'ORM for the persistence layer (prisma, typeorm)' },
            phase: { type: 'string', description: '1|2|3 or a progressive-axis id (modular-monolith, distributed-modules, microservices)' },
            apiName: { type: 'string', description: 'NestJS Service API name. Default: tracker-api.' },
            webAppName: { type: 'string', description: 'Phase-1 SPA name. Default: tracker-web.' },
            hostName: { type: 'string', description: 'Phase 2/3 MF host app name. Default: tracker-host.' },
            remotes: { type: 'array', items: { type: 'string' }, description: 'Phase 2/3 remote names (array or comma-separated string)' },
            domains: { type: 'array', items: { type: 'string' }, description: 'SDLC bounded contexts as domain libraries (array or comma-separated string)' },
            dryRun: { type: 'boolean', description: 'Report the planned commands without writing/spawning', default: false },
          },
          required: ['frontend', 'orm', 'phase'],
        },
      },
      execute: async (args) => {
        const frontendFramework = args.frontend as string | undefined;
        const orm = args.orm as string | undefined;
        const rawPhase = args.phase as string | undefined;
        if (!frontendFramework) throw new Error('frontend is required');
        if (!orm) throw new Error('orm is required');
        if (!rawPhase) throw new Error('phase is required');

        const phase = toProgressivePhase(rawPhase);
        if (!phase) {
          throw new Error(
            `Unknown phase "${rawPhase}". Use 1|2|3 or a progressive-axis id ` +
            `(modular-monolith, distributed-modules, microservices).`,
          );
        }

        const dryRun = Boolean(args.dryRun);
        const apiName = (args.apiName as string) || 'tracker-api';
        const domains = parseList(args.domains);
        const baseDir = (args.path as string) || process.cwd();

        const strategy = new NxWorkspaceStrategy(new NodeCommandExecutor(), {
          progress: (m) => process.stderr.write(`${m}\n`),
          baseDir,
        });
        strategy.setDryRun(dryRun);

        // Replay the CLI scaffold orchestration exactly (same strategy).
        await strategy.installDependencies(frontendFramework, orm);
        await strategy.generateApiApp(apiName);

        if (phase === '1') {
          const webAppName = (args.webAppName as string) || 'tracker-web';
          await strategy.generateStandardWebApp(webAppName, frontendFramework);
        } else {
          const hostName = (args.hostName as string) || 'tracker-host';
          const remotes = parseList(args.remotes);
          await strategy.generateHostApp(hostName, remotes, frontendFramework);
        }

        await strategy.generateLibrary('workflow-engine', 'shell');
        await strategy.generateLibrary('integration-fabric', 'shell');
        await strategy.generateLibrary('tenant-config', 'shell');
        for (const domain of domains) {
          await strategy.generateLibrary(domain, 'domain');
        }
        await strategy.generateLibrary('db-schema', 'shared');
        await strategy.generateLibrary('mocks', 'shared');

        return {
          status: dryRun ? 'dry-run' : 'scaffolded',
          frontendFramework,
          orm,
          phase,
          apiName,
          domains,
          baseDir,
        };
      },
    },
  ];
}
