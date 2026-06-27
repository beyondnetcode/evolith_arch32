# Evolith Core — Second Maintainer Onboarding Guide

> **Bilingual Navigation:** [Versión en Español](./onboarding-second-maintainer.es.md)

**Purpose:** Reduce bus factor by enabling a second human maintainer to contribute independently.  
**Gap:** GT-330 — single contributor with ~1,300 commits; no formal onboarding path existed.

---

## 1. Repository Overview

Evolith Core is a governance engine for software development lifecycle (SDLC) enforcement. It validates satellite projects against topology rulesets, gates, and OPA policies.

### Key entry points

| Area | Path | Purpose |
|---|---|---|
| Domain logic | `packages/core-domain/src/domain/` | Entities, events, state machines, RBAC, verdict |
| Application layer | `packages/core-domain/src/application/` | Use cases, services, ports |
| Infrastructure | `packages/core-domain/src/infrastructure/` | Event bus, audit, webhook, adapters |
| MCP server | `packages/mcp-server/src/` | MCP tool definitions and transport |
| Core REST API | `apps/core-api/src/` | NestJS API surface |
| CLI | `sdk/cli/src/` | Smart CLI commands |
| Rulesets | `rulesets/` | OPA policies + topology rules |
| SDLC data | `reference/governance/sdlc/` | Phase/gate JSON definitions |
| ADRs | `reference/governance/adr/` | Architecture Decision Records |

### Architecture in one paragraph

Satellites (external projects) submit evidence to Core via REST, MCP, or CLI. Core loads the SDLC gate definitions (`reference/governance/sdlc/gates/gate-f*.json`), resolves the satellite's artifact paths, runs OPA/native rules, and emits a `Verdict` (PASS/FAIL/WAIVE/SKIP). All decisions are emitted as domain events, written to the audit ledger, and dispatched to webhook subscribers.

---

## 2. First Week Checklist

- [ ] Clone repo and run `npm install` from root
- [ ] Run `npm test` — all suites must pass (target: 500+ tests green)
- [ ] Read `reference/governance/adr/core/README.md` — architecture decisions
- [ ] Read `CERTIFICACION_MADUREZ.md` — current maturity certification
- [ ] Read `reference/governance/standards/vision/gap-tracking.md` — gap board
- [ ] Run the MCP server locally: `npm run start --workspace=packages/mcp-server`
- [ ] Run the Core API locally: `npm run start:dev --workspace=apps/core-api`
- [ ] Read `reference/governance/sdlc/README.md` — SDLC model overview

---

## 3. Key Invariants to Know

1. **Core stores zero tenant config** — all tenant composition flows through `ValidateWorkflowUseCase` with a caller-supplied `WorkflowDefinition`.
2. **Canonical gate source** — `reference/governance/sdlc/gates/gate-f*.json` (not `rulesets/phase-gates/phase-gates.rules.json`).
3. **Canonical topology location** — `rulesets/topologies/` (all 8 topologies; the `reference/architecture/topologies/` dirs have `RELOCATED.md` stubs).
4. **Canonical verdict** — `Verdict` enum (`PASS|FAIL|WAIVE|SKIP`) from `packages/core-domain/src/domain/verdict/verdict.ts`.
5. **Event bus is additive** — `IDomainEventBus` is optional in all use cases; absence does not break existing flows.
6. **Bilingual parity** — every English doc must have an `*.es.md` counterpart.

---

## 4. Making Your First Contribution

1. Pick a gap from `reference/governance/standards/vision/gap-tracking.md` marked `PENDING`.
2. Read its entry in `gap-reference-catalog.md` for closure criteria.
3. Create a branch: `git checkout -b feat/gt-NNN-short-description`.
4. Write code + tests; aim for ≥80% branch coverage on touched files.
5. Verify CI passes locally: `npm test && npm run lint:boundaries --workspaces`.
6. Open a PR — CI runs automatically (`governance-ci.yml`, `ci-cd.yml`).

---

## 5. Running the Full Test Suite

```bash
# All unit tests
npm test

# E2E tests (core-domain)
npm run test:e2e --workspace=packages/core-domain

# OPA parity gate
EVOLITH_PARITY_FULL=true node .harness/scripts/ci/27-opa-parity-gate.mjs

# ESLint boundaries
npm run lint:boundaries --workspace=packages/core-domain
npm run lint:boundaries --workspace=packages/mcp-server
npm run lint:boundaries --workspace=apps/core-api
```

---

## 6. Contacting the Primary Maintainer

| Channel | Details |
|---|---|
| Git commits | `Alberto Arroyo Raygada` — see `git shortlog -sn` |
| GitHub | Repository owner |
| Governance email | beyondnet.peru@gmail.com |

For questions about an ADR or gap, open a GitHub Issue referencing the ADR/GT number.

---

*This guide was created to close GT-330 (bus factor mitigation). Update it as the codebase evolves.*
