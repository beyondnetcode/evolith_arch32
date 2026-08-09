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
      // GT-643 — the no-effect phase needs a FRESH command module per
      // invocation. A shared one carries commander's parsed options forward:
      // `agents install` after `agents install --dry-run` still sees
      // dryRun=true and writes nothing, which would silently disarm the
      // contrast case — the half that makes the state oracle falsifiable.
      freshCli: async () => {
        const mod = await CommandTestFactory.createTestingCommand({ imports: [CliAppModule] })
          .overrideProvider(PromptService)
          .useClass(MockPromptService)
          .compile();
        return new CliExecutor(mod);
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
    // La captura es un REGISTRO de lo que corrio: se guarda tal cual, con sus
    // numeros, sus ids y sus marcas de tiempo, que es lo que la hace util para
    // depurar una divergencia. Lo unico que se normaliza aqui son las rutas
    // (abajo), porque son de la maquina y viajan tambien a las TABLAS de
    // argumentos MCP, que el generador imprime literales.
    //
    // Aqui vivia una DENYLIST de campos volatiles que se restaban a mano
    // (`rulesChecked`, luego los arrays de ruleIds, luego `perRuleset`, luego
    // `confidence`), y que solo podia crecer: nombraba la volatilidad por la que
    // ya nos habian mordido, nunca la siguiente. El principio que la motivo
    // sigue vigente y es el que ahora aplica el generador -- un how-to ensena
    // COMO INVOCAR una interfaz, y presentar como dato un numero que cambia
    // entre maquinas desinforma al lector ademas de hacer infalseable el chequeo
    // anti-drift -- pero invertido: gen-howto.ts proyecta el envelope a su FORMA
    // (todos los nombres de campo, el tipo de cada valor) y solo imprime literal
    // lo que esta en su ALLOWLIST. Un campo nuevo ya no puede romper el chequeo.
    //
    // Contexto medido que justifico la inversion: CI generaba `MCP-01` donde
    // esta maquina generaba `MTN-01` -- CONJUNTOS distintos de reglas no
    // ejecutables. Cuales pueden ejecutarse depende de que artefactos de build
    // existan, lo mismo que hace que este repo reporte 227 reglas comprobadas en
    // un arbol de desarrollo y 94 en un checkout limpio.
    const capObj = { mcpTools: await harness.mcp.listTools(), responses };
    let capture = JSON.stringify(capObj, null, 2);
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

  // -----------------------------------------------------------------------
  // GT-643 — the oracle that asks whether a flag with no effect had no effect.
  // -----------------------------------------------------------------------

  it('actually EXERCISED the no-effect contracts (a state oracle that ran over nothing is not an oracle)', () => {
    const ne = run.coverage.noEffect;
    expect(ne.contracts).toBeGreaterThanOrEqual(3);
    expect(ne.checked).toBeGreaterThanOrEqual(ne.contracts);
    expect(ne.skipped).toEqual([]);
  });

  it('every no-effect contract has a CONTRAST case that was observed writing', () => {
    // Without this, a command that stopped working would satisfy every
    // "nothing changed" assertion in the suite, and the tester would be green
    // exactly when the product was most broken.
    const ne = run.coverage.noEffect;
    expect(ne.contrastVerified).toBe(ne.checked);
  });

  it('no declared no-effect flag changed state', () => {
    const violations = run.findings.filter(
      (f) => f.type === 'contract' && f.title.includes('CHANGED STATE'),
    );
    expect(violations.map((f) => `${f.operationId}: ${f.detail}`)).toEqual([]);
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
        //
        // Aqui se comparaban CONJUNTOS de ruleId, porque el documento embebia el
        // envelope literal y un cambio de corpus desplazaba la lista entera.
        // Ahora el generador proyecta el envelope a su FORMA, asi que ningun
        // ruleId llega a la pagina y ese diagnostico seria siempre vacio. El
        // fallo que SI puede ocurrir es otro: un campo que aparece o desaparece.
        // Eso es lo que se nombra.
        const fields = (s: string) =>
          new Set((s.match(/^\s*"[^"]+":/gm) || []).map((m) => m.trim().slice(1, -2)));
        const [ca, cb] = [fields(committed), fields(rendered)];
        const soloCommit = [...ca].filter((x) => !cb.has(x));
        const soloGen = [...cb].filter((x) => !ca.has(x));
        if (soloCommit.length || soloGen.length) {
          console.log(`[howto-drift] ${phaseKey} campos solo en commiteado: ${JSON.stringify(soloCommit)}`);
          console.log(`[howto-drift] ${phaseKey} campos solo en generado  : ${JSON.stringify(soloGen)}`);
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
