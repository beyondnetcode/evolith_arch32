export * from './domain/index';
// Canonical Core Evaluation Engine contracts (GT-377 / ADR-0101) are exposed via
// the dedicated subpath '@beyondnet/evolith-core-domain/evaluation/contracts'. The former
// barrel name clash is resolved (W-Contracts): the pipeline's internal DTO is now
// `PipelineGateResult` (satellite-manifest.ts), so `GateEvaluationResult` names only
// the canonical contract. The pipeline DTO is reconciled to it in GT-378 (mapper).
