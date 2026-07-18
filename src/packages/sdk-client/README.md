# @beyondnet/evolith-sdk

Typed TypeScript client library for the Evolith Core **REST API** and **MCP tools**.
It is a thin, transport-injectable wrapper: no global state, no implicit network
configuration, and every method is fully typed against the server contracts.

> Status: **experimental**. The package is published from this monorepo but is not
> yet wired into a first-party application; it exists so external consumers
> (satellite repos, automation scripts, the Tracker BFF) can talk to Evolith Core
> without re-deriving DTOs by hand.

## Purpose

Evolith Core exposes two surfaces:

- a versioned **REST API** served by `apps/core-api` (URI versioning under the
  `api/v` prefix, so live routes are `/api/v1/<resource>`);
- a set of **MCP tools** served by `packages/mcp-server` over JSON-RPC `tools/call`.

This SDK provides one client class per surface and is the single typed integration
point so consumers do not duplicate request shapes.

Since **2.0.0** the response payload types are not hand-authored here: both surfaces
call the same use cases and return the domain objects verbatim, so the SDK re-exports
the canonical contracts from `@beyondnet/evolith-core-domain` (`GateEvidence`,
`GateViolation`, `GatePhase`, `GateVerdict`, `ViolationSeverity`, `EvaluatorKind`,
`ValidationResult`, `ValidationIssue`). What the SDK still owns is genuinely
transport-layer: the response envelope (`ApiEnvelope` / `SuccessEnvelope`, mirroring
`envelope.interceptor.ts`), the request DTOs, and the MCP tool *input* schemas
(`packages/mcp-server/src/tools/*.tools.ts`).

## Intended consumer

- **Satellite repositories** running gate evaluations / drift detection against a
  hosted Evolith Core API.
- **Automation and CI scripts** that need typed access to phase transitions.
- **The Tracker BFF**, which holds the opaque `workspaceRef` and brokers calls to
  Core on behalf of end users.

All request bodies take an opaque `workspaceRef` (issued by the Tracker BFF) rather
than raw credentials, keeping the SDK transport-only.

## REST client

`EvolithRestClient` is a typed `fetch` wrapper. Each method returns the full
`SuccessEnvelope<T>` (`{ success, data, meta }`); non-2xx responses throw
`EvolithApiError`.

| Method | Verb / Route |
| --- | --- |
| `evaluateGate(gateId, body)` | `POST /api/v1/gates/:gateId/evaluate` |
| `evaluatePhaseGate(phase, body)` | resolves phase → gate id, then `evaluateGate` |
| `transitionPhase(body)` | `POST /api/v1/phases/transition` |
| `listTopologies()` | `GET /api/v1/architecture/topologies` |
| `getTopology(id)` | `GET /api/v1/architecture/topologies/:id` |
| `validateSatellite(body)` | `POST /api/v1/architecture/validate-satellite` |
| `detectDrift(body)` | `POST /api/v1/architecture/detect-drift` |
| `invalidateTopologyCache()` | `POST /api/v1/architecture/cache/invalidate` |
| `initProject(body)` | `POST /api/v1/projects/initialize` |
| `proposeAdvance(body)` | `POST /api/v1/projects/propose-advance` |

Constructor options: `baseUrl` (required), `apiKey` (optional Bearer token),
`fetch` (optional custom implementation), `timeoutMs` (default `30_000`, enforced
via `AbortController`), and `apiPrefix` (default `/api`).

```ts
import { EvolithRestClient } from '@beyondnet/evolith-sdk';

const client = new EvolithRestClient({ baseUrl: 'http://localhost:3000', apiKey: 'token' });
const result = await client.evaluatePhaseGate('discovery', { workspaceRef: 'op_abc123' });
// `verdict` is 'passed' | 'failed' | 'skipped' — there is no boolean `passed` on the wire.
console.log(result.data.verdict, result.data.gateId, result.data.rulesetVersion);
for (const v of result.data.violations) {
  console.log(`${v.severity} ${v.ruleId} at ${v.location}: ${v.message}`);
}
```

## MCP client

`EvolithMcpClient` is transport-agnostic: supply any function that sends a
`tools/call` request and returns the raw content array. Each method casts the parsed
response to the correct typed output and reports `isError`.

| Method | MCP tool |
| --- | --- |
| `evaluateGate(input)` | `evolith-gate-evaluate` |
| `validate(input)` | `evolith-validate` |
| `advancePhase(input)` | `evolith-phase-advance` |
| `listTopologies(input?)` | `evolith-topology-list` |
| `getTopology(input)` | `evolith-topology-get` |
| `call(toolName, input)` | generic typed dispatch |

The `createJsonRpcTransport(sendRequest)` factory adapts any JSON-RPC sender into the
required transport shape.

```ts
import { EvolithMcpClient, createJsonRpcTransport } from '@beyondnet/evolith-sdk';

const mcp = new EvolithMcpClient({ transport: createJsonRpcTransport(myRpcFn) });
const gate = await mcp.evaluateGate({ phase: 'discovery', projectPath: '/repos/my-service' });
```

## Testing

Unit tests live in `src/__tests__/sdk.spec.ts` and never touch the network — the
REST client is driven by a mock `fetch` and the MCP client by a mock transport.

```bash
npm test            # run the Jest suite
npm run test:cov    # run with coverage (≥85% function coverage on the clients)
```
