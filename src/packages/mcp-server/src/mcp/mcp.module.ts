import { Module } from '@nestjs/common';
import { DomainModule } from '../domain/domain.module';
import { ToolsModule } from '../tools/tools.module';
import { McpServerService } from './mcp-server.service';
import { ResourcesService } from './resources.service';
import { PromptsService } from './prompts.service';
import { AbacEvaluator } from './abac-evaluator';
import { AuditLogger } from './audit-logger';
import { ApiKeyProvisioningService } from './api-key-provisioning.service';

/** Transport + dispatch layer of the MCP Gateway (tools, resources, prompts). */
@Module({
  imports: [DomainModule, ToolsModule],
  providers: [McpServerService, ResourcesService, PromptsService, AbacEvaluator, AuditLogger, ApiKeyProvisioningService],
  exports: [McpServerService, AuditLogger, ApiKeyProvisioningService],
})
export class McpModule {}
