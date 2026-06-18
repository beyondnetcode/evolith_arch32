import * as os from 'node:os';
import * as path from 'node:path';
import * as fsExtra from 'fs-extra';
import { createConfigTools } from './config.tools';
import { McpTool } from '../mcp/tool.interface';

function byName(tools: McpTool[], name: string): McpTool {
  return tools.find((t) => t.schema.name === name)!;
}

describe('config tools', () => {
  let dir: string;
  let tools: McpTool[];

  beforeEach(async () => {
    dir = await fsExtra.mkdtemp(path.join(os.tmpdir(), 'evolith-config-'));
    tools = createConfigTools();
    await fsExtra.writeFile(path.join(dir, 'evolith.yaml'), 'product:\n  name: demo\n  phase: phase-0\n');
  });
  afterEach(() => fsExtra.remove(dir));

  it('reads a nested key', async () => {
    const res = (await byName(tools, 'evolith-config-get').execute({ key: 'product.phase', dir })) as { value: string };
    expect(res.value).toBe('phase-0');
  });

  it('writes a nested key and persists it', async () => {
    const res = (await byName(tools, 'evolith-config-set').execute({ key: 'product.phase', value: 'phase-1', dir })) as { updated: boolean };
    expect(res.updated).toBe(true);
    const reread = (await byName(tools, 'evolith-config-get').execute({ key: 'product.phase', dir })) as { value: string };
    expect(reread.value).toBe('phase-1');
  });

  it('throws when evolith.yaml is absent', async () => {
    const empty = await fsExtra.mkdtemp(path.join(os.tmpdir(), 'evolith-empty-'));
    try {
      await expect(byName(tools, 'evolith-config-get').execute({ key: 'x', dir: empty })).rejects.toThrow('evolith.yaml not found');
    } finally {
      await fsExtra.remove(empty);
    }
  });
});
