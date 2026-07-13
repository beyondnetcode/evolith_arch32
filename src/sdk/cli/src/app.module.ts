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
import { SyncService } from '@beyondnet/evolith-core-domain/application/sync/sync.service';
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
import { EnforceCommand } from './commands/enforce/enforce.command';

import { ValidateSatelliteUseCase } from '@beyondnet/evolith-core-domain/application/use-cases/validate-satellite.use-case';
import { EvaluateGateUseCase } from '@beyondnet/evolith-core-domain/application/use-cases/evaluate-gate.use-case';
import { PhaseGateValidatorService } from '@beyondnet/evolith-core-domain/application/validators/phase-gate-validator.service';
import { ProposePhaseAdvanceUseCase } from '@beyondnet/evolith-core-domain/application/use-cases/propose-phase-advance.use-case';
import { RulesetValidatorService } from '@beyondnet/evolith-core-domain/application/validators/ruleset-validator.service';
import { ArchitectureDriftService } from '@beyondnet/evolith-core-domain/application/validators/architecture-drift.service';
import type { IFileSystem, ILogger, IConfigParser } from '@beyondnet/evolith-core-domain/domain/interfaces';
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
  NodeProcessRunner,
} from '@beyondnet/evolith-infra-providers';
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
    EnforceCommand,
    EvaluateGateUseCase,
    ProposePhaseAdvanceUseCase,
    {
      provide: RulesetValidatorService,
      useFactory: (fs: IFileSystem, logger: ILogger, configParser: IConfigParser) => {
        // GT-519 parity: register the enforcer subsystem on the CLI surface identically to
        // REST/MCP by injecting the real process runner. Non-forking — the composite delegates
        // to the native strategy unless a ruleset authors an `enforce:` block.
        return new RulesetValidatorService({
          fileSystem: fs,
          logger,
          configParser,
          rulesetRepo: new DiskRulesetRepository(fs, logger),
          processRunner: new NodeProcessRunner(),
        });
      },
      inject: ['IFileSystem', 'ILogger', 'IConfigParser'],
    },
    {
      // ValidateSatelliteUseCase constructs a bare RulesetValidatorService when
      // given no validator — which throws `IConfigParser is required` at DI time.
      // Inject the fully-wired validator so `evaluate`/`validate` construct cleanly.
      provide: ValidateSatelliteUseCase,
      useFactory: (validator: RulesetValidatorService) => new ValidateSatelliteUseCase(validator),
      inject: [RulesetValidatorService],
    },
    {
      // ArchitectureDriftService requires fileSystem + logger; the DriftCommand
      // previously constructed it with `new ArchitectureDriftService()` → throws
      // `IFileSystem is required`. Wire it here and inject into the command.
      provide: ArchitectureDriftService,
      useFactory: (fs: IFileSystem, logger: ILogger, validator: RulesetValidatorService) =>
        new ArchitectureDriftService(undefined, { fileSystem: fs, logger, validator }),
      inject: ['IFileSystem', 'ILogger', RulesetValidatorService],
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
