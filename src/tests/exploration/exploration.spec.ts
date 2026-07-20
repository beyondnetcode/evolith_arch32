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
import { REPO_ROOT, loadCatalog } from './catalog';

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
  let originalCwd: string;
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

    // HERMETICIDAD. Los comandos que no reciben un directorio explicito operan
    // sobre `process.cwd()`. Sin esto, la suite corria contra la RAIZ DEL REPO:
    // `init` scaffoldeaba un `test-project/` ahi (el mismo artefacto que
    // ADR-0118 elimino y que reaparecia solo), y las operaciones que leen estado
    // del proyecto lo encontraban o no segun lo que hubieran dejado corridas
    // ANTERIORES. De ahi que diera 6/6 en una maquina usada y 3 fallos en un
    // checkout limpio: `sdlc-status` y `dora-metrics` reportaban una divergencia
    // CLI/MCP que era un artefacto del entorno, no del producto.
    //
    // El cwd pasa a ser el satelite temporal que la propia suite construye, que
    // es contra lo que dice ejercer. `corePath`/`CORE_PATH` ya se pasan
    // explicitos y `REPO_ROOT` es absoluto, asi que la resolucion del Core no
    // depende del cwd.
    originalCwd = process.cwd();
    process.chdir(projectPath);

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

    // Capture for the derived interface how-to (gen-howto.ts): the MCP tool
    // inputSchemas + the REAL response envelope each surface returned, so the
    // generated docs show requests AND responses that actually ran.
    const responses: Record<string, Record<string, unknown>> = {};
    for (const [opId, results] of Object.entries(run.byOperation)) {
      const perSurface: Record<string, unknown> = {};
      for (const r of results) perSurface[r.surface] = r.envelope;
      responses[opId] = perSurface;
    }
    // Sanitise run-specific data so the generated docs are DETERMINISTIC (the
    // howto-conformance check diffs them byte-for-byte). Value-aware so it
    // catches volatiles by shape regardless of key: any ISO timestamp, any *Ms
    // timing, uuids, and the ephemeral fixture path / workspace name.
    const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;
    const capObj = { mcpTools: await harness.mcp.listTools(), responses };
    let capture = JSON.stringify(capObj, (k, v) => {
      if (k.endsWith('Ms') && typeof v === 'number') return 0;
      if (k === 'correlationId' || k === 'traceId') return '<uuid>';
      if (typeof v === 'string' && ISO.test(v)) return '<timestamp>';
      return v;
    }, 2);
    const wsRef = projectPath.split('/').pop();
    capture = capture.split(projectPath).join('/abs/path/to/your-satellite');
    if (wsRef) capture = capture.split(wsRef).join('your-satellite');
    fs.writeFileSync(path.join(OUT_DIR, 'howto-capture.json'), capture);
  }, 180000);

  afterAll(async () => {
    await mcpServer?.app.close();
    await restApp?.close();
    // Volver ANTES de borrar el directorio: quedarse dentro de una ruta
    // eliminada rompe cualquier resolucion relativa posterior.
    if (originalCwd) process.chdir(originalCwd);
    await fs.remove(projectPath);
    process.exit = originalProcessExit;
  });

  it('discovers every operation in the surface-parity catalog', () => {
    // Derived from the matrix, never hardcoded: a literal count here fails the
    // moment an operation is added, which trains people to ignore this suite.
    // What matters is that discovery is COMPLETE, not that the total is a
    // particular number.
    expect(run.coverage.totalOperations).toBe(loadCatalog().length);
    expect(run.coverage.totalOperations).toBeGreaterThan(0);
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

  it('has NO confirmed cross-surface findings (verified bindings must agree)', () => {
    // A confirmed finding comes from a `verified: true` binding — a proven
    // equivalence — so any divergence there is a real cross-surface bug and must
    // fail the build. Hypothesis findings (unverified bindings) stay informational.
    const confirmed = run.findings.filter((f) => f.confidence === 'confirmed');
    expect(confirmed).toEqual([]);
  });

  it('the generated interface how-to docs are up to date (no drift)', async () => {
    const { PHASES, renderPhase, loadMatrix, loadCapture } = await import('./gen-howto');
    const matrix = loadMatrix();
    const cap = loadCapture(); // .out/howto-capture.json, written in beforeAll
    const stale: string[] = [];
    for (const phaseKey of Object.keys(PHASES)) {
      const docPath = path.join(REPO_ROOT, `reference/core/interfaces/how-to-${phaseKey}.md`);
      const committed = fs.existsSync(docPath) ? fs.readFileSync(docPath, 'utf-8') : '';
      if (committed !== renderPhase(phaseKey, matrix, cap)) stale.push(phaseKey);
    }
    // If this fails, the source of truth (matrix / bindings / options) changed
    // but the docs weren't regenerated. Run:
    //   npx ts-node --transpile-only --project src/tests/exploration/tsconfig.json \
    //     src/tests/exploration/gen-howto.ts all   (after `npm run test:exploration`)
    expect(stale).toEqual([]);
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
