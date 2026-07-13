/**
 * Canonical Core Evaluation Engine contracts (GT-377 / ADR-0101).
 *
 * The stateless interaction contract: a consumer sends an {@link EvaluationContext}
 * and the Core returns an {@link EvaluationResult}. These are temporary
 * evaluation shapes — the Core never persists product/tenant/initiative.
 */

export * from './evaluation-context';
export * from './evaluation-result';
export * from './quality-evidence';
