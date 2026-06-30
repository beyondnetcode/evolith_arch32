# Evolith Agent Runtime — Extender

> **Navegación bilingüe:** [English version](./extending.md)

Cómo agregar skills, escribir adaptadores, manejar el runtime desde una
superficie CLI/chat y enchufar Hermes, todo sin tocar el núcleo del runtime.

## Agregar una nueva skill o tool

Una skill mapea un intent a una capacidad gobernada. Agrega una entrada en
[`default-skills.ts`](../../../packages/agent-runtime/src/adapters/skills/default-skills.ts)
o registra una en tiempo de ejecución:

```ts
await deps.skillRegistry.register({
  id: 'validate-design-gate',
  description: 'Validate the Design phase gate.',
  intents: ['validate_design_gate'],
  kind: 'composite',                       // harness produce hechos, Core evalúa
  harnessCapability: 'sdlc-phase-gate-validator',
  evaluationKinds: ['gate'],
  permissions: ['read:repo', 'run:validator'],
  requiresApproval: false,
  emitsTrace: true,
  requiresPolicy: true,
  policyRef: 'evolith.gates.design',
});
```

Si la skill se respalda en harness, declara también su capacidad en
[`.harness/manifest.yaml`](../../../.harness/manifest.yaml). Las banderas de
gobernanza (`requiresApproval`, `emitsTrace`, `requiresPolicy`) las aplica el
runtime de forma uniforme sin importar qué adaptador ejecute.

## Agregar un nuevo adaptador

Implementa el puerto correspondiente e inyéctalo. Ejemplo: una memoria respaldada
en Redis.

```ts
import type { IMemoryPort, MemoryEntry } from '@evolith/agent-runtime';

export class RedisMemoryAdapter implements IMemoryPort {
  async remember(key: string, value: unknown, ns?: string) { /* ... */ }
  async recall<T>(key: string, ns?: string): Promise<T | undefined> { /* ... */ return undefined; }
  async append(ns: string, value: unknown) { /* ... */ }
  async history(ns: string, limit?: number): Promise<readonly MemoryEntry[]> { return []; }
}

const { runtime } = createAgentRuntime({ memory: new RedisMemoryAdapter() });
```

Nada más cambia: el runtime depende solo del puerto. El mismo patrón aplica a cada
puerto (`IHarnessPort`, `ICoreEvaluationPort`, etc.).

## Usar el runtime desde CLI o chat

`CliCommunicationGatewayAdapter` parsea una cadena de comando o un objeto de wire
y renderiza el resultado:

```ts
const gw = new CliCommunicationGatewayAdapter();
const req = await gw.parse('run-opa-audit tenant=acme');
const result = await runtime.handle(req);
process.stdout.write(await gw.present(result));
```

Un endpoint REST, un bot de Slack o un webhook son adaptadores hermanos sobre
`ICommunicationGatewayPort`.

## Integrar Hermes como adaptador reemplazable

Hermes es un **motor opcional** detrás de `IAgentEnginePort`. Se importa solo
dentro de `HermesAgentAdapter`, y aun ahí de forma perezosa (import dinámico),
para que el paquete compile sin Hermes instalado.

```ts
import { HermesAgentAdapter, type HermesClient } from '@evolith/agent-runtime';

// Opción A: inyecta un cliente adaptado al puerto HermesClient.
const client: HermesClient = {
  async complete({ goal, context, tools }) {
    // llama al SDK real de Hermes aquí, mapea a { tool, arguments, rationale }
    return { tool: 'validate-discovery-gate', rationale: 'matched discovery goal' };
  },
};
const { runtime } = createAgentRuntime({ engine: new HermesAgentAdapter({ client }) });

// Opción B: carga perezosa de un módulo (por defecto '@evolith/hermes-agent').
createAgentRuntime({ engine: new HermesAgentAdapter({ moduleName: '@evolith/hermes-agent' }) });
```

Para reemplazar Hermes por otro framework (o un motor propio), escribe un nuevo
adaptador que implemente `IAgentEnginePort` e inyéctalo. El dominio y el Core
nunca cambian: ese es justamente el propósito del puerto.

## Probar tu extensión

Inyecta relojes/ids determinísticos y verifica el resultado + la traza:

```ts
const { runtime, deps } = createAgentRuntime({
  now: () => '2026-06-29T00:00:00.000Z',
  policy: new StubPolicyValidationAdapter(() => [/* simula una denegación */]),
});
const result = await runtime.handle(/* petición */);
expect(result.status).toBe('blocked');
expect(deps.tracker.events.map(e => e.type)).toContain('runtime.completed');
```

Consulta las suites existentes en
[`packages/agent-runtime/src/__tests__`](../../../packages/agent-runtime/src/__tests__).
