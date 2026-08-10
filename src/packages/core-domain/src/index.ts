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
export { PROCESS_TIMEOUT_EXIT_CODE } from './application/validators/enforcement/enforcer.types';
// GT-664 — the enforcer wall clock. A tool that exceeds it SKIPs the rules
// routed to it; it is never read as "0 violations → passed".
export {
  DEFAULT_ENFORCER_TIMEOUT_MS,
  ENFORCER_TIMEOUT_GRACE_MS,
  EnforcerTimeoutError,
  resolveEnforcerTimeoutMs,
} from './application/validators/enforcement/shell-enforcer-adapter';
// Enforcer OTel metrics port (GT-519 · EAG-14 — AC3). The public seam a host maps onto a real
// OpenTelemetry `Meter` so enforcer runs emit duration/failure/timeout/violation telemetry. Ships
// a zero-cost noop default + an in-memory recorder; core-domain never depends on the OTel SDK.
export type {
  IEnforcerMetrics,
  EnforcerMetricDescriptor,
  EnforcerRunAttributes,
  EnforcerDurationSample,
  EnforcerFailureSample,
  EnforcerTimeoutSample,
  EnforcerViolationSample,
  EnforcerRunOutcome,
  EnforcerFailureReason,
} from './application/validators/enforcement/enforcer-metrics';
export {
  ENFORCER_METRICS,
  NoopEnforcerMetrics,
  RecordingEnforcerMetrics,
} from './application/validators/enforcement/enforcer-metrics';
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
