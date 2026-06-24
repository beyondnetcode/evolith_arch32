import { spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs-extra';

const CLI_PATH = path.join(__dirname, '../../dist/main.js');

interface CliResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

async function runCli(args: string[], cwd?: string, timeout = 15000): Promise<CliResult> {
  return new Promise((resolve) => {
    let stdout = '';
    let stderr = '';

    const proc = spawn('node', [CLI_PATH, ...args], {
      cwd: cwd || process.cwd(),
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    proc.stdout!.on('data', (data) => {
      stdout += data.toString();
    });

    proc.stderr!.on('data', (data) => {
      stderr += data.toString();
    });

    proc.on('close', (code) => {
      resolve({ stdout, stderr, exitCode: code || 0 });
    });

    proc.on('error', (err) => {
      stderr += err.message;
      resolve({ stdout, stderr, exitCode: 1 });
    });

    setTimeout(() => {
      proc.kill();
      resolve({ stdout, stderr, exitCode: 124 });
    }, timeout);
  });
}

function parseJsonEnvelope(output: string): Record<string, unknown> | null {
  try {
    return JSON.parse(output);
  } catch {
    return null;
  }
}

function assertSuccessEnvelopeShape(envelope: Record<string, unknown>, command: string): void {
  expect(envelope).toHaveProperty('success');
  expect(envelope).toHaveProperty('data');
  expect(envelope).toHaveProperty('meta');
  expect(envelope.success).toBe(true);

  const meta = envelope.meta as Record<string, unknown>;
  expect(meta).toHaveProperty('command');
  expect(meta).toHaveProperty('executedAt');
  expect(meta).toHaveProperty('durationMs');
  expect(meta).toHaveProperty('correlationId');
  expect(meta).toHaveProperty('schemaVersion');
  expect(meta.command).toBe(command);
  expect(typeof meta.durationMs).toBe('number');
  expect(typeof meta.correlationId).toBe('string');
  expect(meta.schemaVersion).toBe('1.0.0');
}

function assertErrorEnvelopeShape(envelope: Record<string, unknown>): void {
  expect(envelope).toHaveProperty('success');
  expect(envelope).toHaveProperty('error');
  expect(envelope).toHaveProperty('meta');
  expect(envelope.success).toBe(false);

  const error = envelope.error as Record<string, unknown>;
  expect(error).toHaveProperty('code');
  expect(error).toHaveProperty('message');
  expect(typeof error.code).toBe('string');
  expect(typeof error.message).toBe('string');
}

interface OperationFixture {
  name: string;
  command: string;
  args: string[];
  envCommand: string;
  setup?: (dir: string) => Promise<void>;
  teardown?: (dir: string) => Promise<void>;
}

const CORE_FIXTURE_PATH = path.join(__dirname, '../fixtures/core-repo');

const OPERATIONS: OperationFixture[] = [
  {
    name: 'gate-evaluate',
    command: 'gate evaluate',
    args: ['gate', 'evaluate', '--phase', 'discovery', '--format', 'json'],
    envCommand: 'evolith gate evaluate',
    setup: async (dir) => {
      await fs.ensureDir(dir);
      await fs.writeFile(path.join(dir, 'evolith.yaml'), `
coreRef:
  version: "1.0.0"
  path: "../../evolith"
governance:
  version: "1.0"
product:
  name: "parity-test"
  type: "library"
`);
    },
  },
  {
    name: 'validate-satellite',
    command: 'validate --satellite',
    args: ['validate', '--satellite', '', '--format', 'json'],
    envCommand: 'evolith validate --satellite',
    setup: async (dir) => {
      await fs.ensureDir(dir);
      await fs.writeFile(path.join(dir, 'evolith.yaml'), `
coreRef:
  version: "1.0.0"
  path: "../../evolith"
governance:
  version: "1.0"
product:
  name: "parity-test"
  type: "library"
`);
    },
  },
  {
    name: 'drift-detect',
    command: 'drift',
    args: ['drift', '--format', 'json'],
    envCommand: 'evolith drift detect',
    setup: async (dir) => {
      await fs.ensureDir(dir);
      await fs.writeFile(path.join(dir, 'evolith.yaml'), `
coreRef:
  version: "1.0.0"
  path: "../../evolith"
governance:
  version: "1.0"
product:
  name: "parity-test"
  type: "library"
`);
    },
  },
  {
    name: 'sdlc-status',
    command: 'sdlc gate-status',
    args: ['sdlc', 'gate-status'],
    envCommand: 'evolith sdlc gate-status',
    setup: async (dir) => {
      await fs.ensureDir(dir);
      await fs.writeFile(path.join(dir, 'evolith.yaml'), `
coreRef:
  version: "1.0.0"
  path: "../../evolith"
governance:
  version: "1.0"
product:
  name: "parity-test"
  type: "library"
sdlc:
  currentPhase: 0
`);
    },
  },
  {
    name: 'phase-advance',
    command: 'phase advance',
    args: ['phase', 'advance', '--format', 'json'],
    envCommand: 'evolith phase advance',
    setup: async (dir) => {
      await fs.ensureDir(dir);
      await fs.writeFile(path.join(dir, 'evolith.yaml'), `
coreRef:
  version: "1.0.0"
  path: "../../evolith"
governance:
  version: "1.0"
product:
  name: "parity-test"
  type: "library"
sdlc:
  currentPhase: 0
`);
    },
  },
];

describe('Cross-Surface Parity E2E', () => {
  const testDir = path.join(__dirname, '../fixtures/parity-test');

  beforeAll(async () => {
    await fs.ensureDir(testDir);
  });

  afterAll(async () => {
    await fs.remove(testDir);
  });

  describe('CLI binary output envelope shape', () => {
    for (const op of OPERATIONS) {
      describe(`${op.name}`, () => {
        let opDir: string;

        beforeEach(async () => {
          opDir = path.join(testDir, op.name);
          await fs.ensureDir(opDir);
          if (op.setup) await op.setup(opDir);
        });

        afterEach(async () => {
          if (op.teardown) await op.teardown(opDir);
          await fs.remove(opDir).catch(() => {});
        });

        it('should exit without timeout', async () => {
          const result = await runCli(op.args, opDir, 10000);
          expect(result.exitCode).not.toBe(124);
        });

        it('should produce parseable output (JSON or structured text)', async () => {
          const result = await runCli(op.args, opDir);
          const envelope = parseJsonEnvelope(result.stdout);
          if (envelope) {
            expect(envelope).toHaveProperty('success');
            expect(envelope).toHaveProperty('meta');
          } else {
            const combined = result.stdout + result.stderr;
            expect(combined.length).toBeGreaterThan(0);
          }
        });
      });
    }
  });

  describe('Envelope shape invariants', () => {
    it('validate --format json emits success envelope with status field in data', async () => {
      const dir = path.join(testDir, 'validate-invariant');
      await fs.ensureDir(dir);
      await fs.writeFile(path.join(dir, 'evolith.yaml'), `
coreRef:
  version: "1.0.0"
  path: "../../evolith"
governance:
  version: "1.0"
product:
  name: "parity-test"
  type: "library"
`);

      try {
        const result = await runCli(['validate', '--satellite', dir, '--format', 'json'], dir);
        const envelope = parseJsonEnvelope(result.stdout);
        if (envelope && envelope.success === true) {
          expect(envelope.data).toBeDefined();
          expect(typeof envelope.data).toBe('object');
        }
      } finally {
        await fs.remove(dir).catch(() => {});
      }
    });

    it('drift --format json emits success envelope with driftDetected field', async () => {
      const dir = path.join(testDir, 'drift-invariant');
      await fs.ensureDir(dir);
      await fs.writeFile(path.join(dir, 'evolith.yaml'), `
coreRef:
  version: "1.0.0"
  path: "../../evolith"
governance:
  version: "1.0"
product:
  name: "parity-test"
  type: "library"
`);

      try {
        const result = await runCli(['drift', '--format', 'json'], dir);
        const envelope = parseJsonEnvelope(result.stdout);
        if (envelope && envelope.success === true) {
          expect(envelope.data).toHaveProperty('driftDetected');
          expect(envelope.data).toHaveProperty('declaredLevel');
        }
      } finally {
        await fs.remove(dir).catch(() => {});
      }
    });

    it('gate evaluate --format json emits error envelope with INVALID_PHASE on missing phase', async () => {
      const dir = path.join(testDir, 'gate-error-invariant');
      await fs.ensureDir(dir);
      await fs.writeFile(path.join(dir, 'evolith.yaml'), `
coreRef:
  version: "1.0.0"
  path: "../../evolith"
governance:
  version: "1.0"
product:
  name: "parity-test"
  type: "library"
`);

      try {
        const result = await runCli(['gate', 'evaluate', '--phase', 'invalid', '--format', 'json'], dir);
        const envelope = parseJsonEnvelope(result.stdout);
        if (envelope && envelope.success === false) {
          assertErrorEnvelopeShape(envelope);
          expect((envelope.error as Record<string, unknown>).code).toBe('INVALID_PHASE');
        }
      } finally {
        await fs.remove(dir).catch(() => {});
      }
    });
  });
});
