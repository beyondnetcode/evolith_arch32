import { Module } from '@nestjs/common';
import { NodeFileSystemProvider } from './infrastructure/providers/node-filesystem.provider';
import { NestLoggerProvider } from './infrastructure/providers/logger.provider';
import { YamlConfigParserProvider } from './infrastructure/providers/config-parser.provider';

import {
  EvaluateGateUseCase,
  InitializeProjectUseCase,
  ProposePhaseAdvanceUseCase,
  ValidateSatelliteUseCase
} from '@evolith/core-domain/application/use-cases';
import {
  PhaseGateValidatorService,
  RulesetValidatorService,
  ArchitectureDriftService
} from '@evolith/core-domain/application/validators';
import { IFileSystem, ILogger, IConfigParser } from '@evolith/core-domain/domain/interfaces';
import { DiskRulesetRepository } from './infrastructure/adapters/disk-ruleset.repository';

const CoreDomainProviders = [
  {
    provide: 'IFileSystem',
    useFactory: () => new NodeFileSystemProvider().createFileSystem(),
  },
  {
    provide: 'ILogger',
    useFactory: () => new NestLoggerProvider().createLogger('CoreApi'),
  },
  {
    provide: 'IConfigParser',
    useFactory: () => new YamlConfigParserProvider().createConfigParser('yaml'),
  },
  {
    provide: 'IRulesetRepository',
    useFactory: (fs: IFileSystem, logger: ILogger) => new DiskRulesetRepository(fs, logger),
    inject: ['IFileSystem', 'ILogger'],
  },
  {
    provide: RulesetValidatorService,
    useFactory: (fs: IFileSystem, logger: ILogger, configParser: IConfigParser, rulesetRepo: any) => {
      return new RulesetValidatorService({ fileSystem: fs, logger, configParser, rulesetRepo });
    },
    inject: ['IFileSystem', 'ILogger', 'IConfigParser', 'IRulesetRepository'],
  },
  {
    provide: PhaseGateValidatorService,
    useFactory: (fs: IFileSystem, logger: ILogger, rulesetValidator: RulesetValidatorService) => {
      return new PhaseGateValidatorService(undefined, { fileSystem: fs, logger, rulesetValidator });
    },
    inject: ['IFileSystem', 'ILogger', RulesetValidatorService],
  },
  {
    provide: ArchitectureDriftService,
    useFactory: (fs: IFileSystem, logger: ILogger, validator: RulesetValidatorService) => {
      return new ArchitectureDriftService(undefined, { fileSystem: fs, logger, validator });
    },
    inject: ['IFileSystem', 'ILogger', RulesetValidatorService],
  },
  {
    provide: EvaluateGateUseCase,
    useFactory: (fs: IFileSystem, logger: ILogger, validator: PhaseGateValidatorService) => {
      return new EvaluateGateUseCase(fs, logger, validator);
    },
    inject: ['IFileSystem', 'ILogger', PhaseGateValidatorService],
  },
  {
    provide: InitializeProjectUseCase,
    useFactory: (fs: IFileSystem, logger: ILogger) => {
      return new InitializeProjectUseCase(undefined, undefined, fs, logger);
    },
    inject: ['IFileSystem', 'ILogger'],
  },
  {
    provide: ProposePhaseAdvanceUseCase,
    useFactory: (fs: IFileSystem, logger: ILogger, phaseGateValidator: PhaseGateValidatorService) => {
      return new ProposePhaseAdvanceUseCase(fs, logger, undefined, phaseGateValidator);
    },
    inject: ['IFileSystem', 'ILogger', PhaseGateValidatorService],
  },
  {
    provide: ValidateSatelliteUseCase,
    useFactory: (fs: IFileSystem, logger: ILogger, validator: RulesetValidatorService) => {
      return new ValidateSatelliteUseCase(fs, logger, validator);
    },
    inject: ['IFileSystem', 'ILogger', RulesetValidatorService],
  }
];

@Module({
  imports: [],
  providers: CoreDomainProviders,
  exports: CoreDomainProviders,
})
export class CoreDomainModule {}
