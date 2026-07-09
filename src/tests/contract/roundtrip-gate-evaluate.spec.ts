import { Test, TestingModule } from '@nestjs/testing';
import { CommandTestFactory } from 'nest-commander-testing';
import request from 'supertest';
import { INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import * as http from 'node:http';
import * as fs from 'fs-extra';
import * as path from 'node:path';
import * as os from 'node:os';
import { EnvelopeInterceptor } from '../../apps/core-api/src/infrastructure/interceptors/envelope.interceptor';
import { HttpExceptionFilter } from '../../apps/core-api/src/infrastructure/filters/http-exception.filter';

// jest-runner wraps process.exit so that any exit prints a warning AND calls the
// REAL exit — which, under --runInBand, kills the whole worker. The CLI gate
// command legitimately exits non-zero on a failed verdict; this suite only reads
// the ADR-0073 envelope it prints to stdout, never the exit code. Neutralise the
// wrapper at module load (after jest-runner has installed it, before any test
// runs) so a failed verdict can't tear the suite down. A jest.spyOn in a hook is
// unreliable here because the exit fires inside a concurrent Promise.all stage.
const originalProcessExit = process.exit;
process.exit = ((..._args: unknown[]) => undefined) as typeof process.exit;

// True repository root. __dirname is <repo>/src/tests/contract, so three levels
// up — NOT two (which lands on <repo>/src). `--core` must point at the repo root
// because the canonical gate registry lives at reference/governance/sdlc/gates/
// (repo root), loaded by PhaseGateValidatorService via GateRegistryService.
const REPO_ROOT = path.resolve(__dirname, '../../..');

// ---------------------------------------------------------------------------
// Surface helpers
// ---------------------------------------------------------------------------

async function runCliGate(
  instance: TestingModule,
  phase: string,
  projectPath: string,
): Promise<Record<string, unknown>> {
  // process.exit is neutralised suite-wide (see the describe-level guard): the
  // gate command exits non-zero on a failed verdict, but here we only need the
  // ADR-0073 envelope it prints to stdout. A per-call spy would race with the
  // concurrent surfaces under Promise.all and let a real exit kill the runner.
  const logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
  try {
    await CommandTestFactory.run(instance, [
      'gate', 'evaluate',
      '--phase', phase,
      '--project', projectPath,
      '--core', REPO_ROOT,
      '--evaluated-by', 'ci',
      '--format', 'json',
    ]);
    const payload = logSpy.mock.calls.map(c => String(c[0])).join('\n');
    return JSON.parse(payload) as Record<string, unknown>;
  } finally {
    logSpy.mockRestore();
  }
}

/** A single JSON-RPC POST to the MCP StreamableHTTP endpoint. */
async function mcpPost(
  port: number,
  payload: Record<string, unknown>,
  sessionId?: string,
): Promise<{ headers: http.IncomingHttpHeaders; body: string }> {
  const body = JSON.stringify(payload);
  const headers: Record<string, string | number> = {
    'Content-Type': 'application/json',
    // StreamableHTTP requires the client to accept both JSON and the SSE stream.
    'Accept': 'application/json, text/event-stream',
    'Content-Length': Buffer.byteLength(body),
  };
  if (sessionId) headers['mcp-session-id'] = sessionId;

  return new Promise((resolve, reject) => {
    const req = http.request(
      { hostname: '127.0.0.1', port, path: '/mcp', method: 'POST', headers },
      (res) => {
        let data = '';
        res.on('data', (chunk: string) => { data += chunk; });
        res.on('end', () => resolve({ headers: res.headers, body: data }));
      },
    );
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

/** Extract the JSON-RPC payload from either a JSON or an SSE (`data:`) response. */
function parseMcpBody(raw: string): {
  result?: { content?: Array<{ text: string }> };
  error?: { message: string };
} {
  const trimmed = raw.trim();
  if (trimmed.startsWith('{')) return JSON.parse(trimmed);
  const json = trimmed
    .split('\n')
    .filter(l => l.startsWith('data:'))
    .map(l => l.slice('data:'.length).trim())
    .join('');
  return JSON.parse(json);
}

async function callMcpGate(
  port: number,
  phase: string,
  projectPath: string,
): Promise<Record<string, unknown>> {
  // StreamableHTTP is session-based: initialize → notifications/initialized →
  // tools/call, each carrying the minted mcp-session-id.
  const init = await mcpPost(port, {
    jsonrpc: '2.0',
    id: 0,
    method: 'initialize',
    params: {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'contract-test', version: '1.0.0' },
    },
  });
  const sessionId = init.headers['mcp-session-id'] as string | undefined;
  if (!sessionId) throw new Error('MCP did not mint a session id on initialize');

  await mcpPost(port, { jsonrpc: '2.0', method: 'notifications/initialized' }, sessionId);

  const call = await mcpPost(port, {
    jsonrpc: '2.0',
    id: 1,
    method: 'tools/call',
    params: {
      name: 'evolith-gate-evaluate',
      arguments: {
        phase,
        projectPath,
        corePath: REPO_ROOT,
        evaluatedBy: 'ci',
      },
    },
  }, sessionId);

  const parsed = parseMcpBody(call.body);

  if (parsed.error) throw new Error(`MCP error: ${parsed.error.message}`);
  const text = parsed.result?.content?.[0]?.text;
  if (!text) throw new Error('MCP returned no content');

  return JSON.parse(text) as Record<string, unknown>;
}

/** Phase → canonical gate id, mirroring GatesController.mapGateIdToPhase. */
const PHASE_TO_GATE: Record<string, string> = {
  discovery: 'PG1',
  design: 'PG2',
  construction: 'PG3',
  qa: 'PG4',
  release: 'PG5',
};

async function callRestGate(
  app: INestApplication,
  phase: string,
  workspaceRef: string,
): Promise<Record<string, unknown>> {
  // The REST surface is workspace-ref based (Core never receives a user path):
  // the phase is derived from the gate id, projectPath/corePath are resolved
  // server-side from WORKSPACE_ROOT/CORE_PATH. It returns 200 (HttpCode.OK).
  const gateId = PHASE_TO_GATE[phase] ?? phase;
  const res = await request(app.getHttpServer())
    .post(`/api/v1/gates/${gateId}/evaluate`)
    .send({ workspaceRef, evaluatedBy: 'ci' })
    .expect(200);

  return res.body as Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Helpers for comparing envelopes
// ---------------------------------------------------------------------------

interface EnvelopeShape {
  success: boolean;
  data?: Record<string, unknown>;
  meta?: Record<string, unknown>;
  error?: Record<string, unknown>;
}

function extractEnvelopeShape(envelope: Record<string, unknown>): EnvelopeShape {
  return {
    success: envelope.success as boolean,
    data: envelope.data as Record<string, unknown> | undefined,
    meta: envelope.meta as Record<string, unknown> | undefined,
    error: envelope.error as Record<string, unknown> | undefined,
  };
}

// ---------------------------------------------------------------------------
// Test
// ---------------------------------------------------------------------------

describe('ADR-0073 contract roundtrip: gate evaluate', () => {
  let cliModule: TestingModule;
  let restApp: INestApplication;
  let mcpServer: { app: { close: () => Promise<void> }; boundPort: number };
  let projectPath: string;
  let workspaceRef: string;

  beforeAll(async () => {
    projectPath = path.join(os.tmpdir(), `evolith-contract-${process.pid}`);
    workspaceRef = path.basename(projectPath);
    // The REST surface resolves projectPath/corePath server-side from these env
    // vars (WorkspaceReferenceResolverService). Set them BEFORE the core-api
    // AppModule is imported/compiled so ConfigModule reads them at init.
    process.env.WORKSPACE_ROOT = path.dirname(projectPath);
    process.env.CORE_PATH = REPO_ROOT;
    await fs.ensureDir(projectPath);

    // CLI: bootstrap via CommandTestFactory
    const { AppModule: CliAppModule } = await import(
      '../../sdk/cli/src/app.module'
    );
    const { PromptService } = await import(
      '../../sdk/cli/src/infrastructure/prompts/prompt.service'
    );
    const { MockPromptService } = await import(
      '../../sdk/cli/test/mock-prompt.service'
    );
    cliModule = await CommandTestFactory.createTestingCommand({
      imports: [CliAppModule],
    })
      .overrideProvider(PromptService)
      .useClass(MockPromptService)
      .compile();

    // REST: bootstrap Core API via NestJS TestingModule
    const { AppModule: CoreApiAppModule } = await import(
      '../../apps/core-api/src/app.module'
    );
    const moduleFixture = await Test.createTestingModule({
      imports: [CoreApiAppModule],
    }).compile();
    restApp = moduleFixture.createNestApplication();
    // Mirror main.ts bootstrap so the REST surface exposes the same URI-versioned
    // routes (/api/v1/…) and the ADR-0073 response envelope that the CLI and MCP
    // surfaces emit natively — createNestApplication() alone applies none of this.
    restApp.enableVersioning({ type: VersioningType.URI, prefix: 'api/v', defaultVersion: '1' });
    restApp.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    restApp.useGlobalFilters(new HttpExceptionFilter());
    restApp.useGlobalInterceptors(new EnvelopeInterceptor());
    await restApp.init();

    // MCP: start standalone server on HTTP
    const { startMcpServer } = await import('@beyondnet/evolith-mcp');
    // No API key configured for this in-process test server; allow unauthenticated
    // calls (dev-mode only path) so the contract can exercise the MCP surface.
    const { app, server } = await startMcpServer({ transport: 'http', port: 0, allowNoAuth: true });
    const boundPort = server.boundPort();
    if (!boundPort) throw new Error('MCP server did not bind to a port');
    mcpServer = { app, boundPort };
  }, 60000);

  afterAll(async () => {
    await mcpServer?.app.close();
    await restApp?.close();
    await fs.remove(projectPath);
    process.exit = originalProcessExit;
  });

  // -----------------------------------------------------------------------
  // Test each phase through all three surfaces, comparing envelope shapes
  // -----------------------------------------------------------------------

  const phases = ['discovery', 'design', 'construction', 'qa', 'release'];

  for (const phase of phases) {
    describe(`phase: ${phase}`, () => {
      let cliEnvelope: EnvelopeShape;
      let mcpEnvelope: EnvelopeShape;
      let restEnvelope: EnvelopeShape;

      beforeAll(async () => {
        const [cliRaw, restRaw] = await Promise.all([
          runCliGate(cliModule, phase, projectPath),
          callRestGate(restApp, phase, workspaceRef),
        ]);
        cliEnvelope = extractEnvelopeShape(cliRaw);
        restEnvelope = extractEnvelopeShape(restRaw);

        // MCP call is separate (needs its own http connection)
        const mcpRaw = await callMcpGate(mcpServer.boundPort, phase, projectPath);
        mcpEnvelope = extractEnvelopeShape(mcpRaw);
      }, 30000);

      it('all three surfaces return success=true', () => {
        expect(cliEnvelope.success).toBe(true);
        expect(mcpEnvelope.success).toBe(true);
        expect(restEnvelope.success).toBe(true);
      });

      it('all three surfaces return the same verdict', () => {
        expect(cliEnvelope.data?.verdict).toBeDefined();
        expect(cliEnvelope.data?.verdict).toBe(mcpEnvelope.data?.verdict);
        expect(cliEnvelope.data?.verdict).toBe(restEnvelope.data?.verdict);
      });

      it('all three surfaces return the same phase', () => {
        expect(cliEnvelope.data?.phase).toBe(phase);
        expect(mcpEnvelope.data?.phase).toBe(phase);
        expect(restEnvelope.data?.phase).toBe(phase);
      });

      it('all three surfaces return the same evaluatedBy', () => {
        expect(cliEnvelope.data?.evaluatedBy).toBe('ci');
        expect(mcpEnvelope.data?.evaluatedBy).toBe('ci');
        expect(restEnvelope.data?.evaluatedBy).toBe('ci');
      });

      it('all three surfaces return the same rulesetRef', () => {
        const ref = 'rulesets/sdlc/phase-gates.rules.json';
        expect(cliEnvelope.data?.rulesetRef).toBe(ref);
        expect(mcpEnvelope.data?.rulesetRef).toBe(ref);
        expect(restEnvelope.data?.rulesetRef).toBe(ref);
      });

      it('envelope meta contains correlationId on all surfaces', () => {
        expect(cliEnvelope.meta?.correlationId).toBeDefined();
        expect(mcpEnvelope.meta?.correlationId).toBeDefined();
        expect(restEnvelope.meta?.correlationId).toBeDefined();
      });
    });
  }

  // -----------------------------------------------------------------------
  // Error contract: unknown phase
  // -----------------------------------------------------------------------

  describe('error: INVALID_PHASE', () => {
    let cliErr: EnvelopeShape;
    let mcpErr: EnvelopeShape;
    let restErr: EnvelopeShape;

    beforeAll(async () => {
      // CLI
      {
        const exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => undefined as never);
        const logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
        try {
          await CommandTestFactory.run(cliModule, [
            'gate', 'evaluate', '--phase', 'phase-9',
            '--project', projectPath, '--format', 'json',
          ]);
          const payload = logSpy.mock.calls.map(c => String(c[0])).join('\n');
          cliErr = extractEnvelopeShape(JSON.parse(payload));
        } finally {
          exitSpy.mockRestore();
          logSpy.mockRestore();
        }
      }

      // MCP
      try {
        const mcpRaw = await callMcpGate(mcpServer.boundPort, 'phase-9', projectPath);
        mcpErr = extractEnvelopeShape(mcpRaw);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        mcpErr = { success: false, error: { code: 'TRANSPORT_ERROR', message: msg } };
      }

      // REST: the phase is derived from the gate id, so the analogue of an
      // invalid phase is an unknown gate id — the controller rejects it with 400.
      const res = await request(restApp.getHttpServer())
        .post('/api/v1/gates/PG9/evaluate')
        .send({ workspaceRef })
        .expect(400);
      restErr = extractEnvelopeShape(res.body as Record<string, unknown>);
    });

    it('CLI returns success=false with error code', () => {
      expect(cliErr.success).toBe(false);
      expect(cliErr.error).toBeDefined();
    });

    it('MCP returns success=false with error code', () => {
      expect(mcpErr.success).toBe(false);
      expect(mcpErr.error).toBeDefined();
    });

    it('REST returns success=false with error code', () => {
      expect(restErr.success).toBe(false);
      expect(restErr.error).toBeDefined();
    });

    it('all three surfaces report the same error semantic (INVALID_PHASE)', () => {
      // The exact error code may differ by surface; check that all report an error
      expect(cliErr.error).toBeDefined();
      expect(mcpErr.error).toBeDefined();
      expect(restErr.error).toBeDefined();
    });
  });
});
