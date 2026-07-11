# Evolith Agent Runtime — Casos prácticos

> **Navegación bilingüe:** [English version](./practical-cases.md)

Cada caso siguiente está ejercitado por la suite de pruebas
([`agent-runtime.service.spec.ts`](../../../../src/packages/agent-runtime/src/__tests__/agent-runtime.service.spec.ts))
y/o el ejemplo ejecutable. Todos usan los valores por defecto de
`createAgentRuntime()` salvo que se indique.

## 1. Validar un gate de Discovery

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

## 2. Revisar los artefactos obligatorios de una iniciativa

```ts
await runtime.handle(parseAgentRuntimeRequest({
  initiative: 'init_001', intent: 'check_initiative_artifacts',
  tool: 'check-initiative-artifacts',
  parameters: { requiredArtifacts: ['prd', 'adr'], presentArtifacts: ['prd'] },
}));
// status: 'blocked', missingArtifacts: ['adr']
```

## 3. Validar un ADR contra reglas de arquitectura

```ts
await runtime.handle(parseAgentRuntimeRequest({
  intent: 'validate_adr', tool: 'validate-adr-architecture',
  parameters: { adr: 'ADR-0102' },
}));
// compuesto: .harness adr-architecture-validator + evaluación de arquitectura del Core + OPA
```

## 4. Ejecutar una auditoría de OPA/rulesets

```ts
await runtime.handle(parseAgentRuntimeRequest({
  intent: 'run_opa_audit', tool: 'run-opa-audit',
  parameters: { expectedViolations: ['style.line_too_long'] },
}));
// status: 'warning', findings[0].source: 'harness' (la auditoría ES el motor de política)
```

En producción, cablea `OpaCliPolicyValidationAdapter` y/o una entrada de manifest
con `runner: opa` para que se ejecute el `.harness/bin/opa` real.

## 5. Recomendar cómo desbloquear una iniciativa bloqueada

```ts
const result = await runtime.handle(parseAgentRuntimeRequest({
  initiative: 'init_001', intent: 'recommend_unblock',
  tool: 'recommend-initiative-unblock',
  parameters: { missing_artifacts: ['prd'], expectedVerdict: 'FAIL' },
}));
// result.recommendations: próximos pasos accionables desde la evaluación del Core
```

## 6. Publicar un evento de trazabilidad hacia Tracker

La trazabilidad se emite automáticamente en cada ejecución gobernada. Para
inspeccionarla con el adaptador por defecto, o para publicar a un Tracker en
vivo:

```ts
const { runtime, deps } = createAgentRuntime(); // InMemoryTrackerTraceAdapter
await runtime.handle(/* cualquier petición */);
console.log(deps.tracker.events.map(e => e.type));
// ['harness.executed','core.evaluated','policy.validated','runtime.completed']

// Producción: createAgentRuntime({ tracker: new HttpTrackerTraceAdapter({ endpoint }) })
```

## 7. Ejecutar una tool desde CLI o chat

```ts
const gw = new CliCommunicationGatewayAdapter();
const request = await gw.parse(
  'validate-discovery-gate tenant=acme gate=prd_readiness requiredArtifacts=prd,adr',
);
const result = await runtime.handle(request);
console.log(await gw.present(result)); // renderizado amigable para terminal
```

## 8. Usar Hermes como adaptador opcional

```ts
import { HermesAgentAdapter } from '@beyondnet/evolith-agent-runtime';

// Inyecta un cliente Hermes real (adaptado al puerto HermesClient), o deja que
// cargue de forma perezosa '@beyondnet/evolith-hermes-agent'. Sin motor instalado, conserva el stub.
const { runtime } = createAgentRuntime({ engine: new HermesAgentAdapter({ client }) });
await runtime.handle(parseAgentRuntimeRequest({ intent: 'help me validate discovery' }));
// Hermes propone un tool; el runtime sigue aplicando aprobación + política + traza
```

El Core nunca importa Hermes; reemplazarlo por otro motor es un adaptador
hermano. Consulta [Extender](./extending.es.md#integrar-hermes-como-adaptador-reemplazable).
