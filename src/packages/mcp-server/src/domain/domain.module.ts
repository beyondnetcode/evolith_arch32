import { Module } from '@nestjs/common';
import { RulesetValidatorService } from '@beyondnet/evolith-core';
import {
  NodeFileSystemProvider,
  YamlConfigParserProvider,
  NestLoggerProvider,
  DiskRulesetRepository,
  WebhookAdapter,
  MoscowPrioritizationService,
  NodeProcessRunner,
} from '@beyondnet/evolith-infra-providers';
import { FILE_SYSTEM, CONFIG_PARSER } from './domain.tokens';

/**
 * Wires the shared business logic (`@beyondnet/evolith-core`) with the shared
 * infrastructure adapters (`@beyondnet/evolith-infra-providers`) and exports the primitives
 * the tools depend on: a filesystem, a config parser, the ruleset validator, the
 * webhook notifier, and the MoSCoW service. This is the only seam where the MCP
 * Gateway touches concrete infrastructure.
 */
@Module({
  providers: [
    {
      provide: FILE_SYSTEM,
      useFactory: () => new NodeFileSystemProvider().createFileSystem(),
    },
    {
      provide: CONFIG_PARSER,
      useFactory: () => new YamlConfigParserProvider().createConfigParser('yaml'),
    },
    {
      provide: RulesetValidatorService,
      useFactory: (): RulesetValidatorService => {
        const fileSystem = new NodeFileSystemProvider().createFileSystem();
        const configParser = new YamlConfigParserProvider().createConfigParser('yaml');
        const logger = new NestLoggerProvider().createLogger('RulesetValidator');
        const rulesetRepo = new DiskRulesetRepository(fileSystem, logger);
        // GT-519 parity: register the enforcer subsystem on the MCP surface identically to
        // CLI/REST by injecting the real process runner. Non-forking — the composite delegates
        // to the native strategy unless a ruleset authors an `enforce:` block.
        return new RulesetValidatorService({
          fileSystem, configParser, logger, rulesetRepo,
          processRunner: new NodeProcessRunner(),
        });
      },
    },
    { provide: WebhookAdapter, useFactory: () => new WebhookAdapter() },
    { provide: MoscowPrioritizationService, useFactory: () => new MoscowPrioritizationService() },
  ],
  exports: [
    FILE_SYSTEM,
    CONFIG_PARSER,
    RulesetValidatorService,
    WebhookAdapter,
    MoscowPrioritizationService,
  ],
})
export class DomainModule {}
