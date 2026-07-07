# V-01 — Executive One-Pager: Evolith Governance Control Plane

> **Audience:** Executive / Sponsor  
> **Purpose:** Single-page view of the new product vision  
> **Bilingual:** [Español](./v01-executive-one-pager.es.md)  
> **Freshness rule:** Review whenever Evolith changes its governance kernel, provider model, Phase Gates, evidence model, or product positioning.

---

## The Question This Visual Answers

> **What does Evolith uniquely own if Jira, Claude, Langfuse, Superset, CI/CD, and other tools already exist?**

---

## Visual 1-A — The New Evolith Ecosystem

```mermaid
flowchart TB
    classDef core fill:#1e3a5f,stroke:#3b82f6,color:#fff,font-weight:bold
    classDef tracker fill:#14532d,stroke:#22c55e,color:#fff,font-weight:bold
    classDef provider fill:#4a1d96,stroke:#a855f7,color:#fff
    classDef product fill:#374151,stroke:#9ca3af,color:#fff
    classDef board fill:#4a3800,stroke:#f59e0b,color:#fff,font-weight:bold

    BOARD["Architecture Board\nApproves the Constitution and target designs"]:::board
    CORE["Evolith Core\nRules · Schemas · Taxonomy · Provider Contracts"]:::core
    TRACKER["Evolith Tracker\nGovernance Control Plane\nGates · Evidence · Decisions · Audit"]:::tracker

    WORK["Work Management\nJira · Azure DevOps · GitHub Issues · Alternatives"]:::provider
    AGENT["Agent Execution\nClaude · OpenAI · Gemini · Local Models"]:::provider
    OBS["Observability\nLangfuse · OpenTelemetry · Alternatives"]:::provider
    BI["Analytics\nSuperset · Grafana · Alternatives"]:::provider
    DELIVERY["SCM · CI/CD · Testing · Security · Deployment"]:::provider

    PRODUCTS["Satellite Products\nUMS · Evolith Tracker · Future Products"]:::product

    BOARD --> CORE
    CORE -->|defines governance contracts| TRACKER
    TRACKER <-->|plugins, adapters and evidence| WORK
    TRACKER <-->|plugins, adapters and evidence| AGENT
    TRACKER <-->|plugins, adapters and evidence| OBS
    TRACKER -->|trusted semantic model| BI
    TRACKER <-->|plugins, adapters and evidence| DELIVERY
    CORE -->|inherited rules| PRODUCTS
    PRODUCTS -->|activity and evidence| TRACKER
    PRODUCTS -.->|validated lessons upstream| BOARD
```

---

## Visual 1-B — Who Does What

```mermaid
flowchart LR
    J["Jira and Work Tools\nManage work"]
    C["Claude and Other Agents\nExecute bounded work"]
    L["Langfuse and Observability Tools\nObserve AI and runtime"]
    S["Superset and Analytics Tools\nVisualize governed data"]
    D["SCM, CI/CD, Testing and Deployment\nProduce operational facts"]
    E["EVOLITH\nApplies rules · consolidates evidence · decides gates · audits"]

    J --> E
    C --> E
    L --> E
    S --> E
    D --> E
```

> **Tools execute and report. Evolith interprets, governs, decides, and preserves the audit chain.**

---

## Visual 1-C — Replaceable by Design

```mermaid
flowchart LR
    CAP["Canonical Evolith Capability"]
    PORT["Provider Port"]
    PLUGIN["Plugin / Add-in / Adapter / Connector"]
    DEFAULT["Default Provider"]
    ALT["Alternative Provider"]

    CAP --> PORT --> PLUGIN
    PLUGIN --> DEFAULT
    PLUGIN --> ALT

    DEFAULT -.->|replace without changing gates, domain or history| ALT
```

### Non-Negotiable Product Premise

- Every external tool is adaptable and interchangeable.
- Defaults accelerate onboarding but are never architectural dependencies.
- Provider-specific schemas remain behind ACLs.
- Tenants may select allowed, preferred, fallback, or self-hosted providers.
- Replacement preserves canonical state and historical evidence.

---

## Visual 1-D — The Irreducible Evolith Kernel

```mermaid
mindmap
  root((Evolith\nGovernance Kernel))
    Constitution
      Rulesets
      Schemas
      Taxonomy
      Provider contracts
    Runtime Governance
      Five Phase Gates
      Canonical Gate Decisions
      Approvals and exceptions
      Immutable audit
    Evidence Graph
      Source lineage
      Human and agent activity
      Commits, tests and deployments
      Integrity and policy versions
    Provider Neutrality
      Plugins and adapters
      Tenant-selected defaults
      Replacement and migration
      Certification and health
    Federated Learning
      Satellite evidence
      Architecture Board review
      Upstream promotion
```

---

## Visual 1-E — Progressive Adoption

```mermaid
timeline
    title Evolith Adoption — Prove Governance Before Scaling Features
    section Governance Proof
        One tenant and product : Five minimum gates and one Evidence Graph
    section Composable MVP
        Connect existing tools : Work, SCM, CI, agent, observability and analytics providers
    section Enterprise Control Plane
        Scale governance : Tenant policies, approvals, exceptions, compliance and audit
    section Ecosystem
        Expand safely : Certified plugins, managed adapters and private catalogs
```

---

## Executive Takeaway

> **Evolith is not another Jira, BI tool, agent, or observability product.**  
> **It is the provider-neutral governance control plane that makes those capabilities operate as one auditable engineering system.**

UMS remains a living satellite reference that proves Evolith patterns in real software, but it is one product inside the broader governed ecosystem.

---

*Part of the [Architecture Communication Strategy](../architecture-communication-strategy.md). Detailed design: [Governed Composition Target Design](../../evolith-governed-composition-target-design.md).*