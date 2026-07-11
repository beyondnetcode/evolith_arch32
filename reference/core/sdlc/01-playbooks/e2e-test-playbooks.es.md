# Evolith Core — Playbooks de Pruebas E2E

Cada flujo ejecutable (superficie) tiene su **playbook de pruebas**: la superficie
bajo prueba, el comando que corre su suite end-to-end dedicada, los escenarios que
ejerce y el veredicto esperado. Esto mantiene la cobertura E2E explícita y por
flujo, en vez de implícita o confundida con las suites unit/integration. El agente
`qa-e2e` (`.bmad-core/agents/qa-e2e.md`) ejecuta estos playbooks; el QA Líder agrega.

## Propósito

Probar que cada superficie pública funciona end-to-end, de forma independiente y
reproducible. Un run verde de los cuatro playbooks es el gate E2E cross-superficie.

## Flujo: Core Governance

- **Superficie:** dominio de governance SDLC (fase → gate → artefacto → verdict).
- **Comando:** `npm run test:e2e --workspace @beyondnet/evolith-core-domain`
- **Suite:** `packages/core-domain/src/__e2e__/governance-flow.e2e.spec.ts` (13 tests).
- **Escenarios:** aprobación de gate por ARCHITECT (verdict PASS + `GateApprovedEvent` + auditoría + transiciones de fase); artefacto faltante → FAIL + `GateRejectedEvent`; denegación RBAC (`GateAuthorizationError`); entrega de webhook de `gate.approved`; validación de workflow de 5 fases + Blueprint.
- **Esperado:** 13/13 verde contra un satélite real en tmpdir.

## Flujo: Evolith CLI

- **Superficie:** `evolith-cli` y sus comandos (incl. MCP HTTP vivo vía `mcp serve`).
- **Comando:** `npm run --workspace sdk/cli test:e2e`
- **Suite:** config e2e de `sdk/cli/test/**` (20 suites).
- **Escenarios:** flujos `validate`/`gate`/`init`/`wizard`, comandos de gate SDLC, y `mcp-e2e` que levanta el server MCP HTTP (`/health` público, `POST /` fail-closed, `initialize`/`tools/list`/recursos/prompts).
- **Esperado:** 175/175 verde.

## Flujo: Core-API

- **Superficie:** superficie HTTP de `core-api` (versionado URI `api/v1`, `/health` neutral, `/metrics`).
- **Comando:** `npm run --workspace apps/core-api test:e2e`
- **Suite:** `apps/core-api/test/app.e2e-spec.ts`.
- **Escenarios:** `GET /health/live` → 200; `GET /health` → 200; `GET /metrics` → 200; `GET /api/v1/rulesets` → 200; `GET /` → 404 (sin ruta raíz).
- **Esperado:** 5/5 verde. Requiere `WORKSPACE_ROOT` (puesto por `test-setup.js` vía `setupFiles`).

## Flujo: MCP Server

- **Superficie:** superficie de protocolo MCP HTTP de `mcp-server`.
- **Comando:** `npm run --workspace packages/mcp-server build && npm run --workspace packages/mcp-server test:e2e`
- **Suite:** `packages/mcp-server/test/mcp-server.e2e-spec.ts` (levanta `node dist/main serve --transport http`).
- **Escenarios:** `/health` público → 200; `POST /` sin key → 401 (auth fail-closed); `initialize` con key → 200 + `serverInfo.name = evolith-mcp-server` + `mcp-session-id`.
- **Esperado:** 3/3 verde. Requiere build previo (`dist/main`).

## Correr Todos los Flujos

```bash
npm run test:e2e --workspace @beyondnet/evolith-core-domain
npm run --workspace sdk/cli test:e2e
npm run --workspace apps/core-api test:e2e
npm run --workspace packages/mcp-server build && npm run --workspace packages/mcp-server test:e2e
```

## Integración con la Suite QA

El especialista `qa-e2e` (en `.bmad-core/workflows/qa-suite.yaml`) corre los cuatro
playbooks como su gate; cualquier flujo fallido bloquea el merge. El E2E de cada
superficie también corre en CI (`.github/workflows/ci-cd.yml`).
