# @evolith/agent-runtime

> **Navegación bilingüe:** [English version](./README.md)

Evolith Agent Runtime: una capa agéntica desacoplada que opera Evolith Core
mediante Puertos y Adaptadores (Arquitectura Hexagonal). Orquesta, recuerda,
valida y ejecuta capacidades del Core a través de puertos. **No** reemplaza a
`.harness` (el ejecutor oficial gobernado) y **no** depende de Hermes ni de
ningún framework de LLM (esos son adaptadores opcionales y reemplazables).

Documentación de arquitectura: [`reference/architecture/agent-runtime`](../../reference/architecture/agent-runtime/README.es.md)
· Decisión: [core/ADR-0102](../../reference/architecture/adrs/core/0102-evolith-agent-runtime.es.md).

## Instalación

Este paquete forma parte de los workspaces del monorepo Evolith. Constrúyelo con
el resto del grafo (`npm run build` en la raíz) o de forma aislada:

```bash
npm --workspace @evolith/agent-runtime run build
npm --workspace @evolith/agent-runtime test
```

## Inicio rápido

```ts
import { createAgentRuntime, parseAgentRuntimeRequest } from '@evolith/agent-runtime';

const { runtime, deps } = createAgentRuntime(); // adaptadores stub/in-memory seguros
const result = await runtime.handle(parseAgentRuntimeRequest({
  intent: 'validate_discovery_gate', tool: 'validate-discovery-gate',
  tenant: 'acme', initiative: 'init_001', phase: 'discovery', gate: 'prd_readiness',
  parameters: { requiredArtifacts: ['prd'], presentArtifacts: ['prd'] },
}));
```

Un ejemplo ejecutable: `examples/validate-discovery-gate.mjs`.

## Arquitectura

El paquete es hexagonal: `domain` (contratos, puertos, tokens), `application`
(el servicio de orquestación + mapeadores puros), `adapters` (tecnología
concreta) y una factory `bootstrap`. Ningún framework ni LLM es dependencia del
dominio.

## Puertos

`IAgentRuntime`, `IHarnessPort`, `ICoreEvaluationPort`, `IPolicyValidationPort`,
`ITrackerTracePort`, `IMemoryPort`, `ISkillRegistryPort`, `ISchedulerPort`,
`ICommunicationGatewayPort`, `IApprovalPort`, `IAgentEnginePort`.

## Adaptadores

Los valores por defecto son in-memory/stub. Adaptadores reales:
`HarnessProcessAdapter` (lee `.harness/manifest.yaml`),
`OpaCliPolicyValidationAdapter`, `HttpTrackerTraceAdapter` y `HermesAgentAdapter`
(motor opcional).

## Scripts

```bash
npm run build                  # tsc -> dist/
npm test                       # jest
npm run example:discovery-gate # ejecuta el ejemplo extremo a extremo (tras build)
```
