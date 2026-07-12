import { spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs-extra';

const CLI_PATH = path.join(__dirname, '../../dist/main.js');

// -------------------------------------------------------------------------
// CLI envelope smoke test (single surface).
//
// GT-479 reconciliation: this file used to advertise itself as a "Cross-Surface
// Parity" test, but it only ever spawned the CLI binary. Each OperationFixture
// carried a dead `envCommand` field (assigned, never read) that implied a second
// surface which was never exercised, and every envelope assertion was wrapped in
// `if (envelope && envelope.success === …)` with no else — so the suite stayed
// green even when the CLI emitted no parseable ADR-0073 envelope at all (the exact
// GT-452 / GT-474 regression class). The dead field is removed and the envelope
// assertions are now UNCONDITIONAL: a run that does not put a parseable
// `{ success, data | error, meta }` envelope on stdout fails the test.
//
// GT-223 reconciliation: GT-223's "DONE" acceptance criterion claims a shared
// `surface-parity-fixture.ts` that invokes the same operation via CLI binary, MCP
// tool, and REST endpoint and asserts envelope + data equivalence. No such fixture
// exists anywhere in the tree — this file is single-surface. The REAL tri-surface
// equivalence net lives in `src/tests/contract/roundtrip-gate-evaluate.spec.ts`
// and, more broadly, in the cross-surface exploration agent
// (`src/tests/exploration/*`, verified bindings). GT-223's checkbox is inaccurate.
// -------------------------------------------------------------------------

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

/**
 * Unconditional ADR-0073 envelope gate. Fails (with a diagnostic) when stdout is
 * not a parseable `{ success, data | error, meta }` envelope. This is precisely
 * the invariant the old `if (envelope && …)` guards let regress silently.
 */
function assertEnvelopeShape(
  envelope: Record<string, unknown> | null,
  result: CliResult,
): asserts envelope is Record<string, unknown> {
  if (envelope === null) {
    throw new Error(
      'Expected a parseable ADR-0073 envelope on stdout, but stdout was not parseable JSON.\n' +
        `stdout: ${result.stdout.slice(0, 800)}\n` +
        `stderr: ${result.stderr.slice(0, 800)}`,
    );
  }
  expect(envelope).toHaveProperty('success');
  expect(typeof envelope.success).toBe('boolean');
  expect(envelope).toHaveProperty('meta');
  // Every envelope carries EITHER data (success) OR error (failure), never neither.
  if (envelope.success === true) {
    expect(envelope).toHaveProperty('data');
  } else {
    expect(envelope).toHaveProperty('error');
  }
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
  setup?: (dir: string) => Promise<void>;
  teardown?: (dir: string) => Promise<void>;
}

const OPERATIONS: OperationFixture[] = [
  {
    name: 'gate-evaluate',
    command: 'gate evaluate',
    args: ['gate', 'evaluate', '--phase', 'discovery', '--format', 'json'],
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
    args: ['sdlc', 'gate-status', '--format', 'json'],
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

describe('CLI Envelope Smoke Test (ADR-0073, single surface)', () => {
  const testDir = path.join(__dirname, '../fixtures/parity-test');

  beforeAll(async () => {
    await fs.ensureDir(testDir);
  });

  afterAll(async () => {
    await fs.remove(testDir);
  });

  describe('CLI --format json envelope', () => {
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

        it('should emit a parseable ADR-0073 envelope on stdout', async () => {
          const result = await runCli(op.args, opDir);
          const envelope = parseJsonEnvelope(result.stdout);
          // Unconditional: a non-parseable / non-envelope stdout fails here — the
          // exact GT-452 / GT-474 regression the old soft assertion masked.
          assertEnvelopeShape(envelope, result);
        });
      });
    }
  });

  describe('Envelope shape invariants', () => {
    it('validate --format json emits an envelope; success carries a data object', async () => {
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
        assertEnvelopeShape(envelope, result);
        if (envelope.success === true) {
          expect(typeof envelope.data).toBe('object');
        }
      } finally {
        await fs.remove(dir).catch(() => {});
      }
    });

    it('drift --format json emits an envelope; success carries driftDetected + declaredLevel', async () => {
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
        assertEnvelopeShape(envelope, result);
        if (envelope.success === true) {
          const data = envelope.data as Record<string, unknown>;
          expect(data).toHaveProperty('driftDetected');
          expect(data).toHaveProperty('declaredLevel');
        }
      } finally {
        await fs.remove(dir).catch(() => {});
      }
    });

    it('gate evaluate --format json emits an INVALID_PHASE error envelope on an invalid phase', async () => {
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
        // Unconditional: an invalid phase MUST produce a well-formed error envelope.
        assertEnvelopeShape(envelope, result);
        expect(envelope.success).toBe(false);
        assertErrorEnvelopeShape(envelope);
        expect((envelope.error as Record<string, unknown>).code).toBe('INVALID_PHASE');
      } finally {
        await fs.remove(dir).catch(() => {});
      }
    });
  });
});
