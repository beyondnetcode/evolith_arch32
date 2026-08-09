import { ValidateTool } from './validate.tool';

/**
 * GT-659 — the MCP surface passes the caller's selection, or nothing at all.
 *
 * The distinction being pinned is not cosmetic. `undefined` means "the caller
 * named no ruleset" and yields the whole corpus; `[]` would mean "the caller
 * named an empty set" and, if it were treated as a selection, would evaluate
 * zero rules and report a pass. A typo in a client's arguments must not be able
 * to produce a clean bill of health.
 */
describe('ValidateTool · GT-659 selection', () => {
  const makeTool = () => {
    const validator = { validate: jest.fn().mockResolvedValue({ status: 'passed', rulesChecked: 0, issues: [] }) };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return { validator, tool: new ValidateTool(validator as any) };
  };

  it('forwards the refs the caller named', async () => {
    const { validator, tool } = makeTool();
    await tool.execute({ path: '/repo', select: ['standards/ssdf-v1.1.rules.json'] });
    expect(validator.validate).toHaveBeenCalledWith('/repo', undefined, {
      policyRefs: ['standards/ssdf-v1.1.rules.json'],
    });
  });

  it('forwards several refs, because a tenant selects a SET of packs', async () => {
    const { validator, tool } = makeTool();
    await tool.execute({ path: '/repo', select: ['a/one.rules.json', 'b/two.rules.json'] });
    expect(validator.validate).toHaveBeenCalledWith('/repo', undefined, {
      policyRefs: ['a/one.rules.json', 'b/two.rules.json'],
    });
  });

  it('THE DISTINCTION: an empty or absent `select` sends `undefined`, never an empty selection', async () => {
    for (const select of [undefined, [], ['   ']]) {
      const { validator, tool } = makeTool();
      await tool.execute({ path: '/repo', ...(select === undefined ? {} : { select }) });
      expect(validator.validate).toHaveBeenCalledWith('/repo', undefined, undefined);
    }
  });

  it('ignores non-string entries rather than forwarding them as refs', async () => {
    const { validator, tool } = makeTool();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await tool.execute({ path: '/repo', select: [42, 'standards/ssdf-v1.1.rules.json', null] } as any);
    expect(validator.validate).toHaveBeenCalledWith('/repo', undefined, {
      policyRefs: ['standards/ssdf-v1.1.rules.json'],
    });
  });
});
