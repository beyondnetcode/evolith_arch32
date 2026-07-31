import { Module } from '@nestjs/common';
import { NodeFileSystemProvider } from '@beyondnet/evolith-infra-providers';
import { NestLoggerProvider } from '@beyondnet/evolith-infra-providers';
import { YamlConfigParserProvider } from '@beyondnet/evolith-infra-providers';
import { NodeProcessRunner } from '@beyondnet/evolith-infra-providers';

import {
  EvaluateGateUseCase,
  InitializeProjectUseCase,
  ProposePhaseAdvanceUseCase,
  ValidateSatelliteUseCase,
  PhaseTransitionUseCase
} from '@beyondnet/evolith-core-domain/application/use-cases';
import {
  PhaseGateValidatorService,
  RulesetValidatorService,
  ArchitectureDriftService
} from '@beyondnet/evolith-core-domain/application/validators';
import { IFileSystem, ILogger, IConfigParser, ICatalogLoader } from '@beyondnet/evolith-core-domain/domain/interfaces';
import { CachingRulesetRepository, DiskRulesetRepository } from '@beyondnet/evolith-infra-providers';
import { TopologyCatalogService, TopologyRecommendationService, PhaseArtifactProfileService, PatternCatalogService } from '@beyondnet/evolith-core-domain/application/services';

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
    // GT-648: core-api is a long-running process, so the corpus is loaded ONCE
    // and reused. Before this, `RuleEvaluationEngine.discoverAndEvaluate` called
    // `loadAllRulesets` on every `POST /api/v1/evaluate` — a full directory walk
    // plus an Ajv pass over ~176 files, all synchronous CPU work that blocks the
    // event loop. It is why a `GET /health` measured 498 ms end-to-end at 1 VU
    // while its own handler reported `durationMs=0`.
    //
    // The decorator, not the disk repository, holds the cache: the CLI is a
    // one-shot process that must keep re-reading disk between invocations, and
    // caching inside `DiskRulesetRepository` would have made "load once" a
    // property of the adapter instead of a property of THIS deployment.
    provide: 'IRulesetRepository',
    useFactory: (fs: IFileSystem, logger: ILogger) =>
      new CachingRulesetRepository(new DiskRulesetRepository(fs, logger), logger),
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
    provide: PatternCatalogService,
    useFactory: (fs: IFileSystem, logger: ILogger) => new PatternCatalogService(fs, logger),
    inject: ['IFileSystem', 'ILogger'],
  },
  {
    provide: TopologyRecommendationService,
    useFactory: () => new TopologyRecommendationService(),
  },
  {
    provide: PhaseArtifactProfileService,
    useFactory: () => new PhaseArtifactProfileService(),
  },
  {
    provide: RulesetValidatorService,
    useFactory: (fs: IFileSystem, logger: ILogger, configParser: IConfigParser, rulesetRepo: any, topologyCatalog: TopologyCatalogService) => {
      // GT-519 parity: register the enforcer subsystem on the REST surface identically to
      // CLI/MCP by injecting the real process runner, so `enforce:`-routed rules run their
      // external analyzers. Non-forking — without enforcer rules the composite delegates to
      // the native/opa strategy, so existing behaviour is preserved.
      return new RulesetValidatorService({
        fileSystem: fs, logger, configParser, rulesetRepo, topologyCatalog,
        processRunner: new NodeProcessRunner(),
      });
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
