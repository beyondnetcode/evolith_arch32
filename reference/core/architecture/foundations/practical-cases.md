# Evolith Agent Runtime — Practical Cases

> **Bilingual Navigation:** [Versión en Español](./practical-cases.es.md)

Each case below is exercised by the test suite
([`agent-runtime.service.spec.ts`](../../../../src/packages/agent-runtime/src/__tests__/agent-runtime.service.spec.ts))
and/or the runnable example. All use `createAgentRuntime()` defaults unless noted.

## 1. Validate a Discovery gate

```ts
const { runtime } = createAgentRuntime();
const result = await runtime.handle(parseAgentRuntimeRequest({
  tenant: 'tenant_demo', product: 'evolith_tracker', initiative: 'init_001',
  phase: 'discovery', gate: 'prd_readiness', requested_by: 'tracker_chat',
  intent: 'validate_discovery_gate', tool: 'validate-discovery-gate',
  parameters: { requiredArtifacts: ['prd'], presentArtifacts: ['prd'] },
}));
// status: 'passed', trace.validatedBy: '.harness', trace.governedBy: 'evolith_core'
```

## 2. Check an initiative's mandatory artifacts

```ts
await runtime.handle(parseAgentRuntimeRequest({
  initiative: 'init_001', intent: 'check_initiative_artifacts',
  tool: 'check-initiative-artifacts',
  parameters: { requiredArtifacts: ['prd', 'adr'], presentArtifacts: ['prd'] },
}));
// status: 'blocked', missingArtifacts: ['adr']
```

## 3. Validate an ADR against architecture rules

```ts
await runtime.handle(parseAgentRuntimeRequest({
  intent: 'validate_adr', tool: 'validate-adr-architecture',
  parameters: { adr: 'ADR-0102' },
}));
// composite: .harness adr-architecture-validator + Core architecture evaluation + OPA
```

## 4. Run an OPA/ruleset audit

```ts
await runtime.handle(parseAgentRuntimeRequest({
  intent: 'run_opa_audit', tool: 'run-opa-audit',
  parameters: { expectedViolations: ['style.line_too_long'] },
}));
// status: 'warning', findings[0].source: 'harness' (the audit IS the policy engine)
```

In production, wire `OpaCliPolicyValidationAdapter` and/or a `runner: opa`
manifest entry so the real `.harness/bin/opa` runs.

## 5. Recommend how to unblock a blocked initiative

```ts
const result = await runtime.handle(parseAgentRuntimeRequest({
  initiative: 'init_001', intent: 'recommend_unblock',
  tool: 'recommend-initiative-unblock',
  parameters: { missing_artifacts: ['prd'], expectedVerdict: 'FAIL' },
}));
// result.recommendations: actionable next steps from the Core evaluation
```

## 6. Publish a trazability event to Tracker

Trazability is emitted automatically on every governed run. To inspect it with
the default adapter, or to publish to a live Tracker:

```ts
const { runtime, deps } = createAgentRuntime(); // InMemoryTrackerTraceAdapter
await runtime.handle(/* any request */);
console.log(deps.tracker.events.map(e => e.type));
// ['harness.executed','core.evaluated','policy.validated','runtime.completed']

// Production: createAgentRuntime({ tracker: new HttpTrackerTraceAdapter({ endpoint }) })
```

## 7. Run a tool from CLI or chat

```ts
const gw = new CliCommunicationGatewayAdapter();
const request = await gw.parse(
  'validate-discovery-gate tenant=acme gate=prd_readiness requiredArtifacts=prd,adr',
);
const result = await runtime.handle(request);
console.log(await gw.present(result)); // terminal-friendly rendering
```

## 8. Use Hermes as an optional adapter

```ts
import { HermesAgentAdapter } from '@beyondnet/evolith-agent-runtime';

// Inject a real Hermes client (adapted to the HermesClient port), or let it
// lazy-load '@beyondnet/evolith-hermes-agent'. With no engine installed, keep the stub.
const { runtime } = createAgentRuntime({ engine: new HermesAgentAdapter({ client }) });
await runtime.handle(parseAgentRuntimeRequest({ intent: 'help me validate discovery' }));
// Hermes proposes a tool; approval + policy + trace still enforced by the runtime
```

The Core never imports Hermes; replacing it with another engine is a sibling
adapter. See [Extending](./extending.md#integrating-hermes-as-a-replaceable-adapter).
