import { Test } from '@nestjs/testing';
import { CommandTestFactory } from 'nest-commander-testing';
import { INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import * as fs from 'fs-extra';
import * as path from 'node:path';
import * as os from 'node:os';
import { EnvelopeInterceptor } from '../../apps/core-api/src/infrastructure/interceptors/envelope.interceptor';
import { HttpExceptionFilter } from '../../apps/core-api/src/infrastructure/filters/http-exception.filter';
import { CliExecutor, RestExecutor, McpExecutor } from './executors';
import { runExploration, Harness, RunResult } from './runner';
import { REPO_ROOT } from './catalog';

// jest-runner wraps process.exit and, under --runInBand, a real exit kills the
// worker. The CLI gate/validate/phase commands legitimately exit non-zero on a
// failed verdict; this suite only reads the ADR-0073 envelope they print. Neutralise
// the wrapper at module load (before any test runs). Mirrors the contract suite.
const originalProcessExit = process.exit;
process.exit = ((..._args: unknown[]) => undefined) as typeof process.exit;

// A schema-conformant satellite (evolith.dev/v1), mirroring src/sdk/cli/test-project.
const SATELLITE_YAML = `apiVersion: evolith.dev/v1
kind: Satellite
metadata:
  name: exploration-fixture
  phase: F1
  architectureVersion: 0.1.0
spec:
  coreRef:
    version: 1.0.0
    rulesetVersion: 1.0.0
  runtime:
    language: TypeScript
    framework: Express
    runtimeVersion: "Node 20"
  sdlc:
    currentPhase: 1
    gates: {}
  compliance:
    adrRegistry:
      - core/ADR-0047
    localAdrTagEnforcement: documented
    coverageTarget: 80
`;

describe('Cross-surface exploration agent (F1)', () => {
  let harness: Harness;
  let restApp: INestApplication;
  let mcpServer: { app: { close: () => Promise<void> } };
  let projectPath: string;
  let run: RunResult;
  const OUT_DIR = path.join(REPO_ROOT, 'src/tests/exploration/.out');

  beforeAll(async () => {
    projectPath = path.join(os.tmpdir(), `evolith-exploration-${process.pid}`);
    // The REST surface resolves projectPath/corePath server-side from these env
    // vars. Set them BEFORE the core-api AppModule is imported/compiled.
    process.env.WORKSPACE_ROOT = path.dirname(projectPath);
    process.env.CORE_PATH = REPO_ROOT;
    await fs.ensureDir(projectPath);
    await fs.writeFile(path.join(projectPath, 'evolith.yaml'), SATELLITE_YAML);

    // CLI: bootstrap via CommandTestFactory with the mock prompt service.
    const { AppModule: CliAppModule } = await import('../../sdk/cli/src/app.module');
    const { PromptService } = await import(
      '../../sdk/cli/src/infrastructure/prompts/prompt.service'
    );
    const { MockPromptService } = await import('../../sdk/cli/test/mock-prompt.service');
    const cliModule = await CommandTestFactory.createTestingCommand({
      imports: [CliAppModule],
    })
      .overrideProvider(PromptService)
      .useClass(MockPromptService)
      .compile();

    // REST: bootstrap Core API, mirroring main.ts so routes + envelope match.
    const { AppModule: CoreApiAppModule } = await import('../../apps/core-api/src/app.module');
    const moduleFixture = await Test.createTestingModule({ imports: [CoreApiAppModule] }).compile();
    restApp = moduleFixture.createNestApplication();
    restApp.enableVersioning({ type: VersioningType.URI, prefix: 'api/v', defaultVersion: '1' });
    restApp.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    restApp.useGlobalFilters(new HttpExceptionFilter());
    restApp.useGlobalInterceptors(new EnvelopeInterceptor());
    await restApp.init();

    // MCP: standalone StreamableHTTP server on an ephemeral port.
    const { startMcpServer } = await import('@beyondnet/evolith-mcp');
    const { app, server } = await startMcpServer({ transport: 'http', port: 0, allowNoAuth: true });
    const boundPort = server.boundPort();
    if (!boundPort) throw new Error('MCP server did not bind to a port');
    mcpServer = { app };

    harness = {
      cli: new CliExecutor(cliModule),
      rest: new RestExecutor(restApp),
      mcp: new McpExecutor(boundPort),
      ctx: {
        projectPath,
        workspaceRef: path.basename(projectPath),
        corePath: REPO_ROOT,
      },
    };

    run = await runExploration(harness, OUT_DIR);
  }, 180000);

  afterAll(async () => {
    await mcpServer?.app.close();
    await restApp?.close();
    await fs.remove(projectPath);
    process.exit = originalProcessExit;
  });

  it('discovers the full 49-operation surface-parity catalog', () => {
    expect(run.coverage.totalOperations).toBe(49);
    expect(run.coverage.fullTriangle).toBeGreaterThanOrEqual(5);
  });

  it('executes every bound operation across its surfaces and writes a report', () => {
    expect(run.coverage.boundOperations).toBeGreaterThanOrEqual(1);
    expect(run.coverage.executedSurfaceInvocations).toBeGreaterThan(0);
    expect(fs.existsSync(path.join(OUT_DIR, 'findings.jsonl'))).toBe(true);
    expect(fs.existsSync(path.join(OUT_DIR, 'coverage.json'))).toBe(true);
  });

  it('the verified operation gate-evaluate is consistent across CLI/MCP/REST (regression)', () => {
    const confirmedConsistency = run.findings.filter(
      (f) =>
        f.operationId === 'gate-evaluate' &&
        f.type === 'consistency' &&
        f.confidence === 'confirmed',
    );
    // A confirmed cross-surface divergence on the proven operation is a real regression.
    expect(confirmedConsistency).toEqual([]);
    const results = run.byOperation['gate-evaluate'] || [];
    const withEnvelope = results.filter((r) => r.envelope != null);
    expect(withEnvelope.length).toBe(3);
  });

  it('emits a coverage + findings summary', () => {
    // Surfaced for the console log — this is the tester's report, not an assertion.
    // eslint-disable-next-line no-console
    console.info('[exploration] coverage =', JSON.stringify(run.coverage));
    // eslint-disable-next-line no-console
    console.info('[exploration] findings =', run.findings.length);
    expect(run.coverage.findingsByType).toBeDefined();
  });
});
