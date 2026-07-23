import { Module, Global } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { McpCacheService } from './mcp-cache.service';

@Global()
@Module({
  imports: [
    CacheModule.register({
      ttl: Number(process.env.MCP_CACHE_TTL_MS) || 600_000,
      max: Number(process.env.MCP_CACHE_MAX_ENTRIES) || 500,
    }),
  ],
  providers: [McpCacheService],
  exports: [CacheModule, McpCacheService],
})
export class McpCacheModule {}
