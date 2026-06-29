export * from './domain/index';
// Canonical Core Evaluation Engine contracts (GT-377 / ADR-0101) are exposed via
// the dedicated subpath '@evolith/core-domain/evaluation/contracts' to avoid a
// barrel name clash with the legacy GateEvaluationResult (satellite-manifest.ts).
// The legacy result is reconciled to the canonical contract in GT-378 (mapper).
