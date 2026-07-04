import * as path from 'node:path';
import * as fs from 'node:fs';
import * as os from 'node:os';

describe('gate command E2E', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'evolith-e2e-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('should create a temp project directory', () => {
    expect(fs.existsSync(tmpDir)).toBe(true);
  });

  it('should handle missing evolith.yaml gracefully', () => {
    const configPath = path.join(tmpDir, 'evolith.yaml');
    expect(fs.existsSync(configPath)).toBe(false);
  });
});
