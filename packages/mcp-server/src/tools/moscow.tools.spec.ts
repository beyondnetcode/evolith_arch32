import * as os from 'node:os';
import * as path from 'node:path';
import * as fsExtra from 'fs-extra';
import { MoscowPrioritizationService } from '@evolith/infra-providers';
import { createMoscowTools } from './moscow.tools';
import { McpTool } from '../mcp/tool.interface';

function byName(tools: McpTool[], name: string): McpTool {
  return tools.find((t) => t.schema.name === name)!;
}

const items = [
  { description: 'Pin core version', priority: 'MUST', category: 'governance', rationale: 'stability', phase: 'phase-0' },
  { description: 'Bilingual docs', priority: 'SHOULD', category: 'docs', rationale: 'reach', phase: 'phase-0' },
];

describe('moscow tools', () => {
  let dir: string;
  let tools: McpTool[];

  beforeEach(async () => {
    dir = await fsExtra.mkdtemp(path.join(os.tmpdir(), 'evolith-moscow-'));
    tools = createMoscowTools(new MoscowPrioritizationService());
  });
  afterEach(() => fsExtra.remove(dir));

  it('creates, loads, validates, reports, updates, removes and lists', async () => {
    const create = (await byName(tools, 'evolith-moscow-create').execute({ path: dir, items })) as { success: boolean; analysis: { items: { id: string }[] } };
    expect(create.success).toBe(true);
    const firstId = create.analysis.items[0].id;

    const load = (await byName(tools, 'evolith-moscow-load').execute({ path: dir, phase: 'phase-0' })) as { items: unknown[] };
    expect(load.items).toHaveLength(2);

    const validate = (await byName(tools, 'evolith-moscow-validate').execute({ path: dir, phase: 'phase-0' })) as { valid: boolean };
    expect(typeof validate.valid).toBe('boolean');

    const report = (await byName(tools, 'evolith-moscow-report').execute({ path: dir, phase: 'phase-0' })) as { report: string };
    expect(report.report).toContain('MoSCoW Prioritization Report');

    const update = (await byName(tools, 'evolith-moscow-update').execute({ path: dir, phase: 'phase-0', itemId: firstId, updates: { category: 'security' } })) as { success: boolean };
    expect(update.success).toBe(true);

    const list = (await byName(tools, 'evolith-moscow-list').execute({ path: dir })) as { count: number };
    expect(list.count).toBeGreaterThanOrEqual(1);

    const remove = (await byName(tools, 'evolith-moscow-remove').execute({ path: dir, phase: 'phase-0', itemId: firstId })) as { success: boolean };
    expect(remove.success).toBe(true);
  });

  it('returns errors for missing inputs', async () => {
    expect(await byName(tools, 'evolith-moscow-create').execute({ path: dir, items: [] })).toMatchObject({ error: true });
    expect(await byName(tools, 'evolith-moscow-load').execute({ path: dir, phase: 'phase-9' })).toMatchObject({ error: true });
    expect(await byName(tools, 'evolith-moscow-update').execute({ path: dir, phase: 'phase-0' })).toMatchObject({ error: true });
  });
});
