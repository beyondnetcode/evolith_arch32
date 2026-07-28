import { Inject, Injectable, Logger } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { createHash } from 'node:crypto';
import type { Cache } from 'cache-manager';
import { mcpContextStorage, type McpUserContext } from './mcp-user-context';

const logger = new Logger('McpCacheService');

const CACHE_PREFIX = {
  toolsList: 'mcp:tools:list',
  resourcesList: 'mcp:resources:list',
} as const;

const CACHE_TTL = {
  toolsList: 600_000,
  resourcesList: 600_000,
} as const;

/** Key fragment for a request that carries no principal at all. */
const ANONYMOUS_PRINCIPAL = 'anon';

/**
 * GT-609 — stable, per-principal cache discriminator.
 *
 * `handleListTools` filters the inventory by `context.scopes` BEFORE the result
 * reaches the cache, so the cached value is a *view*, not a catalogue. Storing
 * that view under a single literal key made the first caller of the TTL window
 * decide what every later caller discovered: an admin warming `tools/list`
 * published the write-capable inventory to readers. The key therefore has to
 * carry everything that can change the answer.
 *
 * Hashed (rather than concatenated verbatim) so that a tenant id — which is
 * tenant-identifying data — never lands in a cache key that may be shared with
 * an external store or surface in its diagnostics.
 */
export function principalCacheKey(principal?: McpUserContext): string {
  if (!principal) return ANONYMOUS_PRINCIPAL;
  const material = JSON.stringify({
    tenant: principal.tenant ?? '',
    // Sorted + de-duplicated so that two logically identical principals share a
    // cache entry regardless of the order their claims arrived in.
    scopes: [...new Set(principal.scopes ?? [])].sort(),
    roles: [...new Set(principal.roles ?? [])].sort(),
  });
  return createHash('sha256').update(material).digest('hex').slice(0, 32);
}

@Injectable()
export class McpCacheService {
  /**
   * Bumped by {@link invalidateAll}. Per-principal keys cannot be enumerated
   * through the `cache-manager` `Cache` contract (there is no scan/keys), so
   * invalidation moves the whole namespace forward instead of deleting entries
   * one by one; the orphaned entries expire on their own TTL.
   */
  private generation = 0;

  constructor(@Inject(CACHE_MANAGER) private readonly cache: Cache) {}

  /**
   * The principal defaults to the ambient MCP context — the very same store
   * `handleListTools` filters on — so a caller physically cannot forget to
   * scope the key and reintroduce the cross-principal leak.
   */
  private key(prefix: string, principal?: McpUserContext): string {
    const resolved = principal ?? mcpContextStorage.getStore();
    return `${prefix}:g${this.generation}:${principalCacheKey(resolved)}`;
  }

  async getToolsList(principal?: McpUserContext): Promise<unknown | undefined> {
    try {
      return await this.cache.get(this.key(CACHE_PREFIX.toolsList, principal));
    } catch {
      logger.debug('Cache read failed for tools list');
      return undefined;
    }
  }

  async setToolsList(tools: unknown, principal?: McpUserContext): Promise<void> {
    try {
      await this.cache.set(this.key(CACHE_PREFIX.toolsList, principal), tools, CACHE_TTL.toolsList);
    } catch {
      logger.debug('Cache write failed for tools list');
    }
  }

  async getResourcesList(principal?: McpUserContext): Promise<unknown | undefined> {
    try {
      return await this.cache.get(this.key(CACHE_PREFIX.resourcesList, principal));
    } catch {
      logger.debug('Cache read failed for resources list');
      return undefined;
    }
  }

  async setResourcesList(resources: unknown, principal?: McpUserContext): Promise<void> {
    try {
      await this.cache.set(
        this.key(CACHE_PREFIX.resourcesList, principal),
        resources,
        CACHE_TTL.resourcesList,
      );
    } catch {
      logger.debug('Cache write failed for resources list');
    }
  }

  async invalidateAll(): Promise<void> {
    try {
      // Best-effort delete of the current principal's entries, then move the
      // namespace forward so every other principal's entry is unreachable too.
      await this.cache.del(this.key(CACHE_PREFIX.toolsList));
      await this.cache.del(this.key(CACHE_PREFIX.resourcesList));
    } catch {
      logger.debug('Cache invalidation failed');
    } finally {
      this.generation += 1;
    }
  }
}
