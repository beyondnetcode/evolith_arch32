import { execSync } from 'child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';

const CLI_BIN = path.resolve(__dirname, '../../dist/main.js');
const CLI_BUILT = fs.existsSync(CLI_BIN);

function runCli(args: string): { stdout: string; stderr: string; exitCode: number } {
  try {
    const stdout = execSync(`node "${CLI_BIN}" ${args}`, { encoding: 'utf8', timeout: 15000 });
    return { stdout, stderr: '', exitCode: 0 };
  } catch (err: unknown) {
    const e = err as { stdout?: string; stderr?: string; status?: number };
    return { stdout: e.stdout ?? '', stderr: e.stderr ?? '', exitCode: e.status ?? 1 };
  }
}

describe('CLI Integration', () => {
  describe('version flag', () => {
    it('should print version without error', () => {
      if (!CLI_BUILT) {
        console.warn('Skipping: dist/main.js not found — run `npm run build` first');
        return;
      }
      const result = runCli('--version');
      expect(result.exitCode).toBe(0);
    });
  });

  describe('help flag', () => {
    it('should display help text', () => {
      if (!CLI_BUILT) {
        console.warn('Skipping: dist/main.js not found — run `npm run build` first');
        return;
      }
      const result = runCli('--help');
      expect(result.exitCode).toBe(0);
      expect(result.stdout.length).toBeGreaterThan(0);
    });
  });
});
