import { Module } from '@nestjs/common';
import { NodeFileSystemProvider } from '@evolith/infra-providers';
import { NestLoggerProvider } from '@evolith/infra-providers';
import { YamlConfigParserProvider } from '@evolith/infra-providers';

import {
  EvaluateGateUseCase,
  InitializeProjectUseCase,
  ProposePhaseAdvanceUseCase,
  ValidateSatelliteUseCase,
  PhaseTransitionUseCase
} from '@evolith/core-domain/application/use-cases';
import {
  PhaseGateValidatorService,
  RulesetValidatorService,
  ArchitectureDriftService
} from '@evolith/core-domain/application/validators';
import { IFileSystem, ILogger, IConfigParser, ICatalogLoader } from '@evolith/core-domain/domain/interfaces';
import { DiskRulesetRepository } from '@evolith/infra-providers';
import { TopologyCatalogService, TopologyRecommendationService } from '@evolith/core-domain/application/services';

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
    provide: 'ICatalogLoader',
    useValue: {
      loadRuntimeCatalog: () => [
        {
          id: 'nodejs',
          name: 'Node.js',
          versions: ['20'],
          defaultVersion: '20',
          language: 'typescript',
          typeSystem: 'static',
          frameworks: [],
          databases: [],
          buildTools: [],
          testFrameworks: [],
          packageManager: 'npm',
        },
      ],
      loadToolCatalog: () => ({ phases: {}, toolMetadata: {} }),
      loadCommandsMatrix: () => ({
        runtimes: {},
        monorepos: {},
        container: { delegated: [], unsupported: [] },
        observability: { scaffold: [], delegated: [] },
      }),
      getMonorepoOptions: () => [
        {
          id: 'npm-workspaces',
          name: 'npm workspaces',
          description: 'Single-repo workspace layout',
          defaults: { structure: 'workspace', ciStrategy: 'github-actions' },
        },
      ],
      getArchitecturePatterns: () => [
        {
          id: 'clean',
          name: 'Clean Architecture',
          description: 'Layered architecture baseline',
          layers: ['domain', 'application', 'infrastructure', 'presentation'],
        },
      ],
      getDefaultDatabase: () => 'postgresql',
      getApiProtocols: () => [{ id: 'rest', name: 'REST', description: 'REST API' }],
    } satisfies ICatalogLoader,
  },
  {
    provide: TopologyCatalogService,
    useFactory: (fs: IFileSystem, logger: ILogger) => new TopologyCatalogService(fs, logger),
    inject: ['IFileSystem', 'ILogger'],
  },
  {
    provide: TopologyRecommendationService,
    useFactory: () => new TopologyRecommendationService(),
  },
  {
    provide: RulesetValidatorService,
    useFactory: (fs: IFileSystem, logger: ILogger, configParser: IConfigParser, rulesetRepo: any, topologyCatalog: TopologyCatalogService) => {
      return new RulesetValidatorService({ fileSystem: fs, logger, configParser, rulesetRepo, topologyCatalog });
    },
    inject: ['IFileSystem', 'ILogger', 'IConfigParser', 'IRulesetRepository', TopologyCatalogService],
  },
  {
    provide: PhaseGateValidatorService,
    useFactory: (fs: IFileSystem, logger: ILogger) => {
      return new PhaseGateValidatorService(undefined, { fileSystem: fs, logger });
    },
    inject: ['IFileSystem', 'ILogger'],
  },
  {
    provide: 'VALIDATOR_FACTORY',
    useFactory: (fs: IFileSystem, logger: ILogger) => {
      return (corePath?: string) => new PhaseGateValidatorService(corePath, {
        fileSystem: fs,
        logger,
      });
    },
    inject: ['IFileSystem', 'ILogger'],
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
    useFactory: (validatorFactory: (corePath?: string) => PhaseGateValidatorService) => {
      return new EvaluateGateUseCase(validatorFactory);
    },
    inject: ['VALIDATOR_FACTORY'],
  },
  {
    provide: InitializeProjectUseCase,
    useFactory: (fs: IFileSystem, catalogLoader: ICatalogLoader) => {
      return new InitializeProjectUseCase(fs, catalogLoader);
    },
    inject: ['IFileSystem', 'ICatalogLoader'],
  },
  {
    provide: ProposePhaseAdvanceUseCase,
    useFactory: (evaluateGateUseCase: EvaluateGateUseCase) => {
      return new ProposePhaseAdvanceUseCase(evaluateGateUseCase);
    },
    inject: [EvaluateGateUseCase],
  },
  {
    provide: ValidateSatelliteUseCase,
    useFactory: (validator: RulesetValidatorService) => {
      return new ValidateSatelliteUseCase(validator);
    },
    inject: [RulesetValidatorService],
  },
  {
    provide: PhaseTransitionUseCase,
    useFactory: (fs: IFileSystem, logger: ILogger) => {
      return new PhaseTransitionUseCase(fs, undefined, undefined, logger);
    },
    inject: ['IFileSystem', 'ILogger'],
  }
];

@Module({
  imports: [],
  providers: CoreDomainProviders,
  exports: CoreDomainProviders,
})
export class CoreDomainModule {}
