# Evolith Agent Sandbox

This is a sandbox application demonstrating the **Agentic AI topology (GT-131)**.
It acts as a Model Context Protocol (MCP) server that agents can connect to via
Stdio. The tools themselves live in the canonical registry package
[`@evolith/mcp-tools`](../../packages/mcp-tools) and are wired in through
`registerEvolithTools`.

## Usage

Start the sandbox MCP server (it speaks MCP over stdio):

```bash
node apps/agent-sandbox/index.js
```

On startup it logs `Evolith Agent Sandbox (MCP) is running on stdio` to stderr.

## Tools available

These are provided by `@evolith/mcp-tools` and registered on the server:

- `evolith-ping` — Verify MCP connectivity (returns `pong`).
- `evolith-echo` — Echo a `message` back to the agent.
- `evolith-read-gap-tracking` — Read the architectural gap-tracking board and
  report the number of `PENDING` gaps.

> The tool registry is unit-tested in
> [`packages/mcp-tools/src/__tests__`](../../packages/mcp-tools/src/__tests__).
> Run the suite with `npm test --workspace @evolith/mcp-tools`.

## E2E Governance Flow Suite (GT-326)

The `packages/core-domain` package ships a self-contained end-to-end suite that
drives the full governance pipeline — phase → gate → artifact → verdict — without
any real HTTP servers or external dependencies.

### Running locally

```bash
# From the monorepo root:
npm run test:e2e --workspace=packages/core-domain
```

### What it covers

| Scenario | Description |
|----------|-------------|
| 1 — Happy path | PRODUCT_OWNER approves gate-f1 against a tmpdir satellite fixture → `GateApprovedEvent` + audit entry + phase state machine transitions |
| 2 — Missing artifact | Empty satellite directory → `failed` verdict, violation messages, `GateRejectedEvent` |
| 3 — Unauthorized approver | `DEVELOPER` role on gate-f1 (accountableRole = Product Owner) → `GateAuthorizationError` |
| 4 — Webhook delivery | `WebhookDispatcher` dispatches `gate.approved` topic to a registered `InMemorySubscriptionRepository` subscription |
| 5 — Workflow validation | Full 5-phase `WorkflowDefinition` → `{ valid: true }` via `ValidateWorkflowUseCase`; `Blueprint` lifecycle via `ValidateBlueprintUseCase` |

### CI integration

Step **34 - E2E Governance Flow (GT-326)** in
`.github/workflows/governance-ci.yml` runs this suite on every PR against
`main` or `develop`.

### Architecture notes

- Fixtures are created in `os.tmpdir()` and cleaned up in `afterAll`.
- `InMemoryEventBus`, `InMemoryAuditRepository`, `InMemorySubscriptionRepository`,
  and `InMemoryDeliveryRepository` are used throughout — no I/O side effects
  beyond tmpdir.
- The real `PhaseGateValidatorService` reads actual `gate-f*.json` files from
  `reference/governance/sdlc/gates/` so gate-definition changes are tested end-to-end.
