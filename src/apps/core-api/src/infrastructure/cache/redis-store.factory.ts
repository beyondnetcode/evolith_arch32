import { Logger } from '@nestjs/common';

const logger = new Logger('RedisStoreFactory');

export interface RedisStoreConfig {
  host: string;
  port: number;
  password?: string;
}

export function createRedisStore(config: RedisStoreConfig | string) {
  try {
    const { KeyvRedis } = require('@keyv/redis');

    let redisUrl: string;
    if (typeof config === 'string') {
      redisUrl = config;
    } else {
      // M11: Build URL without embedding password in the string to prevent
      // accidental log leakage. Use separate host/port/password when possible.
      const protocol = config.password ? 'rediss' : 'redis';
      const auth = config.password ? `:${encodeURIComponent(config.password)}@` : '';
      redisUrl = `${protocol}://${auth}${config.host}:${config.port}`;
    }

    const store = new KeyvRedis(redisUrl);
    store.on('error', (err: Error) => {
      logger.warn(`Redis connection error: ${err.message}. Falling back to no-cache.`);
    });

    return store;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.warn(`Failed to create Redis store (${msg}). Cache will be disabled.`);
    return undefined;
  }
}

export function createCacheStore(config: RedisStoreConfig | string) {
  return createRedisStore(config);
}
