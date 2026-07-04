import { PromptService } from '../src/infrastructure/prompts/prompt.service';
import { MockPromptService } from './mock-prompt.service';
import { TestingModule } from '@nestjs/testing';
import { CommandTestFactory } from 'nest-commander-testing';
import { AppModule } from '../src/app.module';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';
import * as http from 'http';

// CommandTestFactory.run() returns void. Guard against process.exit so the
// test runner survives commands that exit non-zero (failed gates exit 1).
async function runCommand(instance: TestingModule, args: string[]): Promise<void> {
  const exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => undefined as never);
  try {
    await CommandTestFactory.run(instance, args);
  } catch (_err: unknown) {
    // swallow — assertions are made on captured stdout
  } finally {
    exitSpy.mockRestore();
  }
}

const REPO_ROOT = path.resolve(__dirname, '../../..');
const PHASES = ['discovery', 'design', 'construction', 'qa', 'release'] as const;

function loadValidator(schemaFile: string) {
  const ajv = new Ajv({ allErrors: true, strict: false });
  addFormats(ajv);
  const schema = JSON.parse(
    fs.readFileSync(path.join(REPO_ROOT, 'rulesets', 'schema', schemaFile), 'utf-8'),
  );
  return ajv.compile(schema);
}

describe('Gate Command (e2e) — ADR-0073 contract', () => {
  let commandInstance: TestingModule;
  let projectPath: string;
  let logSpy: jest.SpyInstance;

  const validateEnvelope = loadValidator('output-envelope.schema.json');
  const validateEvidence = loadValidator('gate-evidence.schema.json');

  function capturedJson(): Record<string, unknown> {
    const payload = logSpy.mock.calls.map(c => String(c[0])).join('\n');
    return JSON.parse(payload);
  }

  beforeAll(async () => {
    commandInstance = await CommandTestFactory.createTestingCommand({
      imports: [AppModule],
    }).overrideProvider(PromptService).useClass(MockPromptService).compile();
    projectPath = path.join(os.tmpdir(), `evolith-gate-e2e-${process.pid}`);
    await fs.ensureDir(projectPath);
  });

  afterAll(async () => {
    await fs.remove(projectPath);
  });

  beforeEach(() => {
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
  });

  afterEach(() => {
    logSpy.mockRestore();
  });

  for (const phase of PHASES) {
    it(`returns schema-valid GateEvidence in the envelope for phase '${phase}'`, async () => {
      await runCommand(commandInstance, [
        'gate', 'evaluate',
        '--phase', phase,
        '--project', projectPath,
        '--core', REPO_ROOT,
        '--evaluated-by', 'ci',
        '--format', 'json',
      ]);

      const envelope = capturedJson();
      expect(validateEnvelope(envelope)).toBe(true);
      expect(envelope.success).toBe(true);

      const data = (envelope as { data: Record<string, unknown> }).data;
      expect(validateEvidence(data)).toBe(true);
      expect(data.phase).toBe(phase);
      expect(data.evaluatedBy).toBe('ci');
      expect(data.rulesetRef).toBe('rulesets/sdlc/phase-gates.rules.json');
      expect(data.rulesetVersion).toBe('2.0.0');
      // empty tmp project: gates must fail with actionable violations
      expect(data.verdict).toBe('failed');
      expect((data.violations as unknown[]).length).toBeGreaterThan(0);
    });
  }

  it('echoes opaque context in meta and stays schema-valid', async () => {
    await runCommand(commandInstance, [
      'gate', 'evaluate',
      '--phase', 'design',
      '--project', projectPath,
      '--core', REPO_ROOT,
      '--format', 'json',
      '--initiative', 'INIT-42',
      '--tenant', 'acme',
    ]);

    const envelope = capturedJson();
    expect(validateEnvelope(envelope)).toBe(true);
    const meta = (envelope as { meta: { context?: Record<string, string> } }).meta;
    expect(meta.context).toEqual({ initiative: 'INIT-42', tenant: 'acme', phase: 'design' });
  });

  it('returns an INVALID_PHASE error envelope for an unknown phase', async () => {
    await runCommand(commandInstance, [
      'gate', 'evaluate', '--phase', 'phase-9', '--project', projectPath, '--format', 'json',
    ]);

    const envelope = capturedJson();
    expect(validateEnvelope(envelope)).toBe(true);
    expect(envelope.success).toBe(false);
    expect((envelope as { error: { code: string } }).error.code).toBe('INVALID_PHASE');
  });

  it('returns a VALIDATION_FAILED error envelope for an unknown action', async () => {
    await runCommand(commandInstance, [
      'gate', 'destroy', '--phase', 'design', '--format', 'json',
    ]);

    const envelope = capturedJson();
    expect(validateEnvelope(envelope)).toBe(true);
    expect((envelope as { error: { code: string } }).error.code).toBe('VALIDATION_FAILED');
  });

  it('posts GateEvidence to the provided webhook URL', async () => {
    let capturedBody = '';
    const server = http.createServer((req, res) => {
      let body = '';
      req.on('data', chunk => {
        body += chunk.toString();
      });
      req.on('end', () => {
        capturedBody = body;
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'received' }));
      });
    });

    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', () => {
        resolve();
      });
    });

    const address = server.address() as { port: number };
    const port = address.port;
    const webhookUrl = `http://127.0.0.1:${port}/webhook`;

    await runCommand(commandInstance, [
      'gate', 'evaluate',
      '--phase', 'design',
      '--project', projectPath,
      '--core', REPO_ROOT,
      '--webhook-url', webhookUrl,
    ]);

    server.close();

    // Verify webhook payload
    expect(capturedBody).toBeTruthy();
    const payload = JSON.parse(capturedBody);
    expect(payload.phase).toBe('design');
    expect(payload.verdict).toBe('failed');
    expect(payload.rulesetRef).toBe('rulesets/sdlc/phase-gates.rules.json');
    expect(payload.gateId).toBeTruthy();
  });
});
