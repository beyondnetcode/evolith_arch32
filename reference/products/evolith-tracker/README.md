# Evolith Tracker

> **Bilingual navigation:** [Versión en Español](./README.es.md)

**Classification:** Product-Specific Design  
**Product:** Evolith Tracker  
**Parent Suite:** [Evolith Product Suite](../../product-suite/README.md)  
**Governing Core:** [Evolith Core](../../core/README.md)

---

## 1. Product Role

Evolith Tracker is the runtime governance product of the Evolith Product Suite.

It implements Core and SDLC Governance by owning:

- tenant, product, process, and phase runtime state;
- canonical Gate Decisions and Phase Transitions;
- evidence acceptance, lineage, approvals, and exceptions;
- agent-run and provider-connection records;
- audit history and unified product experience;
- plugin, adapter, and provider administration.

Tracker does not redefine Core rules or SDLC Governance. It executes them.

> **Integration boundary (ADR-0074 + ADR-0075).** Tracker reaches Core strictly as an **external client** of the **Core API Exposure Layer** (`apps/core-api` REST/GraphQL, plus MCP) defined in [ADR-0074](../../architecture/adrs/core/0074-evolith-core-api-exposure-layer.md). The composition/adaptation logic for web and mobile lives in Tracker's **BFF / Application Gateway** ([ADR-0075](../../architecture/adrs/nodejs/0075-application-gateway-bff-nestjs.md), NestJS) **inside the `evolith_tracker` repository** — not in Core. See the [Product Vision — Technical Interface Layer](../../product-suite/vision/evolith-product-vision-master.md) for the layered diagram.

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

- [Tracker Technical Interface Design](../../governance/standards/vision/sdlc-tracker-technical-interfaces.md)
- [Governed Composition Target Design](../../governance/standards/vision/evolith-governed-composition-target-design.md)
- [Provider Abstraction and Plugin Model](../../governance/standards/vision/evolith-provider-abstraction-plugin-model.md)
- [SDLC Traceability and Evidence Graph](../../governance/sdlc/traceability-model.md)

> These files remain in legacy locations during migration. Their classification is now explicit: Tracker-specific design belongs here; universal principles remain in Core; SDLC semantics remain under Governance.

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
reference/products/evolith-tracker/
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

[Back to Product-Specific Designs](../README.md)
