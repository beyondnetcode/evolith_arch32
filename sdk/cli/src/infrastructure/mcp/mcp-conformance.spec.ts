import fs from 'node:fs';
import path from 'node:path';
import { getAllTools } from './tools';

const fileSystem = {
  exists: jest.fn(),
  existsSync: jest.fn(),
  readFile: jest.fn(),
  readFileBuffer: jest.fn(),
  readJson: jest.fn(),
  writeFile: jest.fn(),
  writeJson: jest.fn(),
  readdir: jest.fn(),
  readdirNames: jest.fn(),
  remove: jest.fn(),
  ensureDir: jest.fn(),
  stat: jest.fn(),
  mkdir: jest.fn(),
  copy: jest.fn(),
  ensureFile: jest.fn(),
};

const configParser = {
  parse: jest.fn(),
  stringify: jest.fn(),
};

describe('MCP runtime conformance', () => {
  it('publishes unique, actionable schemas for every Core tool', () => {
    const tools = getAllTools(fileSystem as any, configParser);
    const names = tools.map((tool) => tool.schema.name);

    expect(tools.length).toBeGreaterThanOrEqual(15);
    expect(new Set(names).size).toBe(names.length);
    for (const tool of tools) {
      expect(tool.schema.name).toMatch(/^evolith-/);
      expect(tool.schema.description.trim()).not.toBe('');
      expect(tool.schema.inputSchema.type).toBe('object');
      expect(tool.execute).toEqual(expect.any(Function));
    }
  });

  it('contains no skipped suite in the release-relevant MCP surface', () => {
    const roots = [
      path.resolve(__dirname),
      path.resolve(__dirname, '../../../test/e2e/mcp-e2e.test.ts'),
    ];
    const files = roots.flatMap((root) => {
      if (fs.statSync(root).isFile()) return [root];
      return fs.readdirSync(root, { recursive: true })
        .filter((entry) => /\.(spec|test)\.ts$/.test(String(entry)))
        .map((entry) => path.join(root, String(entry)));
    });

    const skipped = files.filter((file) => /\b(?:describe|it|test)\.skip\s*\(/.test(fs.readFileSync(file, 'utf8')));
    expect(skipped).toEqual([]);
  });
});
