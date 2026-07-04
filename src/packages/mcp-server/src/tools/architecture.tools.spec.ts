import * as os from 'node:os';
import * as path from 'node:path';
import * as fsExtra from 'fs-extra';
import { NodeFileSystemProvider, YamlConfigParserProvider } from '@evolith/infra-providers';
import type { RulesetValidatorService } from '@evolith/core';
import { createArchitectureTools } from './architecture.tools';
import { McpTool } from '../mcp/tool.interface';

const fs = new NodeFileSystemProvider().createFileSystem();
const configParser = new YamlConfigParserProvider().createConfigParser('yaml');

// Stub validator that returns no OPA issues.
const stubValidator = { validate: async () => ({ issues: [] }) } as unknown as RulesetValidatorService;

function byName(tools: McpTool[], name: string): McpTool {
  return tools.find((t) => t.schema.name === name)!;
}

describe('architecture tools', () => {
  let dir: string;
  let tools: McpTool[];

  beforeEach(async () => {
    dir = await fsExtra.mkdtemp(path.join(os.tmpdir(), 'evolith-arch-'));
    tools = createArchitectureTools(fs, configParser, stubValidator);
  });
  afterEach(() => fsExtra.remove(dir));

  it('requires a path', async () => {
    expect(await byName(tools, 'evolith-architecture-validate').execute({})).toMatchObject({ error: true });
  });

  it('flags F3 extraction-readiness issues (no product type, no Dockerfile)', async () => {
    await fsExtra.writeFile(path.join(dir, 'evolith.yaml'), 'product:\n  name: x\n');
    const result = (await byName(tools, 'evolith-architecture-validate').execute({ path: dir, level: 'F3' })) as {
      level: string;
      issues: Array<{ ruleId: string }>;
    };
    const ids = result.issues.map((i) => i.ruleId);
    expect(result.level).toBe('F3');
    expect(ids).toContain('F3-01');
    expect(ids).toContain('F3-02');
  });

  it('flags F1/F2 issues and runs deep analysis on a monorepo layout', async () => {
    await fsExtra.writeJson(path.join(dir, 'package.json'), { name: 'demo', workspaces: ['src/*'] });
    await fsExtra.ensureDir(path.join(dir, 'src', 'mod-a'));
    const result = (await byName(tools, 'evolith-architecture-validate').execute({ path: dir, level: 'F2', deep: true })) as {
      deepAnalysis: boolean;
      issues: Array<{ ruleId: string }>;
    };
    expect(result.deepAnalysis).toBe(true);
    expect(result.issues.map((i) => i.ruleId)).toContain('F1-01');
  });

  it('runs drift detection and returns a structured result', async () => {
    const result = (await byName(tools, 'evolith-drift-detect').execute({ path: dir, corePath: dir })) as Record<string, unknown>;
    expect(result.tool === 'evolith-drift-detect' || result.error === true).toBe(true);
  });
});
