/**
 * GT-609 — the `tools/list` cache must never answer one principal from another
 * principal's view.
 *
 * `handleListTools` filters the registry by the ambient principal's scopes and
 * the RESULT of that filter is what gets cached. While the cache key was the
 * single literal `mcp:tools:list`, the first caller to warm it decided the
 * inventory every later caller discovered for the whole TTL — an admin warming
 * the cache published the write-capable inventory to readers. That is an
 * authorization leak in the discovery surface, so these tests assert the
 * OBSERVABLE inventory each principal receives, not the shape of the key.
 */
import { McpServerService, mcpContextStorage, type McpUserContext } from './mcp-server.service';
import { McpCacheService } from './mcp-cache.service';
import { MetricsService } from './metrics.service';
import { ToolRegistryService } from './tool-registry.service';
import { AbacEvaluator } from './abac-evaluator';
import { McpTool } from './tool.interface';

class MockAbacEvaluator extends AbacEvaluator {
  override evaluateNative() {
    return { allowed: true, violations: [] };
  }
  override async evaluateOpa() {
    return { allowed: true, violations: [] };
  }
}

/** Minimal in-memory `Cache` double with the `cache-manager` surface. */
function memoryCache() {
  const store = new Map<string, unknown>();
  return {
    store,
    get: jest.fn(async (key: string) => store.get(key)),
    set: jest.fn(async (key: string, value: unknown) => {
      store.set(key, value);
    }),
    del: jest.fn(async (key: string) => {
      store.delete(key);
    }),
  };
}

function tool(name: string, scope: 'read' | 'write' | 'admin'): McpTool {
  return {
    schema: { name, description: 'd', inputSchema: { type: 'object', properties: {} } },
    mutative: scope !== 'read',
    scope,
    execute: async () => ({}),
  };
}

const ADMIN: McpUserContext = {
  id: 'admin-1',
  role: 'admin',
  roles: ['admin'],
  tenant: 'acme',
  environment: 'test',
  scopes: ['read', 'write', 'admin'],
};

const READER: McpUserContext = {
  id: 'reader-1',
  role: 'reader',
  roles: ['reader'],
  tenant: 'acme',
  environment: 'test',
  scopes: ['read'],
};

function names(result: { tools: Array<{ name: string }> }): string[] {
  return result.tools.map((t) => t.name).sort();
}

describe('GT-609 — tools/list cache is scoped to the calling principal', () => {
  function build() {
    const cache = memoryCache();
    const registry = new ToolRegistryService([
      tool('evolith-validate', 'read'),
      tool('evolith-apply', 'write'),
      tool('evolith-provision-key', 'admin'),
    ]);
    const service = new McpServerService(
      registry,
      new MetricsService(),
      new MockAbacEvaluator(),
      undefined,
      undefined,
      undefined,
      new McpCacheService(cache as never),
    );
    return { service, cache };
  }

  it('does not leak an admin-warmed inventory to a reader', async () => {
    const { service } = build();

    const adminView = await mcpContextStorage.run(ADMIN, () => service.handleListTools());
    expect(names(adminView)).toEqual(['evolith-apply', 'evolith-provision-key', 'evolith-validate']);

    const readerView = await mcpContextStorage.run(READER, () => service.handleListTools());
    expect(names(readerView)).toEqual(['evolith-validate']);
  });

  it('does not leak an unauthenticated full inventory to a reader', async () => {
    const { service } = build();

    // No ambient context at all: `handleListTools` returns the unfiltered
    // registry. Under the global key that answer became every later caller's.
    const anonymousView = await service.handleListTools();
    expect(names(anonymousView)).toHaveLength(3);

    const readerView = await mcpContextStorage.run(READER, () => service.handleListTools());
    expect(names(readerView)).toEqual(['evolith-validate']);
  });

  it('still serves a warm cache to the same principal (the cache remains useful)', async () => {
    const { service, cache } = build();

    await mcpContextStorage.run(READER, () => service.handleListTools());
    const setsAfterFirst = cache.set.mock.calls.length;

    const second = await mcpContextStorage.run(READER, () => service.handleListTools());

    expect(names(second)).toEqual(['evolith-validate']);
    // Second call was served from the cache — no additional write.
    expect(cache.set.mock.calls.length).toBe(setsAfterFirst);
  });

  it('separates principals of different tenants holding identical scopes', async () => {
    const { service, cache } = build();
    const otherTenantReader: McpUserContext = { ...READER, id: 'reader-2', tenant: 'globex' };

    await mcpContextStorage.run(READER, () => service.handleListTools());
    await mcpContextStorage.run(otherTenantReader, () => service.handleListTools());

    const toolKeys = [...cache.store.keys()].filter((k) => k.startsWith('mcp:tools:list'));
    expect(toolKeys).toHaveLength(2);
  });

  it('never writes a tenant identifier in clear text into the cache key', async () => {
    const { service, cache } = build();

    await mcpContextStorage.run(ADMIN, () => service.handleListTools());

    for (const key of cache.store.keys()) {
      expect(key).not.toContain('acme');
    }
  });

  it('invalidateAll makes every principal re-derive its own view', async () => {
    const { service, cache } = build();
    const cacheService = (service as unknown as { cache: McpCacheService }).cache;

    await mcpContextStorage.run(READER, () => service.handleListTools());
    const setsBefore = cache.set.mock.calls.length;

    await cacheService.invalidateAll();

    await mcpContextStorage.run(READER, () => service.handleListTools());
    expect(cache.set.mock.calls.length).toBe(setsBefore + 1);
  });
});
