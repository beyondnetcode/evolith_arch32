# Corporate SDLC Governance Center

> **Bilingual Navigation:** [Versión en Español](./README.es.md)

This center is the authoritative governance hub for the Software Development Lifecycle within Evolith. It defines the procedural requirements, phase exit gates, artifact formats, and compliance mapping that govern every product built from this reference platform.

```mermaid
flowchart LR
    classDef phase fill:#1e3a5f,stroke:#3b82f6,color:#fff,font-weight:bold
    classDef gate fill:#4a3800,stroke:#f59e0b,color:#fff,font-size:12px

    P1["Phase 1\nConception"]:::phase
    P2["Phase 2\nDesign"]:::phase
    P3["Phase 3\nConstruction"]:::phase
    P4["Phase 4\nValidation"]:::phase
    P5["Phase 5\nDelivery"]:::phase
    G1(["Business\nSign-Off"]):::gate
    G2(["Design\nBaseline"]):::gate
    G3(["Successful\nBuild"]):::gate
    G4(["RC\nStamped"]):::gate
    G5(["Production\nLive"]):::gate

    P1 --> G1 --> P2 --> G2 --> P3 --> G3 --> P4 --> G4 --> P5 --> G5
```

---

## SDLC Phase Map

### Phase 01: Conception and Discovery
Scope definition, persona profiling, OKR mapping, and architectural constraint alignment.

| Resource | Description |
|---|---|
| [PRD Template](./04-artifact-templates/prd-template.md) | Format template with UMS worked example |
| [SDLC–Evolith Artifact Mapping — Phase 1](./sdlc-evolith-artifact-mapping.md#2-phase-1--conception-and-discovery) | Required and optional Evolith artifacts for this phase |

### Phase 02: Design and Architecture
Pattern selection, ADR production, bounded context definition, API contracts, and functional story writing.

| Resource | Description |
|---|---|
| [Construction-Focused SDLC Framework](./02-engineering/construction-focused-sdlc-framework.md) | Phase definitions, quality thresholds, and DoD |
| [ADR Template](./04-artifact-templates/adr-template.md) | Format template with worked example (ADR-0010) |
| [Functional Story Template](./04-artifact-templates/functional-story-template.md) | Format template with UMS FS-01 worked example |
| [Functional Story Writing Standard](./03-documentation/functional-story-writing-standard.md) | Normative rules for functional story structure |
| [SDLC–Evolith Artifact Mapping — Phase 2](./sdlc-evolith-artifact-mapping.md#3-phase-2--design-and-architecture) | Required and optional Evolith artifacts for this phase |

### Phase 03: Construction
Source code composition, automated testing, CI/CD enforcement, and Definition of Done.

| Resource | Description |
|---|---|
| [Construction-Focused SDLC Framework — §3 Inner Loop and §4 DoD](./02-engineering/construction-focused-sdlc-framework.md) | Construction sub-phases and quality gate metrics |
| [Technical Story Template](./04-artifact-templates/technical-story-template.md) | Format template with UMS TS-003 worked example |
| [SDLC Documentation Best Practices](./03-documentation/sdlc-documentation-best-practices.md) | Documentation-as-code rules mandatory in this phase |
| [SDLC–Evolith Artifact Mapping — Phase 3](./sdlc-evolith-artifact-mapping.md#4-phase-3--construction) | Required and optional Evolith artifacts for this phase |

### Phase 04: Validation and QA
Regression verification, security scanning, UAT, and Release Candidate stamping.

| Resource | Description |
|---|---|
| [Test Summary Report Template](./04-artifact-templates/test-summary-report-template.md) | Format template with UMS MVP RC-1 worked example |
| [SDLC–Evolith Artifact Mapping — Phase 4](./sdlc-evolith-artifact-mapping.md#5-phase-4--validation-and-qa) | Required and optional Evolith artifacts for this phase |

### Phase 05: Delivery and Operations
Production deployment, observability validation, and monitoring nominality.

| Resource | Description |
|---|---|
| [Release Notes Template](./04-artifact-templates/release-notes-template.md) | Format template with UMS v0.1.0 worked example |
| *Coming Soon: Zero-Downtime Release Playbook* | |
| [SDLC–Evolith Artifact Mapping — Phase 5](./sdlc-evolith-artifact-mapping.md#6-phase-5--delivery-and-operations) | Required and optional Evolith artifacts for this phase |

---

## Cross-Phase References

| Resource | Description |
|---|---|
| **[SDLC–Evolith Artifact Mapping](./sdlc-evolith-artifact-mapping.md)** | Which Evolith artifacts are Required or Optional at each of the five phases, with a 40+ artifact compliance matrix |
| **[Artifact Templates Hub](./04-artifact-templates/README.md)** | All six format templates with worked examples, organized by phase |

---

[Back to Upper Level](../../README.md)
