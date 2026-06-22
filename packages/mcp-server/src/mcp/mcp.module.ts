import { Module } from '@nestjs/common';
import { DomainModule } from '../domain/domain.module';
import { ToolsModule } from '../tools/tools.module';
import { McpServerService } from './mcp-server.service';
import { ResourcesService } from './resources.service';
import { PromptsService } from './prompts.service';
import { AbacEvaluator } from './abac-evaluator';

/** Transport + dispatch layer of the MCP Gateway (tools, resources, prompts). */
@Module({
  imports: [DomainModule, ToolsModule],
  providers: [McpServerService, ResourcesService, PromptsService, AbacEvaluator],
  exports: [McpServerService],
})
export class McpModule {}
