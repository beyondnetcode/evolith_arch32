import { Injectable, Logger } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { Inject } from '@nestjs/common';

const logger = new Logger('McpCacheService');

const CACHE_KEYS = {
  toolsList: 'mcp:tools:list',
  resourcesList: 'mcp:resources:list',
} as const;

const CACHE_TTL = {
  toolsList: 600_000,
  resourcesList: 600_000,
} as const;

@Injectable()
export class McpCacheService {
  constructor(@Inject(CACHE_MANAGER) private readonly cache: Cache) {}

  async getToolsList(): Promise<unknown | undefined> {
    try {
      return await this.cache.get(CACHE_KEYS.toolsList);
    } catch {
      logger.debug('Cache read failed for tools list');
      return undefined;
    }
  }

  async setToolsList(tools: unknown): Promise<void> {
    try {
      await this.cache.set(CACHE_KEYS.toolsList, tools, CACHE_TTL.toolsList);
    } catch {
      logger.debug('Cache write failed for tools list');
    }
  }

  async getResourcesList(): Promise<unknown | undefined> {
    try {
      return await this.cache.get(CACHE_KEYS.resourcesList);
    } catch {
      logger.debug('Cache read failed for resources list');
      return undefined;
    }
  }

  async setResourcesList(resources: unknown): Promise<void> {
    try {
      await this.cache.set(CACHE_KEYS.resourcesList, resources, CACHE_TTL.resourcesList);
    } catch {
      logger.debug('Cache write failed for resources list');
    }
  }

  async invalidateAll(): Promise<void> {
    try {
      await this.cache.del(CACHE_KEYS.toolsList);
      await this.cache.del(CACHE_KEYS.resourcesList);
    } catch {
      logger.debug('Cache invalidation failed');
    }
  }
}
