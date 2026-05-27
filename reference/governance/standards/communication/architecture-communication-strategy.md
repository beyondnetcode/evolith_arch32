# Evolith — Architecture Communication & Adoption Strategy

> **Bilingual navigation:** [Versión en Español](./architecture-communication-strategy.es.md)  
> **Owner:** Evolith Architecture Board  
> **Status:** Approved  
> **Last reviewed:** 2026-05-27

---

## Purpose of This Document

This document answers one question: **how do we explain the Evolith corporate architecture standard to everyone who needs to use it — without overwhelming them?**

It provides:
- An executive narrative of the full ecosystem
- A classification of what each repository is and does
- Visual model proposals for every audience layer
- A progressive communication strategy
- A governance and adoption roadmap
- Role-specific onboarding paths

---

## 1. The 30-Second Executive Narrative

> **Evolith is the corporate architectural contract.**
> Every software product in the organization inherits it, extends it, and reports back to it.
> It prevents reinventing the wheel — and prevents teams from building in incompatible directions.

> **UMS is the proof that it works.**
> It is a real, running enterprise product built entirely on the Evolith standard.
> It shows, not just tells, how the architecture behaves in production.

Together they form a **two-layer corporate ecosystem:**

```
┌─────────────────────────────────────────────────────────────┐
│                  EVOLITH ARCH32                             │
│          Corporate Architecture Framework                   │
│  "The rules, decisions, patterns, and evolution roadmap"   │
│                                                             │
│  ADRs · Blueprints · Standards · SDLC · Governance         │
└──────────────────────┬──────────────────────────────────────┘
                       │ inherits from / implements
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                       UMS                                   │
│          Enterprise Reference Implementation                │
│  "The executable demonstration that the rules work"        │
│                                                             │
│  .NET 8 · SQL Server · EF Core · 8 Bounded Contexts        │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Ecosystem Relationship Map

### 2.1 What each repository IS and IS NOT

| Dimension | Evolith Arch32 | UMS |
|---|---|---|
| **Type** | Architecture framework | Product implementation |
| **Contains** | Decisions, standards, blueprints, ADRs, patterns | Source code, tests, CI/CD, product docs |
| **Purpose** | Define HOW to build — rules and philosophy | Show HOW it was built — evidence and execution |
| **Audience** | All teams (strategic) | Engineering teams (tactical) |
| **Lifecycle** | Slow — evolves with industry and corporate needs | Fast — evolves with product requirements |
| **Inheritance** | Upstream (parent) | Downstream (child/satellite) |
| **Divergence policy** | Not divergable — defines baseline | May diverge with documented ADR overrides |
| **Code** | None (intentional) | Full enterprise product |

### 2.2 Content Classification Matrix

```
┌──────────────────────────────────────────────────────────────────────────┐
│                    EVOLITH CONTENT CLASSIFICATION                        │
├─────────────────────────┬────────────────────────────────────────────────┤
│ LAYER                   │ CONTENT                                        │
├─────────────────────────┼────────────────────────────────────────────────┤
│ Strategic Architecture  │ Architectural Directives                       │
│                         │ Evolutionary Strategy Roadmap                  │
│                         │ Maturity Matrix (TOGAF ACMM)                   │
│                         │ CAP Theorem Analysis                           │
│                         │ Multi-Cloud Deployment Scenarios               │
├─────────────────────────┼────────────────────────────────────────────────┤
│ Platform Foundation     │ Reference Blueprint (arc42 / C4 model)         │
│                         │ Agnostic Tech Stack Baseline                   │
│                         │ Authoritative Tech Stack (runtime profiles)    │
│                         │ Simplicity Checklist Phase 01                  │
│                         │ C4 Topology Spec                               │
├─────────────────────────┼────────────────────────────────────────────────┤
│ Architecture Decisions  │ 57 ADRs across Core / Node.js / .NET / Android │
│                         │ ADR Decision Matrix                            │
│                         │ Microservice Extraction Criteria (ADR-0045)    │
├─────────────────────────┼────────────────────────────────────────────────┤
│ DDD / Clean Arch        │ Tactical Design Patterns (ADR-0019)            │
│ Baseline                │ DDD Primitives Library (ADR-0029)              │
│                         │ Canonical Patterns (CP-01..08)                 │
│                         │ Hexagonal Port/Adapter pattern                 │
├─────────────────────────┼────────────────────────────────────────────────┤
│ Engineering Standards   │ Engineering Manifesto                          │
│                         │ Naming Conventions (ADR-0056)                  │
│                         │ Clean Code & SOLID rules                       │
│                         │ Anti-pattern blacklist                         │
├─────────────────────────┼────────────────────────────────────────────────┤
│ Governance              │ Architecture Board ownership                   │
│                         │ ADR review and approval process                │
│                         │ Glossary of terms                              │
│                         │ Repository Taxonomy                            │
│                         │ Child Repository Inheritance Guide             │
├─────────────────────────┼────────────────────────────────────────────────┤
│ Delivery Framework      │ SDLC Framework (3 stages)                      │
│                         │ Construction-Focused SDLC                      │
│                         │ Definition of Done                             │
│                         │ Functional Story Writing Standard              │
├─────────────────────────┼────────────────────────────────────────────────┤
│ Observability /         │ OTel + Loki + Tempo stack                      │
│ Security / DevOps       │ Grafana dashboards                             │
│                         │ Gitflow Branching (ADR-0050)                   │
│                         │ CI/CD Quality Gates (ADR-0005)                 │
│                         │ Vendor Risk Assessment                         │
├─────────────────────────┼────────────────────────────────────────────────┤
│ Reference               │ UMS Hub (boundary documentation)               │
│ Implementation          │ UMS Reference Model                            │
│                         │ Demo vs Reference boundary                     │
└─────────────────────────┴────────────────────────────────────────────────┘
```

---

## 3. Architecture Landscape — Full Ecosystem View

```
╔═══════════════════════════════════════════════════════════════════════╗
║              EVOLITH CORPORATE ARCHITECTURE ECOSYSTEM                ║
╠═══════════════════════════════════════════════════════════════════════╣
║                                                                       ║
║  ┌─────────────────────────────────────────────────────────────────┐ ║
║  │ VISION LAYER                                       [BOARD]      │ ║
║  │  "Why we build the way we build"                                │ ║
║  │  Architectural Directives · Evolutionary Roadmap · Maturity     │ ║
║  └──────────────────────────┬──────────────────────────────────────┘ ║
║                             │                                         ║
║  ┌──────────────────────────▼──────────────────────────────────────┐ ║
║  │ STANDARDS LAYER                                    [ARCHITECTS] │ ║
║  │  "What the rules are"                                           │ ║
║  │  ADRs · Blueprints · Engineering Manifesto · Glossary          │ ║
║  └──────────────────────────┬──────────────────────────────────────┘ ║
║                             │                                         ║
║  ┌──────────────────────────▼──────────────────────────────────────┐ ║
║  │ DELIVERY LAYER                                     [ENGINEERS]  │ ║
║  │  "How we deliver"                                               │ ║
║  │  SDLC · DoD · Story Standards · Gitflow · CI/CD Gates          │ ║
║  └──────────────────────────┬──────────────────────────────────────┘ ║
║                             │                                         ║
║  ┌──────────────────────────▼──────────────────────────────────────┐ ║
║  │ PATTERNS LAYER                               [ALL DEVELOPERS]   │ ║
║  │  "Reusable proven solutions"                                    │ ║
║  │  Canonical Patterns · DDD Primitives · Result Pattern          │ ║
║  └──────────────────────────┬──────────────────────────────────────┘ ║
║                             │                                         ║
║  ┌──────────────────────────▼──────────────────────────────────────┐ ║
║  │ EVIDENCE LAYER                                     [ALL ROLES]  │ ║
║  │  "It works — here is the proof"                                 │ ║
║  │  UMS (executable product) · Traceability Matrix · Runbooks     │ ║
║  └─────────────────────────────────────────────────────────────────┘ ║
║                                                                       ║
╚═══════════════════════════════════════════════════════════════════════╝
```

---

## 4. Progressive Architecture Journey

The most important mental model is the **evolutionary path**. Nothing is skipped; nothing is forced prematurely.

```
 BUSINESS NEED          ARCHITECTURE STAGE        EVOLITH ARTIFACTS
 ─────────────          ──────────────────        ─────────────────

 ┌─────────────┐        ┌──────────────────┐      ADR-0047
 │ New product │──────▶ │ Simple Monolith  │      Simplicity Checklist
 │ idea        │        └────────┬─────────┘      Phase 01 Blueprint
 └─────────────┘                 │
                                 │ team grows,
                                 │ domains multiply
                                 ▼
                        ┌──────────────────┐      ADR-0001 (Nx)
                        │ Modular Monolith │      ADR-0002 (Hexagonal)
                        │   [DEFAULT]      │      ADR-0031 (Schema/Context)
                        └────────┬─────────┘      Engineering Manifesto
                                 │
                                 │ 2-of-4 criteria
                                 │ (ADR-0045)
                                 ▼
                        ┌──────────────────┐      ADR-0006 (Dapr)
                        │   Distributed    │      ADR-0033 (Outbox)
                        │    Modules       │      ADR-0035 (Sagas)
                        └────────┬─────────┘      TE-04, TE-05
                                 │
                                 │ operational
                                 │ complexity justifies
                                 ▼
                        ┌──────────────────┐      ADR-0046 (Dapr OTel)
                        │  Microservices   │      ADR-0055 (Microfrontends)
                        │  [NORTH STAR]    │      ADR-0013 (Cloud/DR)
                        └──────────────────┘      Multi-Cloud Scenarios
```

**Key insight for every audience:** You do not need to understand all four stages at once. Start at the stage your product is in today.

---

## 5. Capability Map

This map answers "what can the Evolith platform do for a product team?"

```
┌─────────────────────────────────────────────────────────────────────┐
│                    EVOLITH CAPABILITY MAP                           │
├──────────────────┬──────────────────┬─────────────────┬────────────┤
│   ARCHITECTURAL  │   ENGINEERING    │    DELIVERY     │ OPERATIONS │
│   CAPABILITIES   │   CAPABILITIES   │  CAPABILITIES   │ CAPABILITY │
├──────────────────┼──────────────────┼─────────────────┼────────────┤
│ ✓ Progressive    │ ✓ SOLID/Clean    │ ✓ SDLC stages   │ ✓ OTel     │
│   evolution path │   Code baseline  │   defined       │   tracing  │
│                  │                  │                 │            │
│ ✓ Multi-tenancy  │ ✓ DDD tactical   │ ✓ Definition    │ ✓ Grafana  │
│   dual-layer RLS │   toolkit        │   of Done       │   dashbrd  │
│                  │                  │                 │            │
│ ✓ Zero-trust     │ ✓ Anti-pattern   │ ✓ Story writing │ ✓ Loki     │
│   security model │   blacklist      │   standard      │   logging  │
│                  │                  │                 │            │
│ ✓ Polyglot       │ ✓ Test pyramid   │ ✓ Gitflow       │ ✓ Runbooks │
│   multi-runtime  │   70% gate       │   branching     │   (RB 1-4) │
│                  │                  │                 │            │
│ ✓ Event-driven   │ ✓ Naming         │ ✓ CI/CD quality │ ✓ DB       │
│   architecture   │   conventions    │   gates         │   failover │
│                  │                  │                 │            │
│ ✓ Contract-first │ ✓ Canonical      │ ✓ ADR review    │ ✓ Cache    │
│   API design     │   patterns       │   process       │   recovery │
├──────────────────┴──────────────────┴─────────────────┴────────────┤
│           All capabilities are runtime-agnostic by default.        │
│     Node.js / .NET / Android profiles add concrete tooling.        │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 6. Communication Strategy by Audience

### 6.1 Audience Map

```
                        ┌──────────────────┐
                        │    EXECUTIVE /   │
                        │     SPONSOR      │
                        │  "Vision + ROI"  │
                        └────────┬─────────┘
                                 │
              ┌──────────────────┼──────────────────┐
              │                  │                  │
    ┌─────────▼──────┐  ┌────────▼───────┐  ┌──────▼──────────┐
    │   ARCHITECT /  │  │  PRODUCT OWNER │  │ EXTERNAL VENDOR │
    │  TECH LEAD     │  │      / PM      │  │  / PROVIDER     │
    │ "Standards +   │  │ "Scope +       │  │ "Contracts +    │
    │  Decisions"    │  │  Boundaries"   │  │  Integration"   │
    └─────────┬──────┘  └────────────────┘  └─────────────────┘
              │
   ┌──────────┼──────────┬──────────┐
   │          │          │          │
┌──▼──┐   ┌──▼──┐   ┌───▼──┐  ┌───▼──┐
│BACK │   │FRONT│   │ QA / │  │DEV   │
│END  │   │END  │   │SDET  │  │OPS   │
│DEV  │   │DEV  │   │      │  │/SRE  │
└─────┘   └─────┘   └──────┘  └──────┘
```

### 6.2 Message by Audience

#### For Executives / Sponsors
**Core message:** "Evolith prevents architectural chaos as the company grows. It is the technical contract that protects investment."

Talking points:
- 57+ pre-validated architectural decisions = less board-level risk
- 3-phase evolution path = predictable cost and timeline
- UMS proves the model works in production today
- Architecture Board ensures governance without bureaucracy

**Recommended entry:** Architectural Directives → Evolutionary Roadmap → Maturity Matrix

---

#### For Architects / Tech Leads
**Core message:** "Every decision is documented, justified, and enforceable. You inherit a curated set of standards and extend them with local ADRs."

Talking points:
- 57 runtime-agnostic + runtime-specific ADRs with context/decision/consequences
- Clear extraction criteria prevent premature microservice splits (ADR-0045)
- Child repository inheritance model with documented divergence paths
- Architecture Board review process for promotions upstream

**Recommended entry:** Architecture Hub → ADR Registry → Reference Blueprint

---

#### For Backend / Frontend Developers
**Core message:** "You do not need to read everything. Your runtime profile tells you exactly which ADRs and patterns apply to you."

Talking points:
- Start with the Engineering Manifesto (7 principles, 5 anti-patterns)
- Pick your runtime profile: Node.js, .NET, or Android
- Apply canonical patterns (CP-01..08) for common scenarios
- UMS shows you real working code following every rule

**Recommended entry:** Engineering Manifesto → Runtime ADR profile → UMS reference implementation

---

#### For QA / SDET
**Core message:** "Quality is automated and enforced at every stage. Your job is to verify contracts, not chase bugs."

Talking points:
- Testing pyramid with 70% coverage gate enforced in CI
- Contract Testing Guideline (Pact-based)
- Integration and E2E testing ADR (ADR-0053)
- Testcontainers for isolated integration tests
- UMS Technical Enablers show the test implementation patterns

**Recommended entry:** Testing Pyramid ADR (0018) → Contract Testing Guide → Integration Strategy ADR (0053)

---

#### For DevOps / SRE
**Core message:** "Infrastructure is a replaceable detail. The platform is designed for self-hosted OSS first, cloud portability always."

Talking points:
- Self-hosted OSS infrastructure ADR (0028)
- OTel + Loki + Tempo + Grafana stack
- Gitflow branching with semantic CI/CD gates
- 4 runbooks covering the most critical operational scenarios
- Multi-cloud deployment scenarios

**Recommended entry:** Infrastructure Hub → Operations Hub → ADR-0028 → Runbooks

---

#### For External Vendors / Providers
**Core message:** "Your integration must respect our contracts. We use explicit, versioned APIs. We do not accept vendor lock-in inside our domain."

Talking points:
- Contract-first: OpenAPI (public REST), Protobuf/gRPC (internal), AsyncAPI (events)
- Adapters for every external dependency — no raw SDK imports inside domain
- Vendor Risk Assessment checklist must be completed before approval
- Feature flagging allows phased rollout without core coupling

**Recommended entry:** Agnostic Baseline → ADR-0040 (Multi-Runtime Contracts) → Vendor Risk Assessment

---

## 7. Mental Model Proposals

### 7.1 The Three Circles Model (Hexagonal Simplified)

```
         ┌──────────────────────────────────┐
         │           INFRASTRUCTURE         │
         │   (DBs, APIs, Cloud, UI)         │
         │   ┌──────────────────────────┐   │
         │   │      APPLICATION         │   │
         │   │   (Use Cases, CQRS,      │   │
         │   │    Orchestration)        │   │
         │   │   ┌──────────────────┐   │   │
         │   │   │     DOMAIN       │   │   │
         │   │   │  (Rules, Entities│   │   │
         │   │   │   Value Objects) │   │   │
         │   │   │  ← PROTECTED →   │   │   │
         │   │   └──────────────────┘   │   │
         │   └──────────────────────────┘   │
         └──────────────────────────────────┘
                         ▲
             Dependencies point INWARD only.
          Infrastructure knows Application.
          Application knows Domain.
          Domain knows NOTHING outside itself.
```

**Use this model to explain:** Why we don't write SQL inside business logic. Why we don't import Redis inside a service class. Why a domain entity has no `@Column` decorator.

---

### 7.2 The Inherited Contract Model

```
  EVOLITH ARCH32                UMS (and all future products)
  ══════════════                ════════════════════════════
  │ ADRs          │  inherits   │ Inherits all ADRs          │
  │ Blueprints    │ ──────────▶ │ Adds product ADRs          │
  │ Standards     │             │ Documents divergences      │
  │ Patterns      │             │ Promotes discoveries back  │
  └───────────────┘             └────────────────────────────┘
         ▲                                    │
         │         promotion path             │
         └────────────────────────────────────┘
```

**Use this model to explain:** Why UMS is not a template to copy/paste. Why architectural decisions in UMS that are universally valid travel back upstream to Evolith.

---

### 7.3 The Decision Funnel (ADR Navigation)

```
  START HERE for every architectural question:

  "Do I have a question about...?"

        ┌──────────────────────────────────────────┐
        │ UNIVERSAL (runtime agnostic)             │ ─▶ Core ADRs (0001-0056)
        │ Multi-tenancy, Events, CQRS, Sagas...    │
        └──────────────────────────────────────────┘
        ┌──────────────────────────────────────────┐
        │ NODE.JS / TYPESCRIPT                     │ ─▶ Node ADRs (0002-0043)
        │ NestJS, TypeORM, BFF, GraphQL...         │
        └──────────────────────────────────────────┘
        ┌──────────────────────────────────────────┐
        │ .NET / C#                                │ ─▶ .NET ADRs (0057+)
        │ EF Core, SQL Server, Clean Architecture  │
        └──────────────────────────────────────────┘
        ┌──────────────────────────────────────────┐
        │ ANDROID / MOBILE                         │ ─▶ Android ADRs
        │ Kotlin, offline-first, GPS/scan          │
        └──────────────────────────────────────────┘
        ┌──────────────────────────────────────────┐
        │ DON'T KNOW WHERE TO START                │ ─▶ ADR Decision Matrix
        └──────────────────────────────────────────┘
```

---

## 8. Governance Model

### 8.1 Who Owns What

```
┌─────────────────────────────────────────────────────────────┐
│              EVOLITH GOVERNANCE STRUCTURE                   │
├─────────────────────┬───────────────────────────────────────┤
│ BODY                │ RESPONSIBILITY                        │
├─────────────────────┼───────────────────────────────────────┤
│ Architecture Board  │ Approves ADRs, owns Evolith baseline, │
│                     │ adjudicates inter-product disputes     │
├─────────────────────┼───────────────────────────────────────┤
│ Product Architect   │ Owns child repository ADRs, documents │
│ (per product team)  │ divergences, nominates promotions     │
├─────────────────────┼───────────────────────────────────────┤
│ Tech Lead           │ Enforces compliance in daily delivery │
│ (per squad)         │ reviews PRs against ADR constraints   │
├─────────────────────┼───────────────────────────────────────┤
│ All Engineers       │ Follow the standards; raise issues    │
│                     │ via ADR proposals, not workarounds    │
└─────────────────────┴───────────────────────────────────────┘
```

### 8.2 Decision Flow

```
 New architectural question arises
           │
           ▼
 ┌─────────────────────┐      YES     ┌────────────────────────┐
 │ Does an ADR already │ ───────────▶ │ Follow it. Document     │
 │ answer this?        │              │ local deviation if any. │
 └─────────────────────┘              └────────────────────────┘
           │ NO
           ▼
 ┌─────────────────────┐
 │ Is it product-      │      YES     ┌────────────────────────┐
 │ specific?           │ ───────────▶ │ Write ADR in child repo │
 └─────────────────────┘              │ No Board approval needed│
           │ NO                        └────────────────────────┘
           ▼
 ┌─────────────────────┐
 │ Write ADR proposal  │
 │ for Evolith Board   │
 │ review              │
 └─────────┬───────────┘
           │
    Board reviews
           │
    ┌──────┴──────┐
    │  APPROVED   │ ──▶ Merged into Evolith · All child repos inherit
    └─────────────┘
```

---

## 9. Progressive Adoption Roadmap

### For a new product team starting from Evolith:

```
WEEK 1-2: ORIENTATION
────────────────────
□ Read Architectural Directives (vision)
□ Read Engineering Manifesto (rules)
□ Read Agnostic Baseline (non-negotiables)
□ Read Child Repository Inheritance Guide
□ Clone the repository taxonomy structure

WEEK 3-4: FOUNDATION
────────────────────
□ Select runtime profile (Node.js / .NET / Android)
□ Read runtime-specific ADRs for your stack
□ Study UMS bounded contexts as reference
□ Set up Nx monorepo + linting gates
□ Write first product ADR documenting first divergence

WEEK 5-8: FIRST DELIVERY (Phase 1 - Modular Monolith)
──────────────────────────────────────────────────────
□ Apply Hexagonal Architecture (Ports + Adapters)
□ Define database model — single schema (SOA-centric) is valid in Phase 1;
  schema-per-context is optional and can be introduced progressively as domain
  boundaries solidify (ADR-0031 governs when to adopt it)
□ Implement testing pyramid (70% coverage gate)
□ Set up OTel + Loki + Grafana observability
□ Follow Gitflow branching strategy
□ Implement Transactional Outbox for async writes

MONTH 3+: SCALE (Phase 2 — as metrics justify)
───────────────────────────────────────────────
□ Run ADR-0045 microservice extraction readiness check
□ Extract first service only if 2-of-4 criteria met
□ Evaluate native DB-level RLS activation — optional; justified only when
  app-side security (APP_AGNOSTIC) becomes a measurable performance bottleneck;
  ADR-0044 / ADR-0010 govern the switch decision (INFRA_NATIVE vs APP_AGNOSTIC)
□ Enable full distributed tracing
□ Integrate Dapr for service mesh abstraction

FUTURE: NORTH STAR (Phase 3 — deliberate choice)
─────────────────────────────────────────────────
□ Multi-cloud orchestration
□ Event-driven architecture at scale
□ Zero-trust network enforcement
□ Compliance-as-Code in CI pipelines
```

### For an external provider / integrator:

```
STEP 1: Understand the contract model (1 day)
  → Read: Agnostic Baseline + ADR-0040 (contracts)
  → Know: OpenAPI / Protobuf / AsyncAPI are your interfaces

STEP 2: Complete vendor checklist (1-2 days)
  → Complete: Vendor Risk Assessment
  → Confirm: Adapter boundary — no direct SDK injection

STEP 3: Integration validation (1 week)
  → Implement against the OpenAPI spec
  → Run contract tests (Pact or schema-validation)
  → Verify no domain coupling introduced
```

---

## 10. Recommended Documentation Structure

### Current structure assessment:
The repositories are well-organized but assume deep familiarity. Navigation is efficient for users who know what they are looking for, but can be overwhelming for first-time readers.

### Proposed communication layer (new files to create):

```
evolith_arch32/
└── reference/
    └── governance/
        └── standards/
            └── communication/                         ← THIS FILE IS HERE
                ├── architecture-communication-strategy.md   (this document)
                ├── executive-one-pager.md              ← 1 page, no jargon
                ├── visual-landscape.md                 ← diagrams only
                ├── audience-guide.md                   ← who reads what
                └── onboarding-checklist.md             ← role-specific checklists
```

### Layered reading guide (progressive disclosure):

```
LAYER 0 — Any newcomer (30 minutes)
  → Executive One-Pager (to be created)
  → Architecture Journey diagram (section 4 above)

LAYER 1 — By role (2-4 hours)
  → Reading paths in MASTER_INDEX § 2 "Recommended Reading by Role"

LAYER 2 — Working reference (ongoing)
  → ADR Decision Matrix
  → Runtime-specific ADR list
  → Canonical Patterns

LAYER 3 — Deep governance (as needed)
  → Full ADR texts
  → Engineering Manifesto sections
  → SDLC framework details
```

---

## 11. Overlaps, Gaps, and Complementary Areas

### Overlaps (intentional — healthy redundancy)
| Topic | Evolith location | UMS location |
|---|---|---|
| Multi-tenancy strategy | ADR-0010 | TE-03, RLS model, architecture docs |
| Authorization model | ADR-0012, ADR-0021 | FS-02/05/07/14/16, bounded contexts |
| Event bus usage | ADR-0015, ADR-0033 | TE-04, TE-05, FS-06/10/15 |
| Testing standards | ADR-0018, ADR-0052/0053 | UMS test pyramid, Testcontainers |

These overlaps are healthy — Evolith provides the rule; UMS shows the evidence.

### Gaps identified (opportunities)
| Gap | Recommendation |
|---|---|
| No API design guide | Create ADR or standard for REST resource naming, versioning, pagination |
| No security incident runbook | Add RB-05 (Security Breach Response) to UMS + reference from Evolith |
| No data migration standard | ADR needed for zero-downtime migration strategy |
| No SLA / SLO definitions | Add SLO targets to observability standards |
| No AI-assisted code review standard | Extend AI-Augmented Engineering standards |

### Complementary areas (strongest synergy)
The FS → ADR → TE traceability matrix in UMS is the clearest proof that Evolith ADRs are not theoretical. Every UMS functional story traces back to at least one Evolith ADR. This traceability is the most powerful communication tool available — show it to skeptics.

---

## 12. Key Visuals to Build (Next Actions)

The following visual artifacts are proposed for creation, ordered by impact:

| Priority | Visual | Tool | Audience | Purpose |
|---|---|---|---|---|
| 🔴 1 | Executive One-Pager (ecosystem overview) | Markdown / slide | Executive | Entry point for non-technical readers |
| 🔴 2 | Progressive Journey Diagram | Mermaid / draw.io | All | Explain stages without overwhelming |
| 🔴 3 | Capability Map (interactive) | draw.io / Miro | Architects, PMs | What Evolith provides per capability |
| 🟠 4 | ADR Decision Tree (interactive) | draw.io / Obsidian | Architects, Devs | Navigate to the right ADR fast |
| 🟠 5 | Onboarding Journey Map (by role) | Miro | HR, Tech Leads | Structured ramp-up for new joiners |
| 🟠 6 | Governance Flow Diagram | Mermaid | Architects | ADR lifecycle visualization |
| 🟡 7 | UMS → Evolith Traceability Visual | Mermaid / draw.io | Tech Leads, QA | ADR coverage heatmap |
| 🟡 8 | Infrastructure Topology Map | draw.io | DevOps | Full deployment view |

---

## 13. The Single Most Important Insight

> **Complexity in these repositories is not a documentation problem — it is an accurate reflection of real enterprise architecture.**
>
> The solution is not to simplify the content.
> The solution is to **expose it progressively**, starting with the business vision,
> and letting each audience go as deep as their role requires.
>
> Evolith already has this structure. The missing piece is a clear **entry layer** —
> a one-page "here is what this is, here is why it exists, here is where to start."
>
> That is what this document provides, and what the Executive One-Pager (see § 12) should deliver visually.

---

## References

- [Architectural Directives](../vision/architectural-directives.md)
- [Evolutionary Strategy Roadmap](../vision/evolutionary-strategy-roadmap.md)
- [Engineering Manifesto](../engineering/engineering-manifesto.md)
- [Reference Blueprint](../../../architecture/blueprints/reference-blueprint.md)
- [ADR Registry](../../../architecture/adrs/README.md)
- [UMS Reference Hub](../../../knowledge/demo/README.md)
- [Child Repository Inheritance Guide](../onboarding/child-repository-inheritance-guide.md)
- [Repository Taxonomy](../repository-taxonomy.md)

---

<div align="center">
  <sub>Evolith — Enterprise Architecture Platform | Architecture Communication Strategy</sub>
</div>
