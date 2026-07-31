/** Enforcer orchestration seam (GT-514 · EAG-08). */
export * from './enforcer.types';
export * from './shell-enforcer-adapter';
export * from './enforcer-evaluator';
export * from './enforcer-metrics';
export * from './composite-rule-evaluator';
export * from './enforcer-subsystem';
export * from './edit-gate';
export * from './c4-compiler';
export * from './structurizr-parser';
/** C4 element ↔ code module correspondence: propose → HITL-confirm → replay (GT-590). */
export * from './c4-binding';

/** Concrete adapters + ingesters (GT-515 · EAG-09; GT-524 .NET/NetArchTest). */
export * from './adapters/dependency-cruiser-adapter';
export * from './adapters/netarchtest-adapter';
export * from './sarif-ingester';

/** Freezing / baseline / ratchet (GT-517 · EAG-12). */
export * from './policy-baseline';

/** Evaluation-environment provisioning — restore/scoping/cache/sandbox (GT-512 · EAG-04). */
export * from './provisioning';
