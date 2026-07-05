# Architecture Blueprints

> **Bilingual Navigation:** [Versión en Español](../blueprints/README.md)

Blueprints define the **structural laws** of the reference architecture. They are runtime-agnostic by default — concrete technology choices live in the runtime profiles.

Read the agnostic baseline first. Then read the runtime profile for your target stack. Use the reference blueprint to understand the full C4 model and decision logic.

---

## Reading Order

| Step | Document | Purpose |
| :--- | :--- | :--- |
| 1 | [Agnostic Architecture Baseline](./authoritative-tech-stack-agnostic.md) | Universal rules that apply to every runtime. Start here. |
| 2 | [Reference Blueprint (arc42)](./reference-blueprint.md) | Full C4 model, Phase 1→3 evolution, ADR matrix, quality attributes. |
| 3 | [Simplicity Checklist — Phase 1](./simplicity-checklist-phase-01.md) | Gate checklist before adding any complexity. |
| 4 | Your runtime profile (below) | Concrete technology decisions for your stack. |

---

## Runtime Profiles

| Runtime | Profile |
| :--- | :--- |
| Node.js / TypeScript | [authoritative-tech-stack-nodejs.md](./authoritative-tech-stack-nodejs.md) |
| .NET / C# | [authoritative-tech-stack-dotnet.md](./authoritative-tech-stack-dotnet.md) |
| Android / Kotlin | [authoritative-tech-stack-android.md](./authoritative-tech-stack-android.md) |
| All runtimes (index) | [authoritative-tech-stack.md](./authoritative-tech-stack.md) |

---

## Supplemental Analysis

| Document | Purpose |
| :--- | :--- |
| [C4 Topology Spec](./c4-topology-spec.md) | Formal C4 model definitions for all diagram levels |
| [Observability Architecture Flow](./observability-architecture-flow.md) | End-to-end signal flow for correlation, AOP logging, traces, metrics, and telemetry sinks |
| [Notification & Feedback Architecture](./notification-feedback-architecture.md) | Dual-visibility pattern for surfacing business errors — ephemeral toasts + persistent drawer, single extraction point, mutation factory |
| [CAP Strategic Analysis](./cap-strategic-analysis.md) | CAP theorem trade-off analysis per phase |
| [Multi-Cloud Deployment Scenarios](./multi-cloud-deployment-scenarios.md) | Cloud-agnostic deployment topology options |
| [Tech Stack Summary](./tech-stack-summary.md) | Node.js / demo quick-reference card (not the universal policy) |

---

[Back to Architecture Root](../../README.md)
