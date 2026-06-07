import { spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs-extra';

const CLI_PATH = path.join(__dirname, '../../dist/main.js');

async function runCli(args: string[], cwd?: string): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  return new Promise((resolve) => {
    let stdout = '';
    let stderr = '';
    const proc = spawn('node', [CLI_PATH, ...args], { cwd: cwd || process.cwd(), stdio: ['pipe', 'pipe', 'pipe'] });
    proc.stdout!.on('data', (data) => { stdout += data.toString(); });
    proc.stderr!.on('data', (data) => { stderr += data.toString(); });
    proc.on('close', (code) => { resolve({ stdout, stderr, exitCode: code || 0 }); });
    proc.on('error', (err) => { stderr += err.message; resolve({ stdout, stderr, exitCode: 1 }); });
    setTimeout(() => { proc.kill(); resolve({ stdout, stderr, exitCode: 124 }); }, 10000);
  });
}

describe('Drift E2E Tests', () => {
  const testRepoPath = path.join(__dirname, '../fixtures/drift-repo');

  beforeAll(async () => {
    await fs.ensureDir(testRepoPath);
    await fs.writeFile(path.join(testRepoPath, 'evolith.yaml'), `
coreRef:
  version: "1.0.0"
governance:
  version: "1.0"
product:
  name: "drift-repo"
  type: "library"
`);
  });

  afterAll(async () => {
    await fs.remove(testRepoPath);
  });

  it('should show drift help', async () => {
    const result = await runCli(['drift', '--help']);
    expect(result.exitCode).toBe(0);
  });

  it('should run drift detection', async () => {
    const result = await runCli(['drift'], testRepoPath);
    expect(result.exitCode).toBe(0);
  });

  it('should show drift history', async () => {
    const result = await runCli(['drift', '--history'], testRepoPath);
    expect(result.exitCode).toBe(0);
  });

  it('should show drift trend', async () => {
    const result = await runCli(['drift', '--trend'], testRepoPath);
    expect(result.exitCode).toBe(0);
  });

  it('should output JSON format', async () => {
    const result = await runCli(['drift', '--json'], testRepoPath);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toBeDefined();
  });
});
