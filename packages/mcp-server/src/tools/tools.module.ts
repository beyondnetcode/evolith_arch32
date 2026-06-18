import { Module } from '@nestjs/common';
import type { IFileSystem, IConfigParser } from '@evolith/core';
import { RulesetValidatorService } from '@evolith/core';
import { WebhookAdapter, MoscowPrioritizationService } from '@evolith/infra-providers';
import { DomainModule } from '../domain/domain.module';
import { FILE_SYSTEM, CONFIG_PARSER } from '../domain/domain.tokens';
import { ToolRegistryService } from '../mcp/tool-registry.service';
import { MetricsService } from '../mcp/metrics.service';
import { McpTool, MCP_TOOLS } from '../mcp/tool.interface';
import { ValidateTool } from './validate.tool';
import { createAgentTools } from './agent.tools';
import { createArchitectureTools } from './architecture.tools';
import { createGateTools } from './gate.tools';
import { createPhaseAdvanceTools } from './phase-advance.tools';
import { createMoscowTools } from './moscow.tools';
import { createSdlcTools } from './sdlc.tools';
import { createAutoFixTools } from './auto-fix.tools';
import { createConfigTools } from './config.tools';
import { createMetricsTools } from './metrics.tool';

/**
 * Aggregates every MCP tool and feeds the full list to the
 * {@link ToolRegistryService} via the {@link MCP_TOOLS} token.
 *
 * To add a tool: implement {@link McpTool} (or a `create*Tools` factory), then
 * append it to the `MCP_TOOLS` factory below.
 */
@Module({
  imports: [DomainModule],
  providers: [
    ValidateTool,
    MetricsService,
    {
      provide: MCP_TOOLS,
      useFactory: (
        validate: ValidateTool,
        fs: IFileSystem,
        configParser: IConfigParser,
        validator: RulesetValidatorService,
        webhook: WebhookAdapter,
        moscow: MoscowPrioritizationService,
        metrics: MetricsService,
      ): McpTool[] => [
        validate,
        ...createAgentTools(fs),
        ...createArchitectureTools(fs, configParser, validator),
        ...createGateTools(webhook),
        ...createPhaseAdvanceTools(webhook),
        ...createMoscowTools(moscow),
        ...createSdlcTools(fs, configParser),
        ...createAutoFixTools(fs),
        ...createConfigTools(),
        ...createMetricsTools(metrics),
      ],
      inject: [
        ValidateTool,
        FILE_SYSTEM,
        CONFIG_PARSER,
        RulesetValidatorService,
        WebhookAdapter,
        MoscowPrioritizationService,
        MetricsService,
      ],
    },
    ToolRegistryService,
  ],
  exports: [ToolRegistryService, MetricsService],
})
export class ToolsModule {}
