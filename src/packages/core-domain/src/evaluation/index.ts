/**
 * Core Evaluation Engine (GT-377/GT-378 / ADR-0101).
 *
 * Stateless: a consumer sends an EvaluationContext to the EvaluationOrchestrator
 * and receives an EvaluationResult. Composes the existing evaluation pipeline.
 */

export * from './contracts';
export * from '../domain/violation';
export * from '../domain/codeowners';
export * from '../domain/ownership';
export * from '../domain/waiver';
export * from './sarif-exporter';
export * from './drift-gate';
export * from './ports/evaluation-pipeline.port';
export * from './ports/workspace-reference-resolver.port';
export * from './ports/kind-evaluator.port';
export * from './evaluation-context.builder';
export * from './canonical-result.mapper';
export * from './evaluation-orchestrator.service';
export * from './kind-evaluators';
