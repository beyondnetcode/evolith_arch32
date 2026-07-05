/**
 * @evolith/core — Shared business logic facade
 *
 * This package wraps @evolith/core-domain and re-exports key types,
 * use-cases, and validators so consumers (CLI, MCP Server, API)
 * import from a single place.
 */

// Re-export interfaces
export type {
  IFileSystem,
  IConfigParser,
  ILogger,
  ICommandExecutor,
  IPhaseGates,
  IToolSelector,
  IToolExecutor,
  IProjectInitializer,
  ICatalogLoader,
} from "@evolith/core-domain/domain/interfaces";

// Re-export domain errors
export {
  EvolithError,
  PlatformNotFoundError,
  PhaseTransitionError,
  CatalogLoadError,
  ToolValidationError,
  CommandExecutionError,
  ValidationError,
  UserCancelledError,
  isEvolithError,
  getErrorCode,
  getErrorContext,
} from "@evolith/core-domain/domain/errors";

// Re-export gate evidence types
export {
  createSuccessEnvelope,
  createErrorEnvelope,
  deriveVerdict,
  isGatePhase,
  isErrorCode,
  GATE_PHASES,
  GATE_VERDICTS,
  VIOLATION_SEVERITIES,
  EVALUATOR_KINDS,
  ERROR_CODES,
} from "@evolith/core-domain/domain/gate-evidence";

export type {
  GatePhase,
  GateVerdict,
  ViolationSeverity,
  EvaluatorKind,
  ErrorCode,
  GateViolation,
  GateEvidence,
  PhaseTransitionProposal,
  ExecutionContext,
  OutputMeta,
  OutputError,
  SuccessEnvelope,
  ErrorEnvelope,
  OutputEnvelope,
} from "@evolith/core-domain/domain/gate-evidence";

// Re-export domain services
export {
  WorkflowEngine,
  ToolSelectionService,
  PhaseService,
} from "@evolith/core-domain/domain/services";

// Re-export use-cases
export {
  EvaluateGateUseCase,
  ValidateSatelliteUseCase,
  ProposePhaseAdvanceUseCase,
  PhaseTransitionUseCase,
  InitializeProjectUseCase,
} from "@evolith/core-domain/application/use-cases";

export type {
  EvaluateGateInput,
  ValidateSatelliteInput,
  ValidateSatelliteOutput,
  ProposePhaseAdvanceInput,
} from "@evolith/core-domain/application/use-cases";

// Re-export application validators
export {
  RulesetValidatorService,
  PhaseGateValidatorService,
  ArchitectureDriftService,
} from "@evolith/core-domain/application/validators";

export {
  TopologyCatalogService,
  TopologyRecommendationService,
  PhaseArtifactProfileService,
} from "@evolith/core-domain/application/services";

export type {
  TopologyManifest,
  ProgressivePhase,
  TopologyRecommendationRules,
  TopologyRecommendationSignals,
  TopologyRecommendation,
  TopologyDesignProfile,
  DownstreamPhase,
  PhaseArtifactResult,
} from "@evolith/core-domain/application/services";

export type { ValidationResult } from "@evolith/core-domain/application/validators/ruleset-validator.service";

// Re-export deep architecture analyzer (used by the architecture MCP tool)
export { DeepArchitectureAnalyzer } from "@evolith/core-domain/application/validators/deep-architecture-analyzer";

// Re-export Git metrics readers (used by the DORA MCP tool)
export {
  readGitLog,
  isGitRepo,
} from "@evolith/core-domain/domain/metrics/git-log-reader";

export type {
  GitCommit,
  GitLogOptions,
} from "@evolith/core-domain/domain/metrics/git-log-reader";
