import { ToolRegistryService } from './tool-registry.service';
import { McpTool } from './tool.interface';

function fakeTool(name: string): McpTool {
  return {
    schema: { name, description: `${name} desc`, inputSchema: { type: 'object', properties: {} } },
    execute: async () => ({ name }),
  };
}

describe('ToolRegistryService', () => {
  it('registers tools passed via the MCP_TOOLS list', () => {
    const reg = new ToolRegistryService([fakeTool('a'), fakeTool('b')]);
    expect(reg.list()).toHaveLength(2);
    expect(reg.get('a')?.schema.name).toBe('a');
    expect(reg.get('missing')).toBeUndefined();
  });

  it('exposes schemas for tools/list', () => {
    const reg = new ToolRegistryService([fakeTool('a')]);
    expect(reg.listSchemas()).toEqual([
      { name: 'a', description: 'a desc', inputSchema: { type: 'object', properties: {} } },
    ]);
  });

  it('throws on duplicate registration', () => {
    const reg = new ToolRegistryService([fakeTool('dup')]);
    expect(() => reg.register(fakeTool('dup'))).toThrow('Tool already registered: dup');
  });
});
