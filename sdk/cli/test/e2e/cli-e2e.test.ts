import { spawn, ChildProcess } from 'child_process';
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

describe('CLI E2E Tests', () => {
  const testRepoPath = path.join(__dirname, '../fixtures/test-repo');

  beforeAll(async () => {
    await fs.ensureDir(testRepoPath);
    await fs.writeFile(path.join(testRepoPath, 'evolith.yaml'), `
coreRef:
  version: "1.0.0"
  path: "../../evolith"
governance:
  version: "1.0"
product:
  name: "test-repo"
  type: "library"
`);
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
      expect(result.stdout).toContain('mcp');
    });

    it('should show version', async () => {
      const result = await runCli(['mcp', 'version']);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Evolith MCP Server');
    });
  });

  describe('validate command', () => {
    it('should pass with valid evolith.yaml', async () => {
      const result = await runCli(['validate', '--satellite', testRepoPath, '--format', 'json']);

      expect(result.exitCode).toBe(0);
      // Accept 'passed' or 'warning' — SHOULD violations produce warnings, not failures
      expect(result.stdout).toMatch(/"status":\s*"(passed|warning)"/);
    });

    it('should fail without evolith.yaml', async () => {
      const emptyRepo = path.join(__dirname, '../fixtures/empty-repo');
      await fs.ensureDir(emptyRepo);
      await fs.remove(path.join(emptyRepo, 'evolith.yaml')).catch(() => {});

      const result = await runCli(['validate', '--satellite', emptyRepo]);

      expect(result.exitCode).toBe(1);
    });

    it('should output JSON when requested', async () => {
      const result = await runCli(['validate', '--satellite', testRepoPath, '--format', 'json']);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('status');
      expect(result.stdout).toContain('issues');
    });

    it('should validate architecture with --arch flag', async () => {
      const result = await runCli(['validate', '--satellite', testRepoPath, '--arch', 'F1']);

      expect(result.exitCode).toBe(0);
    });

    it('should show summary format', async () => {
      const result = await runCli(['validate', '--satellite', testRepoPath, '--format', 'summary']);

      expect(result.exitCode).toBe(0);
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

      expect(result.exitCode).toBe(1);
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
  const testRepoPath = path.join(__dirname, '../fixtures/sdlc-repo');

  beforeAll(async () => {
    await fs.ensureDir(testRepoPath);
    await fs.writeFile(path.join(testRepoPath, 'evolith.yaml'), `
coreRef:
  version: "1.0.0"
  path: "../../evolith"
governance:
  version: "1.0"
product:
  name: "sdlc-repo"
  type: "library"
sdlc:
  currentPhase: 0
`);
  });

  afterAll(async () => {
    await fs.remove(testRepoPath);
  });

  describe('sdlc gate-status', () => {
    it('should show gate status', async () => {
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
    await fs.writeFile(path.join(testRepoPath, 'evolith.yaml'), `
coreRef:
  version: "1.0.0"
governance:
  version: "1.0"
product:
  name: "arch-repo"
  type: "library"
`);
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
      const result = await runCli(['validate', '--satellite', testRepoPath, '--architecture', '--arch-level', 'F1']);

      expect([0, 1]).toContain(result.exitCode);
    });

    it('should pass without architecture analysis', async () => {
      const result = await runCli(['validate', '--satellite', testRepoPath]);

      expect(result.exitCode).toBe(0);
    });
  });
});
