# Child Repository Inheritance Guide

> **Status:** Accepted | **Owner:** Architecture Council | **Version:** 1.1.0
> **Bilingual Navigation:** [Versión en Español](./child-repository-inheritance-guide.es.md)

---

## Quick Reference

| I need to... | Go to |
| :--- | :--- |
| Understand the mental model | [Section 1 — Mental Model](#1-mental-model) |
| Know what I inherit on day zero | [Section 2 — Inheritance Model](#2-inheritance-model) |
| Decide how to handle a specific base ADR | [Section 3 — The Four Operations](#3-the-four-inheritance-operations) |
| See a concrete ADR header example | [Section 4 — Local ADR Format](#4-local-adr-format) |
| Set up a new child repository | [Section 5 — Day Zero Checklist](#5-day-zero-checklist) |
| Understand ongoing obligations | [Section 6 — Upstream Synchronization](#6-upstream-synchronization) |
| Contribute a decision back to the base | [Section 7 — Promotion Path](#7-promotion-path) |

---

## 1. Mental Model

### 1.1 What This Repository Is

This repository is the **corporate architectural upstream**. It is not a starter template you clone once and forget. It is not an `npm` package you install. It is a **living architectural contract** — a curated and versioned body of decisions, patterns, and standards that every product team in the organization inherits, operates under, and contributes back to over time.

Think of it as the organization's shared architectural memory. Every decision recorded here was made deliberately, documented with its trade-offs, and accepted as the default for all products. A product team that disagrees with a decision is not free to silently ignore it — they are required to document their divergence formally, just as they would any other architectural decision.

### 1.2 What a Child Repository Is

A **child repository** is any product repository that derives from this base. The relationship has two dimensions:

**Structural** — the child copies the directory taxonomy, harness rules, and governance templates from the base at initialization and maintains them as its own going forward.

**Intellectual** — the child inherits the full ADR corpus as its default decision set. Every base ADR is implicitly in force for the child unless the child explicitly documents otherwise.

### 1.3 What This Is Not

| Common Misconception | Reality |
| :--- | :--- |
| "I cloned it, so I own it independently" | The intellectual contract persists after the clone. Divergences must be documented. |
| "I only need to read the ADRs once" | New base ADRs are published over time. Child teams triage them each planning cycle. |
| "I can just copy the parts I like" | Selective adoption without documenting what was excluded creates invisible debt. Use the Not-Applicable operation instead. |
| "The demo API is the template for my product" | The `ums-api` is a pattern laboratory. It proves patterns work. It is not production scaffolding. |

---

## 2. Inheritance Model

### 2.1 What Is Inherited by Default

When a child repository is initialized from this base, the following corpus is in force:

| Layer | Inherited Assets | Mutability |
| :--- | :--- | :--- |
| **Architecture Decisions** | All ADRs under `reference/core/architecture/adrs/` | Implicitly adopted; override or mark not-applicable if inapplicable |
| **Structural Laws** | Blueprints, agnostic baseline, simplicity checklist | Mandatory; divergence requires documented justification |
| **Engineering Standards** | Manifesto (SOLID/OWASP), contract testing guide, observability playbook | Mandatory |
| **Governance Rules** | Repository taxonomy, naming conventions, harness rules R-01–R-18 | Mandatory |
| **Infrastructure Templates** | Docker Compose phase-based map, API Gateway declarative config | Adoptable; child may replace with cloud-equivalent |
| **Observability Stack** | Telemetry collector and observability backends configuration (metrics, logs, traces) | Adoptable; child may swap backends with equivalent capability |
| **Harness Validation** | `validate-docs.mjs` — UTF-8, relative links, Mermaid syntax | Mandatory in CI |

### 2.2 What Is Not Inherited

The following elements are intentionally scoped to this repository. Carry them into a child only with deliberate adaptation:

| Asset | Reason Not Inherited |
| :--- | :--- |
| `src/apps/ums-api/` and `src/apps/ums-web/` | Applied reference satellite implementation ([UMS](https://github.com/beyondnetcode/ums)) — not production scaffolding |
| `product/research/demo/` | Documentation of the UMS reference model — irrelevant to your product |
| Business glossary, stakeholder maps, product objectives | Must be authored to reflect the actual product domain |

---

## 3. The Four Inheritance Operations

Every base ADR that a child encounters must be assigned one of four operations. This assignment is recorded in `DECISIONS.md`. Silence is not an option — an unreviewed ADR is an invisible risk.

### 3.1 Adopt

The child accepts the base ADR as-is. No local copy is created. The child's `DECISIONS.md` records the citation by identifier and upstream URL.

**Signal:** The decision applies to the child's context with no trade-off divergence.

**Obligation:** Citation in `DECISIONS.md`. The child is fully bound by the decision.

---

### 3.2 Extend

The child creates a local ADR that builds on a base ADR without contradicting it. The base ADR establishes the pattern; the local ADR adds domain-specific constraints, technology choices, or implementation details.

**Signal:** The base ADR is correct in principle but underspecified for the child's domain.

**Example:** Base ADR-0015 defines the injectable event bus pattern (in-memory → RabbitMQ → Kafka). Child ADR-0001 extends it by specifying the exact RabbitMQ exchange topology for the payments domain, the dead-letter strategy, and consumer group naming.

**Obligation:** Local ADR header must include `Extends: ADR-0015`.

---

### 3.3 Override

The child creates a local ADR that explicitly diverges from a base ADR. The local ADR must state why the base decision does not apply and document the alternative with its own trade-off analysis.

**Signal:** The child's operational, regulatory, or business context makes the base decision inapplicable or counterproductive.

**Example:** Base ADR-0030 selects Kong Gateway as the edge proxy. Child ADR-0002 overrides it because the child operates in an AWS-managed environment where the infrastructure team mandates AWS ALB as the single ingress point.

**Obligation:** Local ADR header must include `Overrides: ADR-0030` and a `Divergence Justification` section. Overrides require Architecture Council review before merging.

---

### 3.4 Not Applicable

The child records that a base ADR does not apply to its context without creating a divergence. No local ADR is needed — only a `DECISIONS.md` entry with a brief rationale.

**Signal:** The base ADR addresses a concern that is entirely irrelevant to the child (e.g., an Android ADR in a pure backend service, or a multi-tenancy ADR in a single-tenant internal tool).

**Obligation:** Entry in `DECISIONS.md` with operation `N/A` and a one-line reason. This prevents future reviewers from assuming the ADR was overlooked.

---

## 4. Local ADR Format

Local ADRs in child repositories follow the same format as base ADRs, with two additional header fields.

### 4.1 Extension Header Example

```markdown
# ADR-0001 — RabbitMQ Exchange Topology for Payments Domain

> **Status:** Accepted
> **Date:** 2026-05-22
> **Extends:** [ADR-0015 — Event-Driven Architecture Intra-Domain](https://github.com/beyondnetcode/evolith_arch32/reference/core/architecture/adrs/core/0015-event-driven-architecture-intra-domain.md)

## Context

ADR-0015 establishes the injectable event bus pattern and defines the migration path
from in-memory to RabbitMQ. This ADR specifies the concrete RabbitMQ topology
required by the payments domain, which is not covered by the base decision.

## Decision

Use a topic exchange `payments.events` with routing key pattern `payments.<entity>.<verb>`.
Dead-letter queue `payments.dlq` receives all unacknowledged messages after 3 retries.

## Consequences
...
```

### 4.2 Override Header Example

```markdown
# ADR-0002 — AWS ALB as Edge Proxy

> **Status:** Accepted
> **Date:** 2026-05-22
> **Overrides:** [ADR-0030 — API Gateway: Kong vs NestJS](https://github.com/beyondnetcode/evolith_arch32/reference/core/architecture/adrs/core/0030-two-tier-distributed-gateway-model.md)

## Divergence Justification

The infrastructure platform team mandates AWS ALB as the single ingress point for
all services in the organization's AWS landing zone. Operating a self-hosted Kong
instance alongside ALB introduces redundant routing layers, conflicting TLS termination,
and unsupported operational overhead for the platform team.

## Decision

Use AWS ALB with listener rules for path-based routing. Kong-specific features
(rate limiting, plugin ecosystem) are replaced by ALB WAF rules and Lambda authorizers.

## Consequences
...
```

---

## 5. Day Zero Checklist

Steps to perform when creating a new child repository from this base.

### Step 1 — Initialize the repository

```bash
git clone --depth 1 https://github.com/beyondnetcode/evolith_arch32.git my-product
cd my-product
rm -rf .git
git init
git add .
git commit -m "chore: bootstrap from corporate reference base v1.x"
```

### Step 2 — Remove demo assets

Delete content that must not carry over without deliberate adaptation:

```bash
# Remove demo implementation (replace with your product's src)
rm -rf src/apps/ums-api

# Remove UMS reference model documentation
rm -rf product/research/demo
```

### Step 3 — Author the mandatory files

| File | Content |
| :--- | :--- |
| `README.md` | Replace the base README with your product's executive portal. Include a `Upstream Base` link back to this repository. |
| `MASTER_INDEX.md` | Replace with role-based navigation for your product. |
| `DECISIONS.md` | Create with the table structure defined in Section 6. Triage every base ADR on the first pass. |
| `product/research/domain/` | Author your product's domain documentation: business glossary, bounded context map, stakeholder map, product objectives. |

### Step 4 — Configure the harness

```bash
# Copy harness rules (already included from clone)
# Verify it passes before your first commit
node .harness/scripts/ci/01-validate-docs.mjs
```

Add the validation to your CI pipeline:

```yaml
# .github/workflows/docs-validation.yml
- name: Validate documentation
  run: node .harness/scripts/ci/01-validate-docs.mjs
```

### Step 5 — Complete the first DECISIONS.md triage

Review every ADR in the base registry. For each ADR, assign one of the four operations (Adopt / Extend / Override / N/A) and record it in `DECISIONS.md`. This first triage is the most important governance act of the child repository's life.

---

## 6. Upstream Synchronization

Child repositories do not auto-track upstream commits. The following obligations apply:

| Event | Obligation | Owner |
| :--- | :--- | :--- |
| New base ADR published | Triage within the next planning cycle: Adopt / Extend / Override / N/A | Tech Lead |
| Base ADR deprecated or superseded | Review all local ADRs that extend or override the deprecated one | Tech Lead |
| Breaking change to harness or governance standards | Update harness copy and re-run `validate-docs.mjs` before the next release | Dev team |

Upstream changes are communicated through the base repository's ADR registry and changelog. Child teams are responsible for monitoring the upstream ADR index at each planning cycle.

### DECISIONS.md Format

```markdown
# DECISIONS.md — [Product Name]

Upstream base: https://github.com/beyondnetcode/evolith_arch32
Base version at init: [commit hash or tag]
Last triage: [date]

| ID    | Title                          | Operation | Upstream Ref | Local ADR                          | Notes                                          |
| :---- | :----------------------------- | :-------- | :----------- | :--------------------------------- | :--------------------------------------------- |
| C-001 | Use PostgreSQL                 | Adopt     | ADR-0001     | —                                  | No divergence                                  |
| C-002 | Hexagonal Architecture         | Adopt     | ADR-0002     | —                                  | No divergence                                  |
| C-003 | Event Bus topology             | Extend    | ADR-0015     | adrs/0001-event-bus-topology.md    | RabbitMQ fanout for payments domain            |
| C-004 | Replace Kong with AWS ALB      | Override  | ADR-0030     | adrs/0002-alb-over-kong.md         | Cloud-managed gateway mandated by infra team   |
| C-005 | Android stack profile          | N/A       | ADR-0040     | —                                  | Backend-only product; no mobile runtime        |
```

---

## 7. Promotion Path

When a local ADR solves a problem of universal applicability — not specific to the child's business domain — the Architecture Council may accept it as a pull request to the upstream base.

### Promotion Criteria

| Criterion | Description |
| :--- | :--- |
| **Runtime scope** | Runtime-agnostic or cleanly scoped to a single runtime profile |
| **Vendor neutrality** | Does not introduce a dependency on a proprietary or domain-specific tool |
| **Format compliance** | Follows the standard ADR format and passes `validate-docs.mjs` |
| **Maintenance commitment** | The proposing team accepts ongoing ownership of the decision in the upstream context |

### Promotion Process

1. Open a pull request against the upstream base with the ADR in the correct `adrs/` subdirectory.
2. Architecture Council reviews against the four criteria above.
3. If accepted, the ADR is renumbered in the upstream sequence.
4. The child's `DECISIONS.md` entry is updated from `Extend` or local ADR reference to `Adopt` with the new upstream identifier.

---

## 8. Real-World Reference — UMS Satellite

The **User Management System (UMS)** is a production satellite of this base. It demonstrates all four inheritance operations in a real product context and serves as the reference implementation for teams bootstrapping new children.

**Repository:** https://github.com/beyondnetcode/ums

### UMS inheritance decisions snapshot

| Operation | UMS ADR | Upstream Ref | Summary |
| :--- | :--- | :--- | :--- |
| Adopt | ADR-0050 | ADR-0056 (Naming & Taxonomy) | Naming conventions adopted verbatim for C#, SQL, REST, CloudEvents |
| Extend | ADR-0052 | ADR-0033 (Audit Trail) | Immutable audit trail extended with SQL Server temporal tables and RLS failsafe |
| Extend | ADR-0058 | ADR-0012 (API Gateway) | YARP gateway proposed as multi-client evolution; nginx retained as static server |
| Override | ADR-0059 | ADR-0030 (API Gateway split) | Single API tier decision: CQRS separation at protocol level, not deployment level |

### The Override pattern in practice — ADR-0059

Evolith permits splitting query and command surfaces into separate API tiers when scale or team ownership justifies it. UMS explicitly decided against this at MVP maturity.

**Why the override is valid:**
- CQRS read/write separation already exists at protocol level: GraphQL (queries) vs REST (commands).
- Splitting tiers would double operational cost with no measurable benefit at current load.
- Multi-tenant load isolation risk is mitigated by GraphQL complexity limits, per-operation timeouts, and per-tenant rate limiting at the YARP gateway layer.

**The override is time-bounded.** UMS ADR-0059 documents explicit triggers for when the decision must be revisited: independent read/write scale requirements, separate team ownership, or microservice extraction initiated.

> This is the intended pattern: **inherit the baseline, override with evidence, document the trigger to revert.**

### How UMS documents the satellite relationship

UMS exposes the governance model to its own developers in its Architecture Portal (`docs/architecture/index.md`), where it explains the three modes (Adopt / Specialize / Override) with worked examples. Teams building satellites are encouraged to replicate this portal section so that every developer on the child team understands the inheritance contract on day one.

---

## 9. Governance Obligations Summary

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
- [AI-Augmented Frameworks](../ai-augmented/frameworks/README.md)

---

[Back to Onboarding Index](./README.md)
