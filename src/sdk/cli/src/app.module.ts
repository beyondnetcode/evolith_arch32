import { Module } from '@nestjs/common';
import { InitCommand } from './commands/init/init.command';
import { AgentsCommand } from './commands/agents/agents.command';
import { ValidateCommand } from './commands/validate/validate.command';
import { EvaluateCommand } from './commands/evaluate/evaluate.command';
import { AliasService } from './config/alias.service';
import { AliasCommand } from './commands/alias/alias.command';
import { DocsCommand } from './commands/docs/docs.command';
import { UpgradeCommand } from './commands/upgrade/upgrade.command';
import { ConfigService } from './infrastructure/config/config.service';
import { FileManagerService } from './infrastructure/filesystem/file-manager.service';
import { SyncService } from '@evolith/core-domain/application/sync/sync.service';
import { SdlcCommand } from './commands/sdlc/sdlc.command';
import { HandoffCommand } from './commands/sdlc/handoff.command';
import { GenerateDomainCommand } from './commands/sdlc/generate-domain.command';
import { GateStatusCommand } from './commands/sdlc/gate-status.command';
import { ScaffoldCommand } from './commands/architecture/scaffold.command';
import { TopologyCommand } from './commands/topology/topology.command';
import { RecommendCommand } from './commands/topology/recommend.command';
import { PhaseArtifactsCommand } from './commands/topology/phase-artifacts.command';
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
import { SatelliteCreateCommand } from './commands/satellite';
import { SatelliteAdoptCommand } from './commands/satellite/satellite-adopt.command';
import { ChatCommand } from './commands/chat/chat.command';

import { ValidateSatelliteUseCase } from '@evolith/core-domain/application/use-cases/validate-satellite.use-case';
import { EvaluateGateUseCase } from '@evolith/core-domain/application/use-cases/evaluate-gate.use-case';
import { PhaseGateValidatorService } from '@evolith/core-domain/application/validators/phase-gate-validator.service';
import { ProposePhaseAdvanceUseCase } from '@evolith/core-domain/application/use-cases/propose-phase-advance.use-case';
import { RulesetValidatorService } from '@evolith/core-domain/application/validators/ruleset-validator.service';
import type { IFileSystem, ILogger, IConfigParser } from '@evolith/core-domain/domain/interfaces';
import { PromptService } from './infrastructure/prompts/prompt.service';
import { WizardService } from './infrastructure/prompts/wizard.service';
import { CatalogLoader } from './infrastructure/catalog/catalog-loader';
import { InitWizardCommand } from './commands/init/init.wizard';
import {
  DiskRulesetRepository,
  NodeFileSystemProvider,
  NestLoggerProvider,
  YamlConfigParserProvider,
  WebhookAdapter,
} from '@evolith/infra-providers';
import { PluginModule } from './infrastructure/plugins/plugin.module';

@Module({
  imports: [
    PluginModule.register(),
  ],
  providers: [
    InitCommand,
    AgentsCommand,
    ValidateCommand,
    EvaluateCommand,
    DocsCommand,
    UpgradeCommand,
    ConfigService,
    FileManagerService,
    SyncService,
    {
      provide: 'IConfigService',
      useExisting: ConfigService,
    },
    SdlcCommand,
    HandoffCommand,
    GenerateDomainCommand,
    GateStatusCommand,
    ScaffoldCommand,
    TopologyCommand,
    RecommendCommand,
    PhaseArtifactsCommand,
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
    SatelliteAdoptCommand,
    AliasService,
    AliasCommand,
    SatelliteCreateCommand,
    ChatCommand,
    ValidateSatelliteUseCase,
    EvaluateGateUseCase,
    ProposePhaseAdvanceUseCase,
    {
      provide: RulesetValidatorService,
      useFactory: (fs: IFileSystem, logger: ILogger, configParser: IConfigParser) => {
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
    WizardService,
    InitWizardCommand,
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
      useFactory: (fs: IFileSystem, logger: ILogger) => {
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
