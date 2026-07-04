# Phase 00 — Intake & Architecture Planning Gate

> **Bilingual Navigation:** [Versión en Español](./00-architecture-planning-gate-intake.es.md)

**Phase:** 00 — Intake
**Subphase:** 00.0 — Architecture Planning Gate
**Gate Type:** Mandatory intake boundary
**Accountable Role:** Architecture Lead / Product Owner
**Waiver Authority:** Architecture Board

---

## Purpose

This playbook operationalises the Architecture Planning Gate (Gate 0). It acts as the intake boundary for all new requirements in Evolith. Before any formal SDLC process begins, a raw requirement must be evaluated to determine its architectural impact, risks, and the correct SDLC mode to apply (`full`, `tailored`, `minimal`, or `rejected`).

---

## When to Apply

| Scenario | Requirement |
|----------|-------------|
| Any new feature request | Mandatory |
| Major architectural refactor | Mandatory |
| Technical debt resolution | Mandatory |
| Minor documentation updates | Mandatory (but routes to `minimal` auto-approval) |
| Emergency hotfix | Mandatory (routes to `tailored` or bypasses with post-mortem) |

---

## Architecture Planning Agents

The intake process is assisted by the Agent Runtime (Hermes), which acts as the **Architecture Plan Interpreter**.

| Agent Capability | Artifact Produced | Execution Context |
|---|---|:---:|
| Architecture Plan Interpreter | Architecture Plan Draft (JSON/YAML) | Pre-Discovery |

*Note: Agents cannot approve plans. Governance evaluation is performed by OPA, and final approval requires human-in-the-loop for non-minimal modes.*

---

## Gate Procedure

### Step 1: Ingestion
A user or system submits a natural language requirement ("prompt") via the Smart CLI or Evolith Tracker.
`evolith plan create --from-prompt "..."`

### Step 2: Interpretation and Generation
Hermes reads the prompt, consults the knowledge base (ADRs, Blueprints, current topology), and generates an **Architecture Plan Draft** containing:
- Functional & technical scope
- Impacted components
- Security & architectural risks
- Required artifacts & gates

### Step 3: OPA Policy Evaluation
The Core API evaluates the drafted plan against active OPA policies to recommend the `sdlc_mode`:
- `full`: High criticality, security impact, or cross-tenant scope.
- `tailored`: Bounded product scope, medium risk.
- `minimal`: Low complexity, documentation, or minor UI tweaks.
- `rejected`: Policy violation or insufficient information.

### Step 4: Refinement and Review
The plan enters `under_review`.
The Architecture Lead reviews the plan. If necessary, they can add comments or request refinements, which Hermes will use to generate a new version of the plan (`v2`, `v3`).

### Step 5: Gate Decision

| Outcome | Action |
|---------|--------|
| **APPROVE** | Proceed to execution. Plan is locked. |
| **REJECT** | Plan is closed. Return to requester for reformulation. |

---

## Handoff

After a plan is **APPROVED** and **EXECUTED**, the system instantiates the SDLC:

```
Architecture Plan (Approved) ──→ Initiative Created 
                                     │
                                     ├──→ SDLC Phase 01.1 (Knowledge-First Discovery)
                                     │
                                     └──→ Mandatory ADRs / Artifacts linked
```

---

## Quality Checklist

- [ ] The plan accurately reflects the prompt intent.
- [ ] OPA evaluation was successful.
- [ ] `sdlc_mode` recommendation is justified.
- [ ] All high-risk flags have been reviewed by a human.
- [ ] Traceability IDs are generated upon execution.

---

## References
- [ADR-0103: Architecture Planning Gate as Pre-Discovery Intake](../../../architecture/adrs/core/0103-architecture-planning-gate-intake.md)
