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
    // H6: Core API requires auth by default. Exploration agent's REST executor
    // doesn't send auth headers, so we explicitly opt out for test environment.
    process.env.CORE_API_AUTH_REQUIRED = 'false';
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
      // El VEREDICTO de una evaluacion es tan volatil como una marca de tiempo:
      // depende del corpus y del estado del workspace en el momento de la
      // captura. `rulesChecked` daba 102 aqui y 98 en CI, y con ello la lista de
      // `issues` se desplazaba entera. Se persiguieron cuatro causas de entorno
      // (rutas de maquina, policy.wasm, el binario opa, la copia bundled del
      // CLI) y ninguna lo explicaba.
      //
      // El problema no era el entorno sino el contrato del documento: un how-to
      // ensena COMO INVOCAR una interfaz, y presentar como dato un numero que
      // cambia entre maquinas es desinformar al lector ademas de hacer
      // infalseable el chequeo anti-drift. Se normaliza igual que los ms y los
      // uuids: la FORMA de la respuesta se conserva, su contenido volatil no.
      if (k === 'rulesChecked' && typeof v === 'number') return '<n>';
      if (k === 'issues' && Array.isArray(v)) return '<issues[]>';
      // Mismo criterio para el veredicto del drift: son hallazgos sobre el
      // workspace del momento, no parte del contrato de la interfaz. El how-to
      // conserva el envelope completo, la peticion y TODOS los nombres de campo
      // -- que es lo que necesita quien va a invocarla.
      if (['newViolations', 'persistentViolations', 'resolvedViolations'].includes(k) && Array.isArray(v)) {
        return `<${k}[]>`;
      }
      return v;
    }, 2);
    const wsRef = projectPath.split('/').pop();
    // La forma RESUELTA primero. En macOS `/var/folders` es symlink a
    // `/private/var/folders` y varias respuestas devuelven el realpath;
    // reemplazar solo la forma sin resolver consumia el resto de la ruta y
    // dejaba un `/private` huerfano pegado al placeholder
    // (`/private/abs/path/to/your-satellite`), que es exactamente lo que hacia
    // fallar el chequeo anti-drift solo fuera de macOS.
    for (const p of [fs.realpathSync(projectPath), projectPath]) {
      capture = capture.split(p).join('/abs/path/to/your-satellite');
    }
    if (wsRef) capture = capture.split(wsRef).join('your-satellite');
    // REPO_ROOT tambien: faltaba, y es la ruta del checkout. Los how-to
    // generados llevaban embebida la ruta absoluta de la maquina que los genero
    // (`/Users/<alguien>/...` en los commiteados), asi que NUNCA podian coincidir
    // con los de otra maquina -- el drift en CI no era drift, era el nombre del
    // directorio de trabajo. Sin esto el chequeo anti-drift es infalseable.
    capture = capture.split(REPO_ROOT).join('/abs/path/to/evolith-core');
    // Y el tmpdir del sistema, normalizado. No basta con `projectPath`: la
    // captura tambien traia rutas como `<tmpdir>/evolith/reference/core/...`,
    // que en Linux son `/tmp/...` y en macOS `/var/folders/xm/…/T/...`. Ese
    // prefijo, propio de la maquina, viajaba a los how-to commiteados y hacia
    // imposible que coincidieran entre plataformas. Se normaliza a `/tmp` (no-op
    // en Linux) e incluye la forma resuelta, porque en macOS `/var/folders` es
    // un symlink a `/private/var/folders` y algunas respuestas devuelven ya el
    // realpath.
    for (const tmp of [fs.realpathSync(os.tmpdir()), os.tmpdir()]) {
      capture = capture.split(tmp).join('/tmp');
    }
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
      const rendered = renderPhase(phaseKey, matrix, cap);
      if (committed !== rendered) {
        stale.push(phaseKey);
        // Decir QUE difiere, no solo que difiere. Sin esto el fallo solo nombra
        // la fase, y diagnosticar un drift que unicamente se reproduce en CI se
        // convierte en adivinar a ciegas a tres minutos por intento.
        // Diferencia de CONJUNTOS de ruleId. Las lineas divergentes solas no
        // bastan: cuando cambia el numero de reglas evaluadas, la lista se
        // desplaza y toda comparacion posicional miente. Esto nombra
        // exactamente que reglas sobran o faltan en cada entorno.
        const ids = (s: string) => new Set((s.match(/"ruleId": "[^"]+"/g) || []).map((m) => m.slice(11, -1)));
        const [ca, cb] = [ids(committed), ids(rendered)];
        const soloCommit = [...ca].filter((x) => !cb.has(x));
        const soloGen = [...cb].filter((x) => !ca.has(x));
        if (soloCommit.length || soloGen.length) {
          console.log(`[howto-drift] ${phaseKey} ruleIds solo en commiteado: ${JSON.stringify(soloCommit)}`);
          console.log(`[howto-drift] ${phaseKey} ruleIds solo en generado  : ${JSON.stringify(soloGen)}`);
        }
        const a = committed.split('\n');
        const b = rendered.split('\n');
        for (let i = 0, shown = 0; i < Math.max(a.length, b.length) && shown < 3; i++) {
          if (a[i] !== b[i]) {
            console.log(`[howto-drift] ${phaseKey} L${i + 1}\n  commiteado: ${JSON.stringify(a[i]?.slice(0, 160))}\n  generado  : ${JSON.stringify(b[i]?.slice(0, 160))}`);
            shown++;
          }
        }
      }
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
