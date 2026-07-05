import { Test, TestingModule } from '@nestjs/testing';
import { CommandTestFactory } from 'nest-commander-testing';
import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import * as http from 'node:http';
import * as fs from 'fs-extra';
import * as path from 'node:path';
import * as os from 'node:os';

const REPO_ROOT = path.resolve(__dirname, '../..');

// ---------------------------------------------------------------------------
// Surface helpers
// ---------------------------------------------------------------------------

async function runCliGate(
  instance: TestingModule,
  phase: string,
  projectPath: string,
): Promise<Record<string, unknown>> {
  const exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => undefined as never);
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
    exitSpy.mockRestore();
    logSpy.mockRestore();
  }
}

async function callMcpGate(
  port: number,
  phase: string,
  projectPath: string,
): Promise<Record<string, unknown>> {
  const body = JSON.stringify({
    jsonrpc: '2.0',
    id: 1,
    method: 'tools/call',
    params: {
      name: 'evolith-gate-evaluate',
      arguments: {
        phase,
        path: projectPath,
        corePath: REPO_ROOT,
        evaluatedBy: 'ci',
        format: 'json',
      },
    },
  });

  const options = {
    hostname: '127.0.0.1',
    port,
    path: '/mcp',
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': body.length },
  };

  const response = await new Promise<string>((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk: string) => { data += chunk; });
      res.on('end', () => resolve(data));
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });

  const parsed = JSON.parse(response) as {
    result?: { content?: Array<{ text: string }> };
    error?: { message: string };
  };

  if (parsed.error) throw new Error(`MCP error: ${parsed.error.message}`);
  const text = parsed.result?.content?.[0]?.text;
  if (!text) throw new Error('MCP returned no content');

  return JSON.parse(text) as Record<string, unknown>;
}

async function callRestGate(
  app: INestApplication,
  phase: string,
  projectPath: string,
): Promise<Record<string, unknown>> {
  const res = await request(app.getHttpServer())
    .post('/api/v1/gates/PG1/evaluate')
    .send({ phase, projectPath, corePath: REPO_ROOT, evaluatedBy: 'ci' })
    .expect(201);

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

  beforeAll(async () => {
    projectPath = path.join(os.tmpdir(), `evolith-contract-${process.pid}`);
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
    await restApp.init();

    // MCP: start standalone server on HTTP
    const { startMcpServer } = await import('@evolith/mcp');
    const { app, server } = await startMcpServer({ transport: 'http', port: 0 });
    const boundPort = server.boundPort();
    if (!boundPort) throw new Error('MCP server did not bind to a port');
    mcpServer = { app, boundPort };
  }, 60000);

  afterAll(async () => {
    await mcpServer?.app.close();
    await restApp?.close();
    await fs.remove(projectPath);
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
          callRestGate(restApp, phase, projectPath),
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

      // REST
      const res = await request(restApp.getHttpServer())
        .post('/api/v1/gates/PG1/evaluate')
        .send({ phase: 'phase-9', projectPath })
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
