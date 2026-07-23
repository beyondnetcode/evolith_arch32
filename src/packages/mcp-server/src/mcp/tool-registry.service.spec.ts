import { ToolRegistryService } from './tool-registry.service';
import type { McpTool } from './tool.interface';

function makeTool(name: string): McpTool {
  return {
    schema: {
      name,
      description: `Test tool ${name}`,
      inputSchema: { type: 'object', properties: {} },
    },
    execute: async () => ({ result: 'ok' }),
  };
}

describe('ToolRegistryService', () => {
  it('creates empty registry with no tools', () => {
    const registry = new ToolRegistryService([]);
    expect(registry.list()).toHaveLength(0);
  });

  it('registers tools from constructor', () => {
    const registry = new ToolRegistryService([makeTool('tool-a'), makeTool('tool-b')]);
    expect(registry.list()).toHaveLength(2);
  });

  it('registers tool via register()', () => {
    const registry = new ToolRegistryService([]);
    registry.register(makeTool('tool-c'));
    expect(registry.list()).toHaveLength(1);
  });

  it('throws on duplicate registration', () => {
    const registry = new ToolRegistryService([]);
    registry.register(makeTool('tool-a'));
    expect(() => registry.register(makeTool('tool-a'))).toThrow('Tool already registered');
  });

  it('get returns tool by name', () => {
    const registry = new ToolRegistryService([makeTool('tool-a')]);
    expect(registry.get('tool-a')).toBeDefined();
    expect(registry.get('tool-a')?.schema.name).toBe('tool-a');
  });

  it('get returns undefined for unknown name', () => {
    const registry = new ToolRegistryService([]);
    expect(registry.get('unknown')).toBeUndefined();
  });

  it('listSchemas returns schemas only', () => {
    const registry = new ToolRegistryService([makeTool('tool-a')]);
    const schemas = registry.listSchemas();
    expect(schemas).toHaveLength(1);
    expect(schemas[0].name).toBe('tool-a');
    expect(schemas[0].description).toBe('Test tool tool-a');
  });
});
