import { McpCacheService } from './mcp-cache.service';

describe('McpCacheService', () => {
  function cache(overrides: Partial<Record<'get' | 'set' | 'del', jest.Mock>> = {}) {
    return {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      ...overrides,
    } as any;
  }

  it('reads and writes the tools list cache', async () => {
    const backing = cache({ get: jest.fn().mockResolvedValue([{ name: 'tool' }]) });
    const service = new McpCacheService(backing);

    await expect(service.getToolsList()).resolves.toEqual([{ name: 'tool' }]);
    await service.setToolsList([{ name: 'next-tool' }]);

    expect(backing.get).toHaveBeenCalledWith('mcp:tools:list');
    expect(backing.set).toHaveBeenCalledWith('mcp:tools:list', [{ name: 'next-tool' }], 600000);
  });

  it('reads and writes the resources list cache', async () => {
    const backing = cache({ get: jest.fn().mockResolvedValue([{ uri: 'evolith://resource' }]) });
    const service = new McpCacheService(backing);

    await expect(service.getResourcesList()).resolves.toEqual([{ uri: 'evolith://resource' }]);
    await service.setResourcesList([{ uri: 'evolith://next' }]);

    expect(backing.get).toHaveBeenCalledWith('mcp:resources:list');
    expect(backing.set).toHaveBeenCalledWith('mcp:resources:list', [{ uri: 'evolith://next' }], 600000);
  });

  it('returns undefined when cache reads fail', async () => {
    const backing = cache({ get: jest.fn().mockRejectedValue(new Error('offline')) });
    const service = new McpCacheService(backing);

    await expect(service.getToolsList()).resolves.toBeUndefined();
    await expect(service.getResourcesList()).resolves.toBeUndefined();
  });

  it('swallows cache write and invalidation failures', async () => {
    const backing = cache({
      set: jest.fn().mockRejectedValue(new Error('offline')),
      del: jest.fn().mockRejectedValue(new Error('offline')),
    });
    const service = new McpCacheService(backing);

    await expect(service.setToolsList([])).resolves.toBeUndefined();
    await expect(service.setResourcesList([])).resolves.toBeUndefined();
    await expect(service.invalidateAll()).resolves.toBeUndefined();
  });

  it('invalidates both cached MCP lists', async () => {
    const backing = cache();
    const service = new McpCacheService(backing);

    await service.invalidateAll();

    expect(backing.del).toHaveBeenCalledWith('mcp:tools:list');
    expect(backing.del).toHaveBeenCalledWith('mcp:resources:list');
  });
});
