# @beyondnet/evolith-agent-runtime

> **Navegación bilingüe:** [English version](./README.md)

Evolith Agent Runtime: una capa agéntica desacoplada que opera Evolith Core
mediante Puertos y Adaptadores (Arquitectura Hexagonal). Orquesta, recuerda,
valida y ejecuta capacidades del Core a través de puertos. **No** reemplaza a
`.harness` (el ejecutor oficial gobernado) y **no** depende de Hermes ni de
ningún framework de LLM (esos son adaptadores opcionales y reemplazables).

Documentación de arquitectura: [`reference/core/architecture/foundations`](../../../reference/core/architecture/foundations/README.es.md)
· Decisión: [core/ADR-0102](../../../reference/core/architecture/adrs/core/0102-evolith-agent-runtime.es.md).

## Instalación

Este paquete forma parte de los workspaces del monorepo Evolith. Constrúyelo con
el resto del grafo (`npm run build` en la raíz) o de forma aislada:

```bash
npm --workspace @beyondnet/evolith-agent-runtime run build
npm --workspace @beyondnet/evolith-agent-runtime test
```

## Inicio rápido

```ts
import { createAgentRuntime, parseAgentRuntimeRequest } from '@beyondnet/evolith-agent-runtime';

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
`OpaCliPolicyValidationAdapter`, `HttpTrackerTraceAdapter`,
`InProcessCoreEvaluationAdapter` / `HttpCoreEvaluationAdapter` (ejecutan el Core
stateless real, in-process o vía el Core API), `FileSchedulerAdapter` /
`FileMemoryAdapter` (durables, respaldados por archivo) y `HermesAgentAdapter`
(motor opcional).

## Versionado y estabilidad de contrato

Este paquete sigue **SemVer**. La superficie pública son los tres exports por
subpath declarados en `package.json` — `.` (principal), `./ports` y
`./adapters`. El guardián `public-surface.spec.ts` congela la superficie de
valores en runtime de `.` y `./adapters`, de modo que añadir, quitar o renombrar
un export público es un cambio deliberado y revisado.

- **`./ports`** es una superficie solo de tipos (interfaces de puerto + tipos de
  contrato canónicos). Se congela a nivel de tipos — el `tsc` del consumidor es
  el guardián.
- **`schemaVersion`** en `EvaluationResult` (y cualquier otro contrato
  versionado) es independiente de la versión del paquete: se sube **solo** ante
  un cambio incompatible de la forma de ese contrato, nunca por campos aditivos.
- **Deprecación:** un export público se marca `@deprecated` (nombrando su
  reemplazo) por al menos un minor antes de quitarlo; quitar o renombrar va en un
  **major**, los exports aditivos van en un **minor**.

## Scripts

```bash
npm run build                  # tsc -> dist/
npm test                       # jest
npm run example:discovery-gate # ejecuta el ejemplo extremo a extremo (tras build)
```
