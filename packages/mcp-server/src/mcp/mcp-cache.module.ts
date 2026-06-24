import { Module, Global, Logger } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { McpCacheService } from './mcp-cache.service';

const logger = new Logger('McpCacheModule');

@Global()
@Module({
  imports: [
    CacheModule.register({
      ttl: 600_000,
      max: 500,
    }),
  ],
  providers: [McpCacheService],
  exports: [CacheModule, McpCacheService],
})
export class McpCacheModule {}
