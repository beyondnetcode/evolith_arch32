import { McpCacheService } from './mcp-cache.service';

function mockCache() {
  const store = new Map<string, unknown>();
  return {
    get: jest.fn(async (key: string) => store.get(key)),
    set: jest.fn(async (key: string, value: unknown) => { store.set(key, value); }),
  };
}

describe('McpCacheService', () => {
  it('can be instantiated', () => {
    const cache = mockCache();
    const service = new McpCacheService(cache as any);
    expect(service).toBeDefined();
  });

  describe('getToolsList / setToolsList', () => {
    it('returns undefined when cache is empty', async () => {
      const cache = mockCache();
      const service = new McpCacheService(cache as any);
      const result = await service.getToolsList();
      expect(result).toBeUndefined();
    });

    it('stores and retrieves tools list', async () => {
      const cache = mockCache();
      const service = new McpCacheService(cache as any);
      const tools = [{ name: 'test-tool' }];
      await service.setToolsList(tools);
      const result = await service.getToolsList();
      expect(result).toEqual(tools);
    });
  });

  describe('getResourcesList / setResourcesList', () => {
    it('returns undefined when cache is empty', async () => {
      const cache = mockCache();
      const service = new McpCacheService(cache as any);
      const result = await service.getResourcesList();
      expect(result).toBeUndefined();
    });

    it('stores and retrieves resources list', async () => {
      const cache = mockCache();
      const service = new McpCacheService(cache as any);
      const resources = [{ uri: 'evolith://test' }];
      await service.setResourcesList(resources);
      const result = await service.getResourcesList();
      expect(result).toEqual(resources);
    });
  });

  describe('error handling', () => {
    it('returns undefined on cache read error', async () => {
      const cache = { get: jest.fn(async () => { throw new Error('cache error'); }), set: jest.fn() };
      const service = new McpCacheService(cache as any);
      const result = await service.getToolsList();
      expect(result).toBeUndefined();
    });

    it('does not throw on cache write error', async () => {
      const cache = { get: jest.fn(), set: jest.fn(async () => { throw new Error('cache error'); }) };
      const service = new McpCacheService(cache as any);
      await expect(service.setToolsList([])).resolves.not.toThrow();
    });
  });
});
