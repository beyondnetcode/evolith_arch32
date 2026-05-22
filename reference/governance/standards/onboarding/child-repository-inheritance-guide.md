# Child Repository Inheritance Guide

> **Status:** Accepted | **Owner:** Architecture Council | **Version:** 1.0.0
> **Bilingual Navigation:** [Versión en Español](./child-repository-inheritance-guide.es.md)

This document defines the formal mechanics by which product repositories derive from this corporate reference. It establishes what is inherited, what may be extended, what may be overridden, and what governance obligations apply throughout the lifecycle of a child repository.

---

## 1. Purpose and Scope

This reference repository is the **authoritative upstream** for all product repositories within the organization. It does not function as an `npm` package or a Git submodule. It functions as a **living architectural contract** — a curated body of decisions, standards, and patterns that product teams inherit, debate, and extend within their own bounded context.

Any repository created from this base is referred to as a **child repository**. The relationship is not a one-time clone; it is an ongoing governance obligation.

---

## 2. Inheritance Model

### 2.1 What Is Inherited by Default

When a child repository is initialized from this base, it inherits the following corpus:

| Layer | Inherited Assets | Mutability |
| :--- | :--- | :--- |
| **Architecture Decisions** | All ADRs under `reference/architecture/adrs/` | Read-only reference; override requires local ADR |
| **Structural Laws** | Blueprints, agnostic baseline, simplicity checklist | Mandatory; child must comply or document divergence |
| **Engineering Standards** | Manifesto (SOLID/OWASP), contract testing guide, observability playbook | Mandatory |
| **Governance Rules** | Repository taxonomy, naming conventions, harness rules R-01–R-18 | Mandatory |
| **Infrastructure Templates** | Docker Compose phase-based map, Kong declarative config | Adoptable; child may replace with cloud-equivalent |
| **Observability Stack** | OTel Collector, Grafana, Tempo, Loki configuration | Adoptable; child may swap backends |
| **Harness Validation** | `validate-docs.mjs` — UTF-8, relative links, Mermaid syntax | Mandatory in CI |

### 2.2 What Is Not Inherited

The following elements are intentionally scoped to this repository and must not be carried into child repositories without deliberate adaptation:

- The `src/apps/todo-api/` demo implementation. It is a pattern laboratory, not a production template.
- The demo domain documentation under `reference/knowledge/demo/`. Domain knowledge must be authored per product.
- Business glossary, stakeholder maps, and product objectives. These are always product-specific.

---

## 3. The Three Inheritance Operations

### 3.1 Adopt

The child repository cites an ADR or standard from the base without modification. No local copy is created. The child's own `DECISIONS.md` or ADR index references the upstream by identifier and URL.

**When to use:** The decision applies as-is to the child's context with no trade-off divergence.

**Obligation:** None beyond the citation. The child is bound by the decision.

### 3.2 Extend

The child creates a new local ADR that builds upon a base ADR without contradicting it. The local ADR references the upstream identifier in its `Context` section and adds domain-specific constraints, technology choices, or implementation details not covered by the base.

**When to use:** The base ADR defines the pattern; the child needs to specify the concrete implementation for its domain (e.g., base ADR-0015 defines the injectable event bus; child ADR-0001 specifies RabbitMQ topology for its specific domain).

**Obligation:** The local ADR header must declare `Extends: [ADR-XXXX](upstream-url)`.

### 3.3 Override

The child creates a local ADR that explicitly diverges from a base ADR. The local ADR references the upstream identifier, states the reason the base decision does not apply, and documents the alternative decision with its own trade-off analysis.

**When to use:** The child's operational, regulatory, or business context makes the base decision inapplicable or counterproductive.

**Obligation:** The local ADR header must declare `Overrides: [ADR-XXXX](upstream-url)` and include a `Divergence Justification` section. Overrides must be reviewed by the Architecture Council before merging.

---

## 4. Child Repository Structure

A child repository must comply with the directory taxonomy defined in the [Repository Taxonomy](../repository-taxonomy.md). The minimum required structure at initialization is:

```text
/ (Child Repository Root)
  README.md                    # Executive portal with link back to upstream base
  MASTER_INDEX.md              # Role-based routing for this product
  DECISIONS.md                 # Index of adopted, extended, and overridden ADRs
  .harness/                    # Copy of base harness rules; extend as needed
  reference/
    architecture/
      adrs/                    # Local ADRs only — adopt/extend/override entries
    governance/
      standards/               # Local overrides to standards only
    knowledge/
      domain/                  # Product-specific domain documentation
  src/                         # Product source code
```

The `DECISIONS.md` file is mandatory. It is the single place where any reader can understand the full decision posture of the child repository relative to the upstream base.

---

## 5. DECISIONS.md Format

Each entry in `DECISIONS.md` must follow this structure:

```markdown
| ID | Title | Operation | Upstream Ref | Local ADR | Notes |
|---|---|---|---|---|---|
| C-001 | Use PostgreSQL | Adopt | ADR-0001 | — | No divergence |
| C-002 | Event Bus topology | Extend | ADR-0015 | adrs/0001-event-bus-topology.md | RabbitMQ fanout for payments domain |
| C-003 | Replace Kong with AWS ALB | Override | ADR-0030 | adrs/0002-alb-over-kong.md | Cloud-managed gateway mandated by infra team |
```

---

## 6. Upstream Synchronization

Child repositories are not required to track upstream commits automatically. However, the following obligations apply:

| Event | Obligation |
| :--- | :--- |
| A new ADR is published in the base (Core or matching runtime) | Child team must triage within the next planning cycle: adopt, extend, override, or document as not-applicable |
| A base ADR is deprecated or superseded | Child team must review any local ADRs that extend or override the deprecated one |
| A breaking change is introduced to the harness or governance standards | Child team must update their harness copy and re-run `validate-docs.mjs` before the next release |

Upstream changes are communicated via the base repository's changelog and ADR registry. Child teams are responsible for monitoring the upstream ADR index.

---

## 7. Promotion Path

When a child repository authors a local ADR that solves a problem of universal applicability — not specific to its business domain — the Architecture Council may accept it as a pull request to the upstream base. This is the **promotion path**.

Criteria for promotion:

- The decision is runtime-agnostic or cleanly scoped to a single runtime profile.
- The decision does not introduce a dependency on a proprietary or domain-specific tool.
- The ADR follows the standard format and passes the harness validation suite.
- The proposing team is willing to maintain the decision in the upstream context.

Promoted ADRs are renumbered in the upstream sequence and the child's local copy is updated to an `Adopted` status pointing to the new upstream identifier.

---

## 8. Governance Obligations Summary

| Obligation | Frequency | Owner |
| :--- | :--- | :--- |
| Triage new upstream ADRs | Per planning cycle | Tech Lead |
| Keep `DECISIONS.md` current | Per ADR change | Tech Lead |
| Pass `validate-docs.mjs` in CI | Per commit | Dev team |
| Review overrides with Architecture Council | Before merge | Tech Lead + Architect |
| Propose upstream promotions for universal decisions | As identified | Tech Lead |

---

## Related Documents

- [Repository Taxonomy](../repository-taxonomy.md)
- [Quick Start Guide for New Products](./product-quick-start.md)
- [ADR Registry](../../../architecture/adrs/README.md)
- [Agnostic Architecture Baseline](../../../architecture/blueprints/authoritative-tech-stack-agnostic.md)
- [Engineering Manifesto](../engineering/engineering-manifesto.md)

---

[Back to Onboarding Index](./README.md)
