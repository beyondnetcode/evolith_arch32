import { RulesetCatalogTool } from './ruleset-catalog.tool';

/**
 * GT-660 — the MCP half of the menu.
 *
 * `evolith-validate`'s `select` argument has told agents since GT-659 to use
 * «ids as published by GET /api/v1/reference/rulesets». On MCP that was an
 * instruction to leave the protocol: nothing here could be asked what the menu
 * was. These tests pin the two properties that make the answer usable — it is
 * the SAME derivation the validator evaluates, and an unreadable Core is an
 * error rather than an empty list.
 */
describe('RulesetCatalogTool · GT-660', () => {
  const catalog = {
    entries: [
      { ref: 'src/rulesets/standards/ssdf-v1.1.rules.json', rules: 8, blocking: 0, severities: ['MUST'], categories: ['ssdf-build'] },
    ],
    packs: 1,
    rules: 8,
    blocking: 0,
  };

  const makeTool = (result: unknown = catalog) => {
    const validator = { catalog: jest.fn().mockResolvedValue(result) };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return { validator, tool: new RulesetCatalogTool(validator as any) };
  };

  it('advertises itself as the thing to read before selecting', () => {
    const { tool } = makeTool();
    expect(tool.schema.name).toBe('evolith-ruleset-list');
    expect(tool.schema.description).toMatch(/select/i);
    // The warning belongs in the schema, where an agent reads it before acting.
    expect(tool.schema.description).toMatch(/blocking failure, never a quiet pass/);
  });

  it('needs no arguments — a menu you must configure to read is not a menu', () => {
    const { tool } = makeTool();
    expect(tool.schema.inputSchema.required).toEqual([]);
    expect(Object.keys(tool.schema.inputSchema.properties ?? {})).toEqual(['corePath']);
  });

  it('returns the packs with the counts a tenant decides on', async () => {
    const { tool, validator } = makeTool();
    const out = (await tool.execute({})) as Record<string, unknown>;
    expect(validator.catalog).toHaveBeenCalledWith(undefined);
    expect(out.packs).toBe(1);
    expect(out.rules).toBe(8);
    // How many can turn a build red. Published so the choice is informed.
    expect(out.blocking).toBe(0);
    expect((out.entries as unknown[])[0]).toEqual(catalog.entries[0]);
  });

  it('forwards an explicit corePath', async () => {
    const { tool, validator } = makeTool();
    await tool.execute({ corePath: '/somewhere/core' });
    expect(validator.catalog).toHaveBeenCalledWith('/somewhere/core');
  });

  it('THE DISTINCTION: an unreadable Core is an ERROR, not an empty menu', async () => {
    // `[]` would let a broken corePath read to an agent as "this Core evaluates
    // nothing", which the agent would then report to a user as fact.
    const { tool } = makeTool({ entries: [], packs: 0, rules: 0, blocking: 0 });
    const out = (await tool.execute({})) as { isError?: boolean; content?: { text: string }[] };
    expect(out.isError).toBe(true);
    expect(out.content?.[0].text).toMatch(/NOT an empty catalogue/);
  });
});
