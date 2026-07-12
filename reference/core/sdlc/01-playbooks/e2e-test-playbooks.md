# Evolith Core — E2E Test Playbooks

Each runnable flow (surface) owns its **test playbook**: the surface under test,
the command that runs its dedicated end-to-end suite, the scenarios it drives,
and the expected verdict. This keeps E2E coverage explicit and per-flow rather
than implicit or conflated with unit/integration suites. The `qa-e2e` agent
(`reference/core/foundations/agent-skills/qa-e2e.md`) executes these playbooks; the QA Lead aggregates.

## Purpose

Prove every public surface works end-to-end, independently and reproducibly.
A green run of all four playbooks is the cross-surface E2E gate.

## Flow: Core Governance

- **Surface:** SDLC governance domain (phase → gate → artifact → verdict).
- **Command:** `npm run test:e2e --workspace @beyondnet/evolith-core-domain`
- **Suite:** `packages/core-domain/src/__e2e__/governance-flow.e2e.spec.ts` (13 tests).
- **Scenarios:** ARCHITECT gate approval (PASS verdict + `GateApprovedEvent` + audit + phase transitions); missing artifact → FAIL + `GateRejectedEvent`; RBAC denial (`GateAuthorizationError`); webhook delivery of `gate.approved`; 5-phase workflow + Blueprint validation.
- **Expected:** 13/13 green against a real tmpdir satellite.

## Flow: Evolith CLI

- **Surface:** `evolith-cli` and its commands (incl. live MCP HTTP via `mcp serve`).
- **Command:** `npm run --workspace sdk/cli test:e2e`
- **Suite:** `sdk/cli/test/**` e2e config (20 suites).
- **Scenarios:** `validate`/`gate`/`init`/`wizard` flows, SDLC gate commands, and `mcp-e2e` which spawns the MCP HTTP server (public `/health`, fail-closed `POST /`, `initialize`/`tools/list`/resources/prompts).
- **Expected:** 175/175 green.

## Flow: Core-API

- **Surface:** `core-api` HTTP surface (URI versioning `api/v1`, version-neutral `/health`, `/metrics`).
- **Command:** `npm run --workspace apps/core-api test:e2e`
- **Suite:** `apps/core-api/test/app.e2e-spec.ts`.
- **Scenarios:** `GET /health/live` → 200; `GET /health` → 200; `GET /metrics` → 200; `GET /api/v1/rulesets` → 200; `GET /` → 404 (no root route).
- **Expected:** 5/5 green. Requires `WORKSPACE_ROOT` (set by `test-setup.js` via `setupFiles`).

## Flow: MCP Server

- **Surface:** `mcp-server` MCP HTTP protocol surface.
- **Command:** `npm run --workspace packages/mcp-server build && npm run --workspace packages/mcp-server test:e2e`
- **Suite:** `packages/mcp-server/test/mcp-server.e2e-spec.ts` (spawns `node dist/main serve --transport http`).
- **Scenarios:** public `/health` → 200; `POST /` without key → 401 (fail-closed auth); `initialize` with key → 200 + `serverInfo.name = evolith-mcp` + `mcp-session-id`.
- **Expected:** 3/3 green. Requires a prior build (`dist/main`).

## Running All Flows

```bash
npm run test:e2e --workspace @beyondnet/evolith-core-domain
npm run --workspace sdk/cli test:e2e
npm run --workspace apps/core-api test:e2e
npm run --workspace packages/mcp-server build && npm run --workspace packages/mcp-server test:e2e
```

## QA Suite Integration

The `qa-e2e` specialist (in `.bmad-core/workflows/qa-suite.yaml`) runs all four
playbooks as its gate; any failed flow blocks merge. Each surface's E2E also runs
in CI (`.github/workflows/ci-cd.yml`).
