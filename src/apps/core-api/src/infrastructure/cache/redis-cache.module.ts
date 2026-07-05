import { Module, Global, Logger } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { ConfigService } from '@nestjs/config';
import { createCacheStore } from './redis-store.factory';

const logger = new Logger('RedisCacheModule');

@Global()
@Module({
  imports: [
    CacheModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const redisUrl = config.get<string>('REDIS_URL');
        const redisPassword = config.get<string>('REDIS_PASSWORD');
        const host = config.get<string>('REDIS_HOST', 'localhost');
        const port = config.get<number>('REDIS_PORT', 6379);

        const store = redisUrl
          ? createCacheStore(redisUrl)
          : createCacheStore({ host, port, password: redisPassword });

        if (!store) {
          logger.warn('Redis unavailable — caching disabled (in-memory fallback)');
        }

        return {
          store,
          ttl: 300_000,
          max: 1000,
        };
      },
    }),
  ],
  exports: [CacheModule],
})
export class RedisCacheModule {}
