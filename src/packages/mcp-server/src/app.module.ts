import { Module } from '@nestjs/common';
import { McpModule } from './mcp/mcp.module';
import { McpCacheModule } from './mcp/mcp-cache.module';

@Module({
  imports: [McpCacheModule, McpModule],
})
export class AppModule {}
