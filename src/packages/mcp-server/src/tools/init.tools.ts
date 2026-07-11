import {
  InitializeProjectUseCase,
  type InitProjectInput,
  type InitProjectResult,
} from '@beyondnet/evolith-core-domain/application/services';
import type {
  IFileSystem,
  ICatalogLoader,
  Runtime,
  MonorepoOption,
  ArchitecturePattern,
  ToolCatalog,
  CommandsMatrix,
} from '@beyondnet/evolith-core-domain/domain/interfaces';
import { McpTool } from '../mcp/tool.interface';

/**
 * `evolith-init-batch` — non-interactive (batch/CI) satellite initialization.
 *
 * Parity with the CLI `init --config <json>` / `init --name … --yes` batch path
 * (`InitCommand.resolveBatchInput`), WITHOUT the interactive wizard: no prompts,
 * every field comes from the tool arguments (or safe defaults).
 *
 * The scaffolding logic is NOT reimplemented here — it delegates to the very same
 * core-domain use-case the CLI runs: {@link InitializeProjectUseCase}. This tool is
 * a thin MCP adapter that (1) resolves a complete, prompt-free {@link InitProjectInput}
 * exactly as the CLI does and (2) supplies the two use-case dependencies: an
 * {@link IFileSystem} (injected from the MCP DI container) and an {@link ICatalogLoader}.
 *
 * The catalog loader is an embedded, zero-config adapter over the canonical Evolith
 * runtime catalog (`src/config/runtimes.json`). It is a data/port implementation, not
 * business logic — the published CLI does not bundle the catalog JSON, so the MCP
 * surface carries its own canonical copy to stay self-contained across deployments.
 */

// ---------------------------------------------------------------------------
// Canonical catalog (mirrors src/sdk/cli/src/config/runtimes.json).
// InitializeProjectUseCase.execute() validates input.runtime / monorepo /
// architecture against these lists (by id) before scaffolding.
// ---------------------------------------------------------------------------
const RUNTIMES: Runtime[] = [
  {
    id: 'nodejs',
    name: 'Node.js',
    versions: ['18.x', '20.x LTS', '22.x'],
    defaultVersion: '20.x LTS',
    language: 'JavaScript',
    typeSystem: 'dynamic',
    frameworks: [
      { id: 'nestjs', name: 'NestJS', version: '10.x' },
      { id: 'express', name: 'Express', version: '4.x' },
      { id: 'fastify', name: 'Fastify', version: '4.x' },
    ],
    databases: [
      { id: 'postgresql', name: 'PostgreSQL', orm: 'TypeORM' },
      { id: 'mongodb', name: 'MongoDB', orm: 'Mongoose' },
      { id: 'mysql', name: 'MySQL', orm: 'TypeORM' },
      { id: 'redis', name: 'Redis', type: 'cache' },
    ],
    buildTools: ['npm', 'pnpm', 'yarn'],
    testFrameworks: ['jest', 'vitest', 'mocha'],
    packageManager: 'npm',
  },
  {
    id: 'typescript',
    name: 'TypeScript',
    versions: ['5.x'],
    defaultVersion: '5.x',
    language: 'TypeScript',
    typeSystem: 'static',
    frameworks: [{ id: 'nestjs', name: 'NestJS', version: '10.x' }],
    databases: [
      { id: 'postgresql', name: 'PostgreSQL', orm: 'TypeORM' },
      { id: 'mongodb', name: 'MongoDB', orm: 'Mongoose' },
    ],
    buildTools: ['tsc', 'esbuild', 'swc'],
    testFrameworks: ['jest', 'vitest'],
    packageManager: 'npm',
  },
  {
    id: 'dotnet',
    name: '.NET',
    versions: ['6.x', '7.x', '8.x LTS'],
    defaultVersion: '8.x LTS',
    language: 'C#',
    typeSystem: 'static',
    frameworks: [
      { id: 'aspnetcore', name: 'ASP.NET Core', version: '8.x' },
      { id: 'blazor', name: 'Blazor', version: '8.x' },
      { id: 'MAUI', name: '.NET MAUI', version: '8.x' },
    ],
    databases: [
      { id: 'postgresql', name: 'PostgreSQL', orm: 'EF Core' },
      { id: 'sqlserver', name: 'SQL Server', orm: 'EF Core' },
      { id: 'sqlite', name: 'SQLite', orm: 'EF Core' },
    ],
    buildTools: ['dotnet CLI', 'msbuild'],
    testFrameworks: ['xUnit', 'NUnit', 'MSTest'],
    packageManager: 'nuget',
  },
  {
    id: 'python',
    name: 'Python',
    versions: ['3.11', '3.12', '3.13'],
    defaultVersion: '3.12',
    language: 'Python',
    typeSystem: 'dynamic',
    frameworks: [
      { id: 'fastapi', name: 'FastAPI', version: '0.110.x' },
      { id: 'django', name: 'Django', version: '5.x' },
      { id: 'flask', name: 'Flask', version: '3.x' },
    ],
    databases: [
      { id: 'postgresql', name: 'PostgreSQL', orm: 'SQLAlchemy' },
      { id: 'mysql', name: 'MySQL', orm: 'SQLAlchemy' },
      { id: 'sqlite', name: 'SQLite', orm: 'SQLAlchemy' },
    ],
    buildTools: ['pip', 'poetry', 'uv'],
    testFrameworks: ['pytest', 'unittest'],
    packageManager: 'pip',
  },
];

const MONOREPOS: MonorepoOption[] = [
  { id: 'none', name: 'None', description: 'Monolito simple - un solo paquete', defaults: { structure: 'single', ciStrategy: 'monolithic' } },
  { id: 'nx', name: 'Nx', description: 'Nx - Graph de dependencias, CI optimizado, affected builds', defaults: { structure: 'monorepo', ciStrategy: 'affected', libraryStructure: 'strict' } },
  { id: 'npm-workspaces', name: 'NPM Workspaces', description: 'NPM Workspaces - Simple, flat, sin overhead', defaults: { structure: 'monorepo', ciStrategy: 'monolithic' } },
  { id: 'pnpm-workspaces', name: 'PNPM Workspaces', description: 'PNPM - Efectivo en espacio, fast installs', defaults: { structure: 'monorepo', ciStrategy: 'monolithic' } },
  { id: 'rush', name: 'Rush', description: 'Rush - Enterprise, con policy enforcement', defaults: { structure: 'monorepo', ciStrategy: 'incremental', policyEnforcement: true } },
];

const ARCHITECTURES: ArchitecturePattern[] = [
  { id: 'clean', name: 'Clean Architecture', description: 'Controller → Service → Repository - Capas simples', layers: ['Presentation', 'Application', 'Domain', 'Infrastructure'] },
  { id: 'hexagonal', name: 'Hexagonal (Ports & Adapters)', description: 'Dominio aislado, puertos definidos, adaptadores externos', layers: ['Adapters', 'Ports', 'Domain'] },
  { id: 'ddd', name: 'DDD (Domain-Driven Design)', description: 'Agregados, Value Objects, Domain Events, Bounded Contexts', layers: ['Presentation', 'Application', 'Domain', 'Infrastructure'], dddConcepts: ['Aggregate', 'ValueObject', 'Entity', 'DomainEvent', 'BoundedContext'] },
  { id: 'clean-hex', name: 'Clean + Hexagonal', description: 'Clean con puertos explícitos', layers: ['Adapters', 'Ports', 'Application', 'Domain', 'Infrastructure'] },
  { id: 'hex-ddd', name: 'Hexagonal + DDD', description: 'Puertos con dominio rico', layers: ['Adapters', 'Ports', 'Application', 'Domain', 'Infrastructure'], dddConcepts: ['Aggregate', 'ValueObject', 'Entity', 'DomainEvent'] },
  { id: 'event-driven', name: 'Event-Driven', description: 'Event sourcing, CQRS, messaging patterns', layers: ['Api', 'Commands', 'Events', 'Consumers', 'Storage'], dddConcepts: ['Aggregate', 'DomainEvent', 'Projection', 'ReadModel'] },
];

const DATABASE_DEFAULTS: Record<string, string> = {
  nodejs: 'postgresql',
  typescript: 'postgresql',
  dotnet: 'sqlserver',
  python: 'postgresql',
};

const API_PROTOCOLS: Array<{ id: string; name: string; description: string }> = [
  { id: 'rest', name: 'REST', description: 'HTTP/JSON RESTful API' },
  { id: 'graphql', name: 'GraphQL', description: 'Query language for APIs' },
  { id: 'grpc', name: 'gRPC', description: 'High-performance RPC' },
  { id: 'websocket', name: 'WebSocket', description: 'Real-time bidirectional' },
  { id: 'webhook', name: 'Webhook', description: 'Event-driven callbacks' },
];

/**
 * Embedded {@link ICatalogLoader} over the canonical catalog above. Only the three
 * list getters are exercised by {@link InitializeProjectUseCase.execute}; the
 * remaining members return valid, minimal structures to satisfy the port contract.
 */
class EmbeddedCatalogLoader implements ICatalogLoader {
  loadRuntimeCatalog(): Runtime[] {
    return RUNTIMES;
  }

  loadToolCatalog(): ToolCatalog {
    return { phases: {}, toolMetadata: {} };
  }

  loadCommandsMatrix(): CommandsMatrix {
    return {
      runtimes: {},
      monorepos: {},
      container: { delegated: [], unsupported: [] },
      observability: { scaffold: [], delegated: [] },
    };
  }

  getMonorepoOptions(): MonorepoOption[] {
    return MONOREPOS;
  }

  getArchitecturePatterns(): ArchitecturePattern[] {
    return ARCHITECTURES;
  }

  getDefaultDatabase(runtimeId: string): string {
    return DATABASE_DEFAULTS[runtimeId] || 'postgresql';
  }

  getApiProtocols(): Array<{ id: string; name: string; description: string }> {
    return API_PROTOCOLS;
  }
}

/**
 * Resolve a complete, prompt-free {@link InitProjectInput} from the tool arguments,
 * mirroring `InitCommand.resolveBatchInput`.
 *
 * Precedence (identical to the CLI): an inline `config` object provides the base,
 * individual field arguments override it, then safe defaults fill any gaps. Throws
 * when no project name can be resolved — the same guard the CLI enforces.
 */
function resolveBatchInput(args: Record<string, unknown>): InitProjectInput {
  const fromConfig = (args.config as Partial<InitProjectInput> | undefined) ?? {};

  const str = (v: unknown): string | undefined => (typeof v === 'string' && v.length > 0 ? v : undefined);
  const arr = (v: unknown): string[] | undefined => (Array.isArray(v) ? (v as string[]) : undefined);

  // Map tool arguments onto canonical InitProjectInput field names (CLI: --arch → architecture, --db → database).
  const overrides: Partial<InitProjectInput> = {};
  if (str(args.name)) overrides.name = args.name as string;
  if (str(args.runtime)) overrides.runtime = args.runtime as string;
  if (str(args.monorepo)) overrides.monorepo = args.monorepo as string;
  if (str(args.architecture) ?? str(args.arch)) overrides.architecture = (args.architecture ?? args.arch) as string;
  if (str(args.database) ?? str(args.db)) overrides.database = (args.database ?? args.db) as string;
  if (str(args.apiProtocol)) overrides.apiProtocol = args.apiProtocol as string;
  if (str(args.ciCd)) overrides.ciCd = args.ciCd as string;
  if (str(args.observability)) overrides.observability = args.observability as string;
  if (arr(args.features)) overrides.features = args.features as string[];
  if (arr(args.agents)) overrides.agents = args.agents as string[];

  const merged: Partial<InitProjectInput> = { ...fromConfig, ...overrides };

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
      'Non-interactive init requires a project name. Pass "name" (or set "name" in the "config" object).',
    );
  }

  return resolved;
}

/** Factory for the non-interactive init tool(s). */
export function createInitTools(fs: IFileSystem): McpTool[] {
  const catalogLoader = new EmbeddedCatalogLoader();

  return [
    {
      // Scaffolds a satellite repository on disk — mutative, so the dispatch
      // requires { apply: true, approvalToken }.
      mutative: true,
      scope: 'write' as const,
      schema: {
        name: 'evolith-init-batch',
        description:
          'Non-interactive (batch/CI) initialization of an Evolith satellite. Parity with the CLI ' +
          '`init --config <json>` / `init --name … --yes` path, without prompts. Delegates scaffolding ' +
          'to the core-domain InitializeProjectUseCase. Returns an ADR-0073 output envelope with the ' +
          'initialization result (created artifacts, warnings, errors).',
        inputSchema: {
          type: 'object',
          properties: {
            path: {
              type: 'string',
              description: 'Directory under which the "<name>/" project is scaffolded (defaults to the server cwd).',
            },
            name: {
              type: 'string',
              description: 'Project / satellite name. Required (via this field or the "config" object).',
            },
            runtime: {
              type: 'string',
              description: 'Runtime id: nodejs | typescript | dotnet | python (default nodejs).',
            },
            monorepo: {
              type: 'string',
              description: 'Monorepo id: none | nx | npm-workspaces | pnpm-workspaces | rush (default none).',
            },
            architecture: {
              type: 'string',
              description: 'Architecture id: clean | hexagonal | ddd | clean-hex | hex-ddd | event-driven (default clean).',
            },
            arch: {
              type: 'string',
              description: 'Alias for "architecture" (mirrors the CLI --arch flag).',
            },
            database: {
              type: 'string',
              description: 'Database id (e.g. postgresql | mongodb | sqlserver). Default postgresql.',
            },
            db: {
              type: 'string',
              description: 'Alias for "database" (mirrors the CLI --db flag).',
            },
            apiProtocol: {
              type: 'string',
              description: 'API protocol id: rest | graphql | grpc | websocket | webhook (default rest).',
            },
            ciCd: {
              type: 'string',
              description: 'CI/CD provider (default github-actions).',
            },
            observability: {
              type: 'string',
              description: 'Observability stack (default opentelemetry).',
            },
            features: {
              type: 'array',
              items: { type: 'string' },
              description: 'Optional feature flags to scaffold (e.g. adr, hooks, acl).',
            },
            agents: {
              type: 'array',
              items: { type: 'string' },
              description: 'Optional agent ids to register.',
            },
            config: {
              type: 'object',
              description:
                'Optional inline evolith.setup.json (Partial<InitProjectInput>) used as the base; individual ' +
                'field arguments above override it.',
            },
          },
          required: ['name'],
        },
      },
      execute: async (args: Record<string, unknown>): Promise<unknown> => {
        const cwd = (args.path as string) || process.cwd();
        const input = resolveBatchInput(args);

        const useCase = new InitializeProjectUseCase(fs, catalogLoader);
        const result: InitProjectResult = await useCase.execute(input, cwd);

        // Return the raw payload only — the dispatch wraps it in the canonical
        // ADR-0073 { success, data, meta } envelope. (Do NOT build an envelope here.)
        return { input, result };
      },
    },
  ];
}