import { EvaluateTool } from './evaluate.tool';

describe('EvaluateTool (GT-378, MCP surface)', () => {
  const tool = new EvaluateTool({} as any);

  it('exposes the canonical evolith-evaluate schema', () => {
    expect(tool.schema.name).toBe('evolith-evaluate');
    expect(tool.schema.inputSchema.type).toBe('object');
    const props = tool.schema.inputSchema.properties as Record<string, unknown>;
    // Context-only identifiers + canonical anchors are accepted.
    for (const key of ['kinds', 'workspaceRef', 'tenant', 'product', 'initiative', 'phaseId', 'gateId']) {
      expect(props).toHaveProperty(key);
    }
    // No required fields: a minimal context (defaults to cwd) is valid.
    expect(tool.schema.inputSchema.required).toEqual([]);
  });
});
