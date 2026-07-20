import * as os from 'node:os';
import * as path from 'node:path';
import * as fsExtra from 'fs-extra';
import { NodeFileSystemProvider } from '@beyondnet/evolith-infra-providers';
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

  it('throws for a missing agent on both validate and upgrade', async () => {
    // Previously validate returned `{valid:false}` for a missing agent while
    // upgrade threw -- the asymmetry this test used to codify. A missing ruleset
    // is an absent resource on every surface, not a negative verdict, so it
    // fails the same way the CLI's RULESET_NOT_FOUND envelope does.
    await expect(byName(tools, 'evolith-agent-validate').execute({ name: 'ghost', dir })).rejects.toThrow('Ruleset file not found');
    await expect(byName(tools, 'evolith-agent-upgrade').execute({ name: 'ghost', dir })).rejects.toThrow("Agent 'ghost' not found");
  });

  it('reports an invalid ruleset as a negative verdict, not a failed call', async () => {
    await byName(tools, 'evolith-agent-install').execute({ name: 'broken', dir });
    const rulesetPath = path.join(dir, 'rulesets', 'agents', 'broken', 'agent.rules.json');
    await fs.writeJson(rulesetPath, { agent: { name: 'broken' }, ruleset: { version: '1.0.0' }, principles: [{ principle: 'no id, no severity' }] });

    const result = (await byName(tools, 'evolith-agent-validate').execute({ name: 'broken', dir })) as {
      passed: boolean; issuesCount: number; valid: boolean;
      issues: Array<{ field: string }>;
    };

    // The call succeeds; the verdict is negative and carries its reasons.
    expect(result.passed).toBe(false);
    expect(result.valid).toBe(false);
    expect(result.issuesCount).toBeGreaterThan(0);
    // The two principle checks the CLI had and MCP lacked, so both surfaces
    // now reach the same verdict on the same ruleset.
    expect(result.issues.map((i) => i.field)).toEqual(
      expect.arrayContaining(['principle.missing-id', 'principle.missing-severity']),
    );
  });

  it('supports minimal and enterprise templates', async () => {
    await byName(tools, 'evolith-agent-install').execute({ name: 'ent', template: 'enterprise', dir });
    const content = await fs.readJson(path.join(dir, 'rulesets', 'agents', 'ent', 'agent.rules.json'));
    expect((content as { principles: unknown[] }).principles).toHaveLength(3);
  });
});
