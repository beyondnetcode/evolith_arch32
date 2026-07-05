// The legacy `gate-evaluator.ts` engine (a parallel GateEvaluationResult shape:
// { phase, passed, score, violations, timestamp }) was orphaned dead code and has
// been removed (W-Contracts). The canonical gate decision contract lives in
// `gates/decision` (CoreGateVerdict / GateDecision), and the canonical evaluation
// result contract is `@beyondnet/evolith-core-domain/evaluation/contracts` (GateEvaluationResult).
export * from './decision';
