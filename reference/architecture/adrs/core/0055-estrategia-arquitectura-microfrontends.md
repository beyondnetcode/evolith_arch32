# ADR-0055: Microfrontends Architecture Strategy

## Status

Proposed (Preparation for Phase 3)

## Context

The Progressive Monolith architecture prioritizes modularity first, distribution second. The same principle applies to web frontend: Evolith products SHOULD start with a **modular monolithic UI**, not with distributed microfrontends.

Starting with microfrontends too early introduces avoidable operational and architectural complexity:
* shell/orchestrator configuration before a real scale need exists
* multiple frontend CI/CD pipelines before independent deployment is required
* shared dependency and runtime version coordination
* routing and state management complexity between MFEs
* higher risk of visual inconsistency if the design system is omitted

As the system reaches Phase 3 (Distributed Services), the frontend application may face similar challenges:
* **Deployment Contention**: Multiple teams needing to deploy changes to the same monolithic UI
* **Technology Lock-in**: Difficulty updating parts of the UI to newer framework versions
* **Scale Complexity**: A single large bundle becomes hard to manage and optimize

## Decision

We will adopt a **Microfrontends (MFE)** strategy only as a **Phase 3+ extraction strategy**, not as an initial frontend baseline.

Evolith products MUST follow this progression:

| Phase | UI Delivery Model | Guide |
|---|---|---|
| Phase 1 | Modular monolithic web application | Use a single deployable React application with clear internal boundaries by feature, route, and bounded context. |
| Phase 2 | Modular UI with greater domain ownership | Maintain a single deployable UI while strengthening lazy loading per route, design system governance, API boundaries, and applied reference mapping. |
| Phase 3+ | Microfrontends by exception | Extract MFEs only when team scale, deployment contention, or independent lifecycles justify the additional complexity. |

Microfrontends MUST NOT be used as default initial architecture, a decision by fashion, or a substitute for good modular frontend design.

### Key Principles:

1. **Start Modular, Not Distributed**: Build a single modular React application first. Distribution is an extraction decision, not a default.
2. **Vertical Ownership**: Teams that own a backend domain service can own the corresponding UI fragment when Phase 3 extraction is justified.
3. **Run-Time Integration**: Use **Module Federation** (Vite or Webpack 5) as the main mechanism only after MFE extraction is approved.
4. **Shared Design System**: All MFEs MUST use the corporate design system (CSS Variables, Shared Components) to ensure visual consistency.
5. **BFF Alignment**: Each client-facing MFE must communicate through its specific BFF (Backend-for-Frontend) or a unified Gateway.

### Extraction Triggers (When to move to MFEs):

* Team size exceeds 15-20 frontend developers
* Deployment frequency of specific modules exceeds the main release cycle tolerance
* Requirement for independent technological lifecycles in isolated sections of the UI
* A bounded UI area has clear ownership, stable contracts, and measurable release independence needs

## Consequences

* **Positive**: Independent deployability, localized technology options, and greater team autonomy when the organization reaches Phase 3 scale.
* **Negative**: Higher infrastructure complexity (CI/CD pipelines per MFE), risk of visual inconsistency if design system is ignored, and initial overhead in orchestrator configuration.
* **Neutral**: Requires a central "Shell" or "Orchestrator" application to manage routing and shared state.
* **Governance**: Any product introducing MFEs before Phase 3 MUST document an explicit ADR deviation with business evidence, team scale, and deployment justification.