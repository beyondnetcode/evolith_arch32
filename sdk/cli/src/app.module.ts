// @ts-nocheck
import { Module } from '@nestjs/common';
import { InitCommand } from './commands/init/init.command';
import { AgentsCommand } from './commands/init/agents.command';
import { ValidateCommand } from './commands/validate/validate.command';
import { AliasService } from './config/alias.service';
import { AliasCommand } from './commands/alias/alias.command';
import { DocsCommand } from './commands/docs/docs.command';
import { UpgradeCommand } from './commands/init/upgrade.command';
import { McpServeCommand } from './commands/mcp/mcp-serve.command';
import { ConfigService } from './infrastructure/config/config.service';
import { FileManagerService } from './infrastructure/filesystem/file-manager.service';
import { SyncService } from '@evolith/core-domain/application/sync/sync.service';
import { WatcherService } from './infrastructure/mcp/watcher.service';
import { SdlcCommand } from './commands/sdlc/sdlc.command';
import { HandoffCommand } from './commands/sdlc/handoff.command';
import { GenerateDomainCommand } from './commands/sdlc/generate-domain.command';
import { GateStatusCommand } from './commands/sdlc/gate-status.command';
import { ScaffoldCommand } from './commands/architecture/scaffold.command';
import { ADRCommand } from './commands/adr/adr.command';
import { StandardsCommand } from './commands/standards/standards.command';
import { CompletionCommand } from './commands/completion/completion.command';
import { HistoryCommand } from './commands/history/history.command';
import { DriftCommand } from './commands/drift/drift.command';
import { GateCommand } from './commands/gate/gate.command';
import { PhaseAdvanceCommand } from './commands/phase/phase-advance.command';
import { ProfileCommand } from './commands/profile/profile.command';
import { FixturesCommand } from './commands/fixtures/fixtures.command';
import { ApiCommand } from './commands/api/api.command';
import { UpdateCommand } from './commands/update/update.command';

import { ValidateSatelliteUseCase } from '@evolith/core-domain/application/use-cases/validate-satellite.use-case';
import { EvaluateGateUseCase } from '@evolith/core-domain/application/use-cases/evaluate-gate.use-case';
import { PhaseGateValidatorService } from '@evolith/core-domain/application/validators/phase-gate-validator.service';
import { ProposePhaseAdvanceUseCase } from '@evolith/core-domain/application/use-cases/propose-phase-advance.use-case';
import { RulesetValidatorService } from '@evolith/core-domain/application/validators/ruleset-validator.service';
import { PromptService } from './infrastructure/prompts/prompt.service';
import { CatalogLoader } from './infrastructure/catalog/catalog-loader';
import { WebhookAdapter } from './infrastructure/adapters/webhook.adapter';
import { NodeFileSystemProvider } from '@evolith/infra-providers';
import { NestLoggerProvider } from '@evolith/infra-providers';
import { YamlConfigParserProvider } from '@evolith/infra-providers';
import { PluginModule } from './infrastructure/plugins/plugin.module';

@Module({
  imports: [
    PluginModule.register(),
  ],
  providers: [
    InitCommand,
    AgentsCommand,
    ValidateCommand,
    DocsCommand,
    UpgradeCommand,
    McpServeCommand,
    ConfigService,
    FileManagerService,
    SyncService,
    {
      provide: 'IConfigService',
      useExisting: ConfigService,
    },
    WatcherService,
    SdlcCommand,
    HandoffCommand,
    GenerateDomainCommand,
    GateStatusCommand,
    ScaffoldCommand,
    ADRCommand,
    StandardsCommand,
    CompletionCommand,
    HistoryCommand,
    DriftCommand,
    GateCommand,
    PhaseAdvanceCommand,
    ProfileCommand,
    FixturesCommand,
    ApiCommand,
    UpdateCommand,
    AliasService,
    AliasCommand,
    ValidateSatelliteUseCase,
    EvaluateGateUseCase,
    ProposePhaseAdvanceUseCase,
    {
      provide: RulesetValidatorService,
      useFactory: (fs: any, logger: any, configParser: any) => {
        const { DiskRulesetRepository } = require('./infrastructure/adapters/disk-ruleset.repository');
        return new RulesetValidatorService({
          fileSystem: fs,
          logger,
          configParser,
          rulesetRepo: new DiskRulesetRepository(fs, logger),
        });
      },
      inject: ['IFileSystem', 'ILogger', 'IConfigParser'],
    },
    PromptService,
    CatalogLoader,
    {
      provide: 'IFileSystem',
      useFactory: () => new NodeFileSystemProvider().createFileSystem(),
    },
    {
      provide: 'ILogger',
      useFactory: () => new NestLoggerProvider().createLogger('AppModule'),
    },
    {
      provide: 'IConfigParser',
      useFactory: () => new YamlConfigParserProvider().createConfigParser('yaml'),
    },
    {
      provide: 'VALIDATOR_FACTORY',
      useFactory: (fs: unknown, logger: unknown) => {
        return (corePath?: string) => new PhaseGateValidatorService(corePath, { fileSystem: fs, logger });
      },
      inject: ['IFileSystem', 'ILogger'],
    },
    {
      provide: 'WEBHOOK_NOTIFIER',
      useClass: WebhookAdapter,
    },
  ],
})
export class AppModule {}
