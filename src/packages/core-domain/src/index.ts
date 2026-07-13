export * from './domain/index';

// Enforcer process-execution port + provisioning/sandbox contracts (GT-512/GT-514 · EAG-04/08).
// The public seam an infra adapter (e.g. a real child_process runner) implements, plus the
// pure provisioning API (restore plan/execution, project scope, SHA cache, sandbox policy).
export type {
  IProcessRunner,
  ProcessSpec,
  ProcessResult,
  EnforcerRuntime,
} from './application/validators/enforcement/enforcer.types';
export {
  buildRestorePlan,
  resolveProjectScope,
  computeEvaluationCacheKey,
  InMemoryEvaluationCache,
  enforceSandboxPolicy,
  DEFAULT_SANDBOX_POLICY,
  SandboxedProcessRunner,
  resolveRuntimeFromManifest,
  resolveRestorePlanFromManifest,
  executeRestorePlan,
  provisionEvaluationEnvironment,
  materializeAndProvisionEnvironment,
} from './application/validators/enforcement/provisioning';
export type {
  ProjectScope,
  IEvaluationCache,
  SandboxPolicy,
  SandboxDecision,
  RestoreStepResult,
  RestoreResult,
  ProvisionRequest,
  ProvisionedEnvironment,
  RepositorySourceRef,
  RepositorySources,
  IRepositorySourceReader,
  IWorkspaceMaterializer,
  ManifestParser,
  MaterializeProvisionRequest,
  MaterializedEnvironment,
} from './application/validators/enforcement/provisioning';
// Canonical Core Evaluation Engine contracts (GT-377 / ADR-0101) are exposed via
// the dedicated subpath '@beyondnet/evolith-core-domain/evaluation/contracts'. The former
// barrel name clash is resolved (W-Contracts): the pipeline's internal DTO is now
// `PipelineGateResult` (satellite-manifest.ts), so `GateEvaluationResult` names only
// the canonical contract. The pipeline DTO is reconciled to it in GT-378 (mapper).
