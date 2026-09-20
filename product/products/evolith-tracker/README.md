# Evolith Tracker

> **Bilingual navigation:** [Versión en Español](./README.es.md)

**Classification:** Product-Specific Design  
**Product:** Evolith Tracker  
**Status:** Built, in UAT, **not launched**. The source lives in the private `beyondnetcode/evolith_tracker` repository (a .NET 10 API, a React 19 web app and a NestJS gateway, with PostgreSQL); its images are public on GHCR and this repository's [UAT compose](../../infra/docker-compose.uat.yml) runs them next to the Core. This folder holds the design that preceded it — read it as intent, and where it disagrees with the product, the product wins.  
**Parent Suite:** [Evolith Product Suite](../../suite/README.md)  
**Governing Core:** [Evolith Core](../../../reference/core/README.md)

> **Implementation status (2026-09-20).** The Tracker exists and runs: initiatives through the five phases, type-derived gate criteria, product-owner approval chains, phase-gate evaluation with a Core verdict, evidence, audit — the [front page](../../../README.md#the-phase-gate-in-the-cli-and-in-the-tracker) carries a capture of its UAT environment governing this very repository. What is **not** true yet: a launch and a public repository. The repository-conformance call in UAT was rejected by the Core's 100 KB body ceiling on the first try (GT-715); fixed, promoted and redeployed the same day, it now returns a real verdict on this repository. The [Tracker Technical Interface Design](./sdlc-tracker-technical-interfaces.md) below predates the implementation and is still marked *Proposed Design*; it is not a description of the shipped product.

---

## 1. Product Role (target)

Evolith Tracker is the runtime governance product of the Evolith Product Suite.

It implements Core and SDLC Governance by owning:

- tenant, product, process, and phase runtime state;
- canonical Gate Decisions and Phase Transitions;
- evidence acceptance, lineage, approvals, and exceptions;
- agent-run and provider-connection records;
- audit history and unified product experience;
- plugin, adapter, and provider administration.

Tracker does not redefine Core rules or SDLC Governance — it executes them. Its own manual states the split as two planes: process governance (phases, gates, criteria, approvals, audit — always on, no repository needed) and technical-architecture conformance (the Core evaluating a satellite repository — opt-in, per gate, through `requiresCoreVerdict`).

> **Integration boundary (ADR-0074 + ADR-0075).** Tracker reaches Core strictly as an **external client** of the **Core API Exposure Layer** (`src/apps/core-api`, **REST-only** under `/api/v1` — no GraphQL and no SSE — plus the MCP gateway) defined in [ADR-0074](../../../reference/core/architecture/adrs/core/0074-evolith-core-api-exposure-layer.md). The composition/adaptation logic for web and mobile lives in Tracker's **BFF / Application Gateway** ([ADR-0075](../../../reference/core/architecture/adrs/nodejs/0075-application-gateway-bff-nestjs.md), NestJS). ADR-0075 motivates that gateway by *seamless integration with the existing Node.js monorepo ecosystem*; the shipped Tracker keeps the gateway (`tracker-gateway`, NestJS) and puts the domain in a .NET API behind it. Its calls to the Core are REST-only as designed, and for repository conformance it **sends the repository inline** (`evaluationInput.files`, assembled from the product's repository access) rather than handing the Core a path — the Core stays stateless and never reads a filesystem or the network on the Tracker's behalf. See the [Product Vision — Technical Interface Layer](../../suite/vision/evolith-product-vision-master.md) for the layered diagram.

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

The Tracker ships from its own private repository, not from this corpus. What this corpus holds are the Core-side seams it consumes, tracked in [gap-tracking](../../../reference/core/control-center/gaps/gap-tracking.md) — several of them written before the Tracker existed and since overtaken (the opaque `workspaceRef` is kept for compatibility; the inline context is the canonical path):

| Real seam shipping today | Where | Tracking | Relation to target design |
|---|---|---|---|
| Opaque `workspaceRef` issued by the Tracker BFF (DTO field + resolver) | `apps/core-api/src/presentation/dtos/*.dto.ts`, `src/apps/core-api/src/application/services/workspace-reference-resolver.service.ts`, `src/packages/sdk-client/src/rest/types.ts` | [GT-117](../../../reference/core/control-center/gaps/gap-tracking.md) | Lets Core-API accept Tracker-supplied workspace references without coupling to Tracker. |
| `POST /api/v1/phases/transition` (live, REST-only) | `src/apps/core-api/src/presentation/controllers/phases.controller.ts` → `PhaseTransitionUseCase` | — | Executes `from → to` transitions today; the design's `PhaseTransition` ownership (§4.4 of the interface design) is the **target**, not yet enforced. |
| `GateDecision` value object (already named in Core) | `src/packages/core-domain/src/gates/decision/gate-decision.ts` | [GT-316](../../../reference/core/control-center/gaps/gap-tracking.md) | Different shape from the target `GateDecision` (see interface design §4.3 note) — a name already taken in Core. |
| `validateWorkflow(definition)` — validate Tracker-supplied flows against Core invariants | `src/packages/core-domain/src/application/use-cases/validate-workflow.use-case.ts` | [GT-317](../../../reference/core/control-center/gaps/gap-tracking.md) | Tenant-agnostic seam Tracker will call. |
| Redis caching layer for Core-API / MCP / Tracker consumption | `src/apps/core-api` | [GT-249](../../../reference/core/control-center/gaps/gap-tracking.md) | Shared infrastructure prepared for Tracker reads. |
| End-to-end Core + Tracker + agents integration validation | `src/packages/core-domain` e2e | [GT-326](../../../reference/core/control-center/gaps/gap-tracking.md) | Cross-cutting integration seam. |

The [Tracker Technical Interface Design](./sdlc-tracker-technical-interfaces.md) (REST endpoints under `tracker.evolith.io`, the `evolith criterion evaluate` / `evolith gate assess` tools, provider ports, Evidence Graph, Gate Decision Engine) is the design the product was started from, **not a description of what it exposes today**; the shipped surface is documented in the Tracker's own repository.

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

The Tracker is **not launched and not open source**: no npm package, and the source repository is private. What is public are its container images (`ghcr.io/beyondnetcode/evolith-tracker-{api,gateway,web}`), which this repository's [UAT compose](../../infra/docker-compose.uat.yml) runs next to `core-api`, `mcp` and `agent-runtime` — that file is the closest thing to install instructions until the launch, and it is what the UAT environment on the front page runs. The Core-side seams it consumes are exercised through the running [Core API](../core-api/README.md) (`POST /api/v1/evaluate` with an inline context, `POST /api/v1/phases/transition`) and the [MCP services](../mcp-services/README.md).

Contribution standards for this repository (clone/dev-setup, test commands, branch/commit conventions, doc/schema/ruleset/OPA authoring) live in the repo-root [CONTRIBUTING.md](../../../CONTRIBUTING.md); the Tracker's own rules live with its source.

---

Detailed architecture for this product lives in [`architecture/`](./architecture/README.md).

---

[Back to Product-Specific Designs](../README.md)
