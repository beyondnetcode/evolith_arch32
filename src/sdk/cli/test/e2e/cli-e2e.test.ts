import { spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs-extra';

const CLI_PATH = path.join(__dirname, '../../dist/main.js');

/**
 * Canonical v1 Satellite manifest (apiVersion evolith.dev/v1), mirroring
 * src/sdk/cli/templates/evolith.yaml.example. `validate`, `sdlc gate-status`
 * and architecture analysis all require this shape — the legacy
 * coreRef/governance/product form is rejected by the schema.
 */
const V1_MANIFEST = (name: string): string =>
  [
    'apiVersion: evolith.dev/v1',
    'kind: Satellite',
    'metadata:',
    `  name: ${name}`,
    '  phase: F1',
    '  architectureVersion: 0.1.0',
    'spec:',
    '  coreRef:',
    '    version: 1.0.0',
    '    rulesetVersion: 1.0.0',
    '  runtime:',
    '    language: TypeScript',
    '    framework: NestJS',
    '    runtimeVersion: "Node 20"',
    '  sdlc:',
    '    currentPhase: 1',
    '    gates: {}',
    '  compliance:',
    '    adrRegistry: []',
    '    localAdrTagEnforcement: documented',
    '    coverageTarget: 80',
    '',
  ].join('\n');

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

describe('CLI E2E Tests', () => {
  const testRepoPath = path.join(__dirname, '../fixtures/test-repo');

  beforeAll(async () => {
    await fs.ensureDir(testRepoPath);
    await fs.writeFile(path.join(testRepoPath, 'evolith.yaml'), V1_MANIFEST('test-repo'));
  });

  afterAll(async () => {
    await fs.remove(testRepoPath);
  });

  describe('help and version', () => {
    it('should show help with available commands', async () => {
      const result = await runCli(['--help']);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('validate');
      expect(result.stdout).toContain('init');
    });

    it('should show version', async () => {
      const result = await runCli(['--version']);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toMatch(/\d+\.\d+\.\d+/);
    });
  });

  describe('validate command', () => {
    it('emits a well-formed ADR-0073 envelope whose exit code reflects the verdict', async () => {
      const result = await runCli(['validate', '--satellite', testRepoPath, '--format', 'json']);

      // --format json prints a single ADR-0073 success envelope to stdout.
      // `success` means "the command ran", not "the satellite passed" — a bare
      // satellite legitimately fails governance (missing build/lock/evidence).
      const envelope = JSON.parse(result.stdout);
      expect(envelope.success).toBe(true);
      expect(['passed', 'warning', 'failed']).toContain(envelope.data.status);
      expect(Array.isArray(envelope.data.issues)).toBe(true);
      expect(typeof envelope.data.rulesChecked).toBe('number');
      // GT-580: validate exits 2 (BLOCKED) on a negative verdict, 0 otherwise.
      // 1 is now reserved for "the command could not reach a verdict at all".
      expect(result.exitCode).toBe(envelope.data.status === 'failed' ? 2 : 0);
    });

    it('should fail without evolith.yaml', async () => {
      const emptyRepo = path.join(__dirname, '../fixtures/empty-repo');
      await fs.ensureDir(emptyRepo);
      await fs.remove(path.join(emptyRepo, 'evolith.yaml')).catch(() => {});

      const result = await runCli(['validate', '--satellite', emptyRepo]);

      // A repo with no evolith.yaml either fails the verdict (2) or cannot be
      // validated at all (1); both are non-zero under the GT-580 taxonomy and
      // which one it is depends on how far resolution gets.
      expect([1, 2]).toContain(result.exitCode);
    });

    it('should output a JSON envelope containing status and issues', async () => {
      const result = await runCli(['validate', '--satellite', testRepoPath, '--format', 'json']);

      const envelope = JSON.parse(result.stdout);
      expect(envelope.success).toBe(true);
      expect(envelope.data).toHaveProperty('status');
      expect(envelope.data).toHaveProperty('issues');
      expect(result.exitCode).toBe(envelope.data.status === 'failed' ? 2 : 0);
    });

    it('runs architecture validation with --arch and exits per verdict', async () => {
      const result = await runCli(['validate', '--satellite', testRepoPath, '--arch', '--format', 'json']);

      const envelope = JSON.parse(result.stdout);
      expect(envelope.success).toBe(true);
      expect(result.exitCode).toBe(envelope.data.status === 'failed' ? 2 : 0);
    });

    it('renders the summary format and runs to completion', async () => {
      const result = await runCli(['validate', '--satellite', testRepoPath, '--format', 'summary']);

      // Human format → verdict isn't machine-readable; assert it produced a
      // report and exited per verdict (0 pass/warn, 2 fail) without crashing.
      expect(result.stdout.length).toBeGreaterThan(0);
      expect([0, 2]).toContain(result.exitCode);
    });
  });

  describe('init command', () => {
    it('should show init help', async () => {
      const result = await runCli(['init', '--help']);

      expect(result.exitCode).toBe(0);
    });
  });

  describe('agents command', () => {
    it('should list agents', async () => {
      const result = await runCli(['agents', 'list']);

      expect(result.exitCode).toBe(0);
    });

    it('should show agents help', async () => {
      const result = await runCli(['agents', '--help']);

      expect(result.exitCode).toBe(0);
    });
  });

  describe('adr command', () => {
    it('should list ADRs', async () => {
      const result = await runCli(['adr', '--list']);

      expect(result.exitCode).toBe(0);
    });

    it('should show ADR help', async () => {
      const result = await runCli(['adr', '--help']);

      expect(result.exitCode).toBe(0);
    });
  });

  describe('standards command', () => {
    it('should initialize standards', async () => {
      const result = await runCli(['standards', '--init']);

      expect(result.exitCode).toBe(0);
    });

    it('should show standards help', async () => {
      const result = await runCli(['standards', '--help']);

      expect(result.exitCode).toBe(0);
    });
  });

  describe('docs command', () => {
    it('should show docs help', async () => {
      const result = await runCli(['docs', '--help']);

      expect(result.exitCode).toBe(0);
    });
  });

  describe('drift command', () => {
    it('should show drift help', async () => {
      const result = await runCli(['drift', '--help']);

      expect(result.exitCode).toBe(0);
    });
  });

  describe('history command', () => {
    it('should show history help', async () => {
      const result = await runCli(['history', '--help']);

      expect(result.exitCode).toBe(0);
    });
  });

  describe('upgrade command', () => {
    it('should show upgrade help', async () => {
      const result = await runCli(['upgrade', '--help']);

      expect(result.exitCode).toBe(0);
    });
  });

  describe('sdlc command', () => {
    it('should show sdlc help', async () => {
      const result = await runCli(['sdlc', '--help']);

      expect(result.exitCode).toBe(0);
    });
  });

  describe('completion command', () => {
    it('should show completion help', async () => {
      const result = await runCli(['completion', '--help']);

      expect(result.exitCode).toBe(0);
    });
  });

  describe('architecture command', () => {
    it('should show architecture help', async () => {
      const result = await runCli(['architecture', '--help']);

      expect(result.exitCode).toBe(0);
    });
  });

  describe('error handling', () => {
    it('should handle unknown command', async () => {
      const result = await runCli(['unknown-command']);

      expect(result.exitCode).toBe(1);
    });

    it('should handle missing required arguments', async () => {
      const result = await runCli(['validate']);

      // `validate` with no satellite either cannot resolve a corpus (1) or
      // reaches a negative verdict (2); both are non-zero under the taxonomy.
      expect([1, 2]).toContain(result.exitCode);
    });
  });

  describe('timeout handling', () => {
    it('should timeout on long-running operations', async () => {
      const result = await runCli(['validate', '--satellite', testRepoPath, '--format', 'json'], testRepoPath, 100);

      expect(result.exitCode).toBe(124);
    });
  });
});

describe('CLI E2E Tests - SDLC commands', () => {
  // `sdlc gate-status` resolves the Core root by walking up from cwd to the
  // nearest `rulesets/` dir, then loads phase gates from
  // <core>/reference/governance/sdlc/gates. The taxonomy refactor (98a20dca)
  // left `reference/` at the repo root while `rulesets/` moved under src/, so no
  // single ancestor of a CLI-tree fixture carries both. We stand up a
  // self-contained mock Core (a marker `rulesets/` dir plus the canonical
  // gate-f*.json copied in at runtime) and run the satellite from inside it, so
  // resolution is deterministic and independent of where the bundled rulesets live.
  const coreDir = path.join(__dirname, '../fixtures/sdlc-core');
  const testRepoPath = path.join(coreDir, 'satellite');
  const repoRoot = path.resolve(__dirname, '../../../../..');

  beforeAll(async () => {
    await fs.ensureDir(path.join(coreDir, 'rulesets'));
    await fs.copy(
      path.join(repoRoot, 'reference', 'governance', 'sdlc', 'gates'),
      path.join(coreDir, 'reference', 'governance', 'sdlc', 'gates'),
    );
    await fs.ensureDir(testRepoPath);
    await fs.writeFile(path.join(testRepoPath, 'evolith.yaml'), V1_MANIFEST('sdlc-repo'));
  });

  afterAll(async () => {
    await fs.remove(coreDir);
  });

  describe('sdlc gate-status', () => {
    it('resolves phase gates and reports status', async () => {
      const result = await runCli(['sdlc', 'gate-status'], testRepoPath);

      expect(result.exitCode).toBe(0);
    });
  });

  describe('sdlc handoff', () => {
    it('should generate handoff manifest', async () => {
      const result = await runCli(['sdlc', 'handoff', '--from', 'phase-0', '--to', 'phase-1'], testRepoPath);

      expect([0, 1]).toContain(result.exitCode);
    });
  });
});

describe('CLI E2E Tests - Deep Architecture Analysis', () => {
  const testRepoPath = path.join(__dirname, '../fixtures/arch-repo');

  beforeAll(async () => {
    await fs.ensureDir(path.join(testRepoPath, 'src', 'domain'));
    await fs.ensureDir(path.join(testRepoPath, 'src', 'infrastructure'));
    await fs.writeFile(path.join(testRepoPath, 'evolith.yaml'), V1_MANIFEST('arch-repo'));
    await fs.writeFile(path.join(testRepoPath, 'src', 'domain', 'user.entity.ts'), `
import { Repository } from '../infrastructure/user.repository';

export class User {
  constructor(public id: string, public name: string) {}
}
`);
    await fs.writeFile(path.join(testRepoPath, 'src', 'infrastructure', 'user.repository.ts'), `
import { Entity } from 'typeorm';

export class UserRepository {
  async findById(id: string) { return null; }
}
`);
  });

  afterAll(async () => {
    await fs.remove(testRepoPath);
  });

  describe('validate with architecture analysis', () => {
    it('should validate architecture with --arch flag', async () => {
      const result = await runCli(['validate', '--satellite', testRepoPath, '--arch']);

      // GT-580: 0 pass, 2 blocked verdict.
      expect([0, 2]).toContain(result.exitCode);
    });

    it('validates without architecture analysis and exits per verdict', async () => {
      const result = await runCli(['validate', '--satellite', testRepoPath, '--format', 'json']);

      const envelope = JSON.parse(result.stdout);
      expect(envelope.success).toBe(true);
      expect(result.exitCode).toBe(envelope.data.status === 'failed' ? 2 : 0);
    });
  });
});
