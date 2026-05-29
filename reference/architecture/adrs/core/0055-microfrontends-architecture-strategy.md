# ADR-0055: Microfrontends Architecture Strategy

## Status

Proposed (Phase 3 Readiness)

## Context

The Progressive Monolith architecture focuses on modularity first and distribution later. The same principle applies to the web frontend: Evolith products SHOULD begin with a **modular monolithic UI**, not with distributed microfrontends.

Starting with microfrontends too early introduces avoidable operational and architectural complexity:
* shell/orchestrator setup before there is a scaling need,
* multiple frontend CI/CD pipelines before independent deployment is required,
* shared dependency and runtime-version coordination,
* cross-MFE routing and state-management complexity,
* higher risk of visual inconsistency if the design system is bypassed.

As the system reaches Phase 3 (Distributed Services), the frontend application may face similar scaling challenges:
* **Deployment Contention**: Multiple teams needing to deploy changes to the same monolithic UI.
* **Technology Lock-in**: Difficulty in upgrading parts of the UI to newer framework versions.
* **Scaling Complexity**: A single large bundle becoming difficult to manage and optimize.

## Decision

We will adopt a **Microfrontend (MFE)** strategy only as a **Phase 3+ extraction strategy**, not as the initial frontend baseline.

Evolith products MUST follow this progression:

| Phase | UI delivery model | Guidance |
|---|---|---|
| Phase 1 | Modular monolithic web application | Use one deployable React application with clear internal feature, route, and bounded-context boundaries. |
| Phase 2 | Modular UI with stronger domain ownership | Preserve one deployable UI while strengthening route-level lazy loading, design-system governance, API boundaries, and applied-reference mapping. |
| Phase 3+ | Microfrontends by exception | Extract MFEs only when team scale, deployment contention, or independent lifecycle requirements justify the added complexity. |

Microfrontends MUST NOT be used as a default starting architecture, a trend-driven choice, or a substitute for clean modular frontend design.

### Key Principles:

1. **Start Modular, Not Distributed**: Build a single modular React application first. Distribution is an extraction decision, not a default.
2. **Vertical Ownership**: Teams that own a backend domain service may own the corresponding UI fragment once Phase 3 extraction is justified.
3. **Runtime Integration**: Use **Module Federation** (Vite or Webpack 5) as the primary integration mechanism only after MFE extraction is approved.
4. **Shared Design System**: All MFEs MUST utilize the corporate design system (CSS Variables, Shared Components) to ensure visual consistency.
5. **BFF Alignment**: Each client-facing MFE should communicate via its specific BFF (Backend-for-Frontend) or a unified Gateway.

### Extraction Triggers (When to move to MFEs):

* Team size exceeds 15-20 frontend developers.
* Deployment frequency of specific modules exceeds the tolerance of the main release cycle.
* Requirement for independent technology lifecycles in isolated UI sections.
* A bounded UI area has clear ownership, stable contracts, and measurable release independence needs.

## Consequences

* **Positive**: Independent deployability, localized technology choices, improved team autonomy once the organization reaches Phase 3 scale.
* **Negative**: Increased infrastructure complexity (CI/CD pipelines per MFE), risk of visual inconsistency if the design system is bypassed, initial overhead in orchestrator setup.
* **Neutral**: Requires a centralized "Shell" or "Orchestrator" application to manage routing and shared state.
* **Governance**: Any product introducing MFEs before Phase 3 MUST document an explicit ADR deviation with business, team-scale, and deployment evidence.
