# Evolith Tracker

> **Bilingual navigation:** [Versión en Español](./README.es.md)

**Classification:** Product-Specific Design  
**Product:** Evolith Tracker  
**Status:** Conceptual / design-stage — **not yet implemented**. No Evolith Tracker source code or `evolith_tracker` repository exists in this corpus today; this folder holds the target design only.  
**Parent Suite:** [Evolith Product Suite](../../suite/README.md)  
**Governing Core:** [Evolith Core](../../../reference/core/README.md)

> **Implementation status.** Everything below describes the *intended* product role and design target, not shipped behavior. The authoritative interface design ([Tracker Technical Interface Design](./sdlc-tracker-technical-interfaces.md)) is explicitly marked *Proposed Design — Pending Architecture Board Review* with *no source-code change authorized*. Read every present-tense statement here as "will own / is designed to own".

---

## 1. Product Role (target)

Evolith Tracker is designed to be the runtime governance product of the Evolith Product Suite.

As designed, it will implement Core and SDLC Governance by owning:

- tenant, product, process, and phase runtime state;
- canonical Gate Decisions and Phase Transitions;
- evidence acceptance, lineage, approvals, and exceptions;
- agent-run and provider-connection records;
- audit history and unified product experience;
- plugin, adapter, and provider administration.

By design, Tracker does not redefine Core rules or SDLC Governance — it executes them.

> **Integration boundary (ADR-0074 + ADR-0075).** Tracker reaches Core strictly as an **external client** of the **Core API Exposure Layer** (`src/apps/core-api`, **REST-only** under `/api/v1` — no GraphQL and no SSE — plus the MCP gateway) defined in [ADR-0074](../../../reference/core/architecture/adrs/core/0074-evolith-core-api-exposure-layer.md). The composition/adaptation logic for web and mobile lives in Tracker's **BFF / Application Gateway** ([ADR-0075](../../../reference/core/architecture/adrs/nodejs/0075-application-gateway-bff-nestjs.md), NestJS). ADR-0075 motivates that gateway by *seamless integration with the existing Node.js monorepo ecosystem*; the future Tracker codebase (working name `evolith_tracker`) does not exist in this corpus yet, so its repository location is design intent, not a shipped fact. See the [Product Vision — Technical Interface Layer](../../suite/vision/evolith-product-vision-master.md) for the layered diagram.

---

## 2. Product Design Areas

| Area | Responsibility |
|---|---|
| **Vision and Scope** | Tracker-specific outcomes, personas, boundaries, and roadmap |
| **Architecture** | Containers, bounded contexts, services, dependencies, and deployment |
| **Domain Model** | Product-local aggregates such as Process, Gate Decision, Evidence Graph, Approval, Exception, and Provider Connection |
| **Interfaces** | REST, MCP gateway, events, UI actions, and product contracts |
| **UX** | Tenant, product, phase, gate, evidence, provider, and audit workspaces |
| **Security** | UMS integration, authorization graph consumption, tenant boundaries, and secrets |
| **Integrations** | Use of provider-neutral ports, plugins, adapters, and ACLs |
| **ADRs** | Product-specific architectural decisions |

---

## 3. Current Design Baseline

- [Tracker Technical Interface Design](./sdlc-tracker-technical-interfaces.md)
- [Governed Composition Target Design](../../suite/architecture/evolith-governed-composition-target-design.md)
- [Provider Abstraction and Plugin Model](../../../reference/core/foundations/principles/evolith-provider-abstraction-plugin-model.md)
- [SDLC Traceability and Evidence Graph](../../../reference/core/sdlc/traceability-model.md)

> These files remain in legacy locations during migration. Their classification is now explicit: Tracker-specific design belongs here; universal principles remain in Core; SDLC semantics remain under Governance.

---

## 3.1 What Exists Today vs. the Target

No Tracker application or `evolith_tracker` repository ships in this corpus. The only **real, shipped** code touchpoints that prepare for Tracker are Core-side enabling seams, tracked in [gap-tracking](../../../reference/core/control-center/gaps/gap-tracking.md):

| Real seam shipping today | Where | Tracking | Relation to target design |
|---|---|---|---|
| Opaque `workspaceRef` issued by the Tracker BFF (DTO field + resolver) | `apps/core-api/src/presentation/dtos/*.dto.ts`, `src/apps/core-api/src/application/services/workspace-reference-resolver.service.ts`, `src/packages/sdk-client/src/rest/types.ts` | [GT-117](../../../reference/core/control-center/gaps/gap-tracking.md) | Lets Core-API accept Tracker-supplied workspace references without coupling to Tracker. |
| `POST /api/v1/phases/transition` (live, REST-only) | `src/apps/core-api/src/presentation/controllers/phases.controller.ts` → `PhaseTransitionUseCase` | — | Executes `from → to` transitions today; the design's `PhaseTransition` ownership (§4.4 of the interface design) is the **target**, not yet enforced. |
| `GateDecision` value object (already named in Core) | `src/packages/core-domain/src/gates/decision/gate-decision.ts` | [GT-316](../../../reference/core/control-center/gaps/gap-tracking.md) | Different shape from the target `GateDecision` (see interface design §4.3 note) — a name already taken in Core. |
| `validateWorkflow(definition)` — validate Tracker-supplied flows against Core invariants | `src/packages/core-domain/src/application/use-cases/validate-workflow.use-case.ts` | [GT-317](../../../reference/core/control-center/gaps/gap-tracking.md) | Tenant-agnostic seam Tracker will call. |
| Redis caching layer for Core-API / MCP / Tracker consumption | `src/apps/core-api` | [GT-249](../../../reference/core/control-center/gaps/gap-tracking.md) | Shared infrastructure prepared for Tracker reads. |
| End-to-end Core + Tracker + agents integration validation | `src/packages/core-domain` e2e | [GT-326](../../../reference/core/control-center/gaps/gap-tracking.md) | Cross-cutting integration seam. |

Everything in the [Tracker Technical Interface Design](./sdlc-tracker-technical-interfaces.md) (REST endpoints under `tracker.evolith.io`, the `evolith criterion evaluate` / `evolith gate assess` tools, provider ports, Evidence Graph, Gate Decision Engine) is **target design** with **no implementation**.

### Output and error contract (target)

Tracker REST/MCP responses are expected to reuse Core's [ADR-0073](../../../reference/core/architecture/adrs/core/0073-unified-cli-output-contract.md) flat envelope — `meta.command`, `meta.executedAt`, `meta.durationMs`, `meta.correlationId`, `meta.context`, `meta.schemaVersion` — and RFC 9457 (`application/problem+json`) for errors, as Core-API does today. The interface design (§11) notes ADR-0073 *remains valid but requires a companion decision* to separate evaluation-versus-decision semantics before Tracker implementation.

---

## 4. Non-Negotiable Boundaries

1. Tracker consumes Core definitions; it does not authoritatively redefine them.
2. Tracker owns canonical runtime governance state.
3. CLI, MCP, CI, agents, and providers produce evaluations or evidence, not final gate authority.
4. All external capabilities enter through provider-neutral contracts.
5. Default providers are replaceable by tenant policy.
6. Provider-specific schemas remain behind ACLs.
7. Historical evidence and decisions remain readable after provider replacement.
8. Product-specific ADRs cannot become Core ADRs without Architecture Board promotion.

---

## 5. Planned Canonical Structure

```text
product/products/evolith-tracker/
├── README.md
├── vision/
├── functional/
├── architecture/
├── domain-model/
├── interfaces/
├── ux/
├── security/
├── integrations/
├── deployment/
└── adrs/
```

Content migration into these folders must preserve bilingual parity and legacy-link compatibility.

---

## 6. Install, Run, and Contribution

There is **no installable or runnable Tracker artifact yet** — no package, binary, container image, environment variables, or commands exist. Install / prerequisites / local-run / troubleshooting guidance will be authored alongside the first implementation increment once the [Pre-Code Approval Checklist](./sdlc-tracker-technical-interfaces.md#12-pre-code-approval-checklist) clears the Architecture Board. To exercise the **Core-side seams Tracker will consume today**, use the running [Core API](../core-api/README.md) (`POST /api/v1/phases/transition`, the validation endpoints) and the [MCP services](../mcp-services/README.md).

Contribution standards for this repository (clone/dev-setup, test commands, branch/commit conventions, doc/schema/ruleset/OPA authoring) live in the repo-root [CONTRIBUTING.md](../../../CONTRIBUTING.md); Tracker-specific contribution rules will be added when the codebase exists.

---

[Back to Product-Specific Designs](../README.md)
