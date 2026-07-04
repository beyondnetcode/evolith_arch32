# Evolith Agent Runtime — Extending

> **Bilingual Navigation:** [Versión en Español](./extending.es.md)

How to add skills, write adapters, drive the runtime from a CLI/chat surface, and
plug in Hermes — all without touching the runtime core.

## Add a new skill or tool

A skill maps an intent to a governed capability. Add an entry to
[`default-skills.ts`](../../../packages/agent-runtime/src/adapters/skills/default-skills.ts)
or register one at runtime:

```ts
await deps.skillRegistry.register({
  id: 'validate-design-gate',
  description: 'Validate the Design phase gate.',
  intents: ['validate_design_gate'],
  kind: 'composite',                       // harness produces facts, Core evaluates
  harnessCapability: 'sdlc-phase-gate-validator',
  evaluationKinds: ['gate'],
  permissions: ['read:repo', 'run:validator'],
  requiresApproval: false,
  emitsTrace: true,
  requiresPolicy: true,
  policyRef: 'evolith.gates.design',
});
```

If the skill is harness-backed, also declare its capability in
[`.harness/manifest.yaml`](../../../.harness/manifest.yaml). The governance flags
(`requiresApproval`, `emitsTrace`, `requiresPolicy`) are enforced uniformly by the
runtime regardless of which adapter runs.

## Add a new adapter

Implement the relevant port and inject it. Example: a Redis-backed memory.

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

Nothing else changes — the runtime depends only on the port. The same pattern
applies to every port (`IHarnessPort`, `ICoreEvaluationPort`, etc.).

## Use the runtime from CLI or chat

`CliCommunicationGatewayAdapter` parses a command string or a wire object and
renders the result:

```ts
const gw = new CliCommunicationGatewayAdapter();
const req = await gw.parse('run-opa-audit tenant=acme');
const result = await runtime.handle(req);
process.stdout.write(await gw.present(result));
```

A REST endpoint, a Slack bot or a webhook are sibling adapters over
`ICommunicationGatewayPort`.

## Integrating Hermes as a replaceable adapter

Hermes is an **optional engine** behind `IAgentEnginePort`. It is imported only
inside `HermesAgentAdapter`, and even there lazily (dynamic import), so the
package builds with Hermes not installed.

```ts
import { HermesAgentAdapter, type HermesClient } from '@evolith/agent-runtime';

// Option A: inject a client adapted to the HermesClient port.
const client: HermesClient = {
  async complete({ goal, context, tools }) {
    // call the real Hermes SDK here, map to { tool, arguments, rationale }
    return { tool: 'validate-discovery-gate', rationale: 'matched discovery goal' };
  },
};
const { runtime } = createAgentRuntime({ engine: new HermesAgentAdapter({ client }) });

// Option B: lazy-load a module (default '@evolith/hermes-agent').
createAgentRuntime({ engine: new HermesAgentAdapter({ moduleName: '@evolith/hermes-agent' }) });
```

### Multi-Engine Routing (Hermes + Swarms)

You can also use the `RoutingAgentAdapter` to route requests dynamically to different engines (like Swarms or Hermes) based on the intent:

```ts
import { createAgentRuntime, type EngineRouterConfig } from '@evolith/agent-runtime';

const engineRouterConfig: EngineRouterConfig = {
  defaultEngine: 'hermes',
  routes: [
    { intentMatches: 'complex-multi-agent', engine: 'swarms' },
    { intentMatches: 'chat', engine: 'hermes' }
  ]
};

// The runtime will automatically wire the Router, SwarmsAgentAdapter, and HermesAgentAdapter
const { runtime } = createAgentRuntime({ engineRouterConfig });
```

To replace Hermes or Swarms with another framework (or an in-house engine), write a new
adapter implementing `IAgentEnginePort` and inject it. The domain and the Core
never change — that is the whole point of the port.

## Testing your extension

Inject deterministic clocks/ids and assert on the result + trace:

```ts
const { runtime, deps } = createAgentRuntime({
  now: () => '2026-06-29T00:00:00.000Z',
  policy: new StubPolicyValidationAdapter(() => [/* simulate a denial */]),
});
const result = await runtime.handle(/* request */);
expect(result.status).toBe('blocked');
expect(deps.tracker.events.map(e => e.type)).toContain('runtime.completed');
```

See the existing suites under
[`packages/agent-runtime/src/__tests__`](../../../packages/agent-runtime/src/__tests__).
