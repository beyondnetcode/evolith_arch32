import * as os from 'node:os';
import * as path from 'node:path';
import * as fsExtra from 'fs-extra';
import { NodeFileSystemProvider } from '@evolith/infra-providers';
import { createAgentTools } from './agent.tools';
import { McpTool } from '../mcp/tool.interface';

const fs = new NodeFileSystemProvider().createFileSystem();

function byName(tools: McpTool[], name: string): McpTool {
  return tools.find((t) => t.schema.name === name)!;
}

describe('agent tools', () => {
  let dir: string;
  let tools: McpTool[];

  beforeEach(async () => {
    dir = await fsExtra.mkdtemp(path.join(os.tmpdir(), 'evolith-agent-'));
    tools = createAgentTools(fs);
  });
  afterEach(() => fsExtra.remove(dir));

  it('installs, lists, validates, upgrades and removes an agent', async () => {
    const install = (await byName(tools, 'evolith-agent-install').execute({ name: 'guardian', dir })) as { success: boolean };
    expect(install.success).toBe(true);

    const list = (await byName(tools, 'evolith-agent-list').execute({ dir })) as { count: number; agents: unknown[] };
    expect(list.count).toBe(1);

    const validate = (await byName(tools, 'evolith-agent-validate').execute({ name: 'guardian', dir })) as { valid: boolean };
    expect(validate.valid).toBe(true);

    const upgrade = (await byName(tools, 'evolith-agent-upgrade').execute({ name: 'guardian', dir })) as {
      fromVersion: string;
      toVersion: string;
    };
    expect(upgrade.fromVersion).toBe('1.0.0');
    expect(upgrade.toVersion).toBe('1.0.1');

    const remove = (await byName(tools, 'evolith-agent-remove').execute({ name: 'guardian', dir })) as { success: boolean };
    expect(remove.success).toBe(true);

    const after = (await byName(tools, 'evolith-agent-list').execute({ dir })) as { agents: unknown[] };
    expect(after.agents).toEqual([]);
  });

  it('returns an error validating a missing agent and throws upgrading one', async () => {
    const validate = (await byName(tools, 'evolith-agent-validate').execute({ name: 'ghost', dir })) as { valid: boolean };
    expect(validate.valid).toBe(false);
    await expect(byName(tools, 'evolith-agent-upgrade').execute({ name: 'ghost', dir })).rejects.toThrow("Agent 'ghost' not found");
  });

  it('supports minimal and enterprise templates', async () => {
    await byName(tools, 'evolith-agent-install').execute({ name: 'ent', template: 'enterprise', dir });
    const content = await fs.readJson(path.join(dir, 'rulesets', 'agents', 'ent', 'agent.rules.json'));
    expect((content as { principles: unknown[] }).principles).toHaveLength(3);
  });
});
