import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';
import * as fs from 'fs-extra';

const CLI_PATH = path.join(__dirname, '../../dist/main.js');

interface CliResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

async function runCli(args: string[], cwd?: string): Promise<CliResult> {
  return new Promise((resolve) => {
    let stdout = '';
    let stderr = '';

    const proc = spawn('node', [CLI_PATH, ...args], {
      cwd: cwd || process.cwd(),
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    proc.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    proc.stderr.on('data', (data) => {
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
    }, 10000);
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

  describe('validate command', () => {
    it('should pass with valid evolith.yaml', async () => {
      const result = await runCli(['validate', '--satellite', testRepoPath, '--format', 'json']);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('passed');
    });

    it('should fail without evolith.yaml', async () => {
      const emptyRepo = path.join(__dirname, '../fixtures/empty-repo');
      await fs.ensureDir(emptyRepo);
      await fs.remove(path.join(emptyRepo, 'evolith.yaml')).catch(() => {});

      const result = await runCli(['validate', '--satellite', emptyRepo]);

      expect(result.exitCode).toBe(1);
      expect(result.stdout).toContain('failed');
    });

    it('should output JSON when requested', async () => {
      const result = await runCli(['validate', '--satellite', testRepoPath, '--format', 'json']);

      expect(result.exitCode).toBe(0);
      const output = JSON.parse(result.stdout);
      expect(output).toHaveProperty('status');
      expect(output).toHaveProperty('issues');
    });
  });

  describe('help command', () => {
    it('should show available commands', async () => {
      const result = await runCli(['--help']);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('validate');
      expect(result.stdout).toContain('adr');
      expect(result.stdout).toContain('standards');
    });
  });

  describe('adr command', () => {
    it('should list ADRs', async () => {
      const result = await runCli(['adr', '--list']);

      expect(result.exitCode).toBe(0);
    });
  });

  describe('standards command', () => {
    it('should initialize standards', async () => {
      const result = await runCli(['standards', '--init']);

      expect(result.exitCode).toBe(0);
    });
  });
});