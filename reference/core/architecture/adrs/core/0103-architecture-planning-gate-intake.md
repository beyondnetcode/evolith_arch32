> **Bilingual Navigation:** [Ver versión en Español](./0103-architecture-planning-gate-intake.es.md)

# ADR-0103: Architecture Planning Gate as Pre-Discovery Intake

> **Agent Signature:** Architect Agent (Winston)

## Status
Accepted (2026-07-02 — Architecture Board)

## Date
2026-07-02

## Context and Problem

Evolith currently governs and executes SDLCs through OPA rulesets and the `.harness` directory. However, there is a gap between a raw business requirement (a "prompt" or unstructured request) and the formal assignment of an SDLC mode (e.g., standard, governed, light). The current Discovery Gate (Phase 1.1) focuses on Knowledge-First Discovery and assumes the initiative is already in the pipeline with an assigned adoption level. 

The problem: How do we introduce a preliminary evaluation phase that translates a natural language prompt into a structured, governed, and trackable **Architecture Plan**? This plan must dictate the SDLC mode (`full`, `tailored`, `minimal`, or `rejected`) *before* any formal discovery or execution effort is invested, keeping the Human-in-the-loop for approval while leveraging AI capabilities for generation.

## Objective and Scope

Define and incorporate the **Architecture Planning Gate** (also known as the Evolith Architecture Plan) into the core ecosystem. 
In scope: 
- Establishing Gate 0 (Pre-Discovery) as the formal intake point.
- The separation of responsibilities: Hermes (generation), Core API & OPA (evaluation/governance), Smart CLI & Tracker (Human-in-the-loop interaction).
- The state machine for the Architecture Plan (`draft` -> `under_review` -> `approved` -> `executed`).

Out of scope: 
- The detailed implementation of the Tracker UI elements.
- Execution logic for downstream SDLC instantiation (delegated to existing engines).

## Options Considered

### Option A: Embed planning logic into existing Discovery (Phase 1.1)
Extend the existing Knowledge-First Discovery Gate to handle raw prompts.
*Rejected:* This conflates the "Should we do this and how rigorously?" decision with the "Do we have enough knowledge to build this?" phase. It bypasses the need for an early abort (`rejected`) before discovery effort is spent.

### Option B: Use external ticketing systems (Jira/ServiceNow) for intake
Rely on external tools to perform the intake and pass a webhook to Evolith.
*Rejected:* Loses architectural traceability and OPA-driven governance at the very inception of an idea. Evolith Tracker would lose visibility into rejected or tailored plans.

### Option C: Standalone Architecture Planning Gate (Gate 0) (Chosen)
Introduce a new transverse capability where a raw requirement generates an Architecture Plan via Hermes. The Core API evaluates it against OPA to determine the `sdlc_mode`, and humans refine/approve it via CLI/Tracker before it becomes a formal Initiative.

## Decision and Rationale

### 1. Gate 0 as the Intake Mechanism
The Architecture Planning Gate will reside *before* the Knowledge-First Discovery phase. It acts as the intake boundary. No initiative or discovery effort starts without an approved plan.

### 2. Decoupled Evaluation Strategy
- **Generation:** Agent Runtime (Hermes) interprets the prompt and generates the draft plan (identifying components, risks, and interfaces).
- **Governance:** Core API invokes OPA policies against the generated JSON plan to enforce the required `sdlc_mode`.
- **Approval:** A Human-in-the-loop (Architecture Lead / Security Officer) must approve the plan via Smart CLI or Evolith Tracker. Agents cannot execute approval on governed plans without explicit clearance.

### 3. Traceability and Versioning
Plans are immutable once approved. Iterations during `under_review` create new versions (`v1`, `v2`). The final execution trace links the `Architecture Plan ID` to the resulting `Initiative ID` and required `ADRs`.

## Evidence and Evaluation Criteria

- A new entity schema (`Architecture Plan`) is established within the Core API.
- OPA policies can successfully read an Architecture Plan JSON and return an `sdlc_mode` recommendation.
- The CLI provides `plan create`, `review`, `refine`, and `approve` commands.

## Consequences, Risks, and Trade-offs

- **Positive:** Massive reduction in misaligned SDLC assignments. High-risk changes are caught at the prompt level. Traceability from idea to execution is complete.
- **Negative/Trade-offs:** Adds an extra step before a developer can start working. 
- **Mitigation:** OPA rules must be tuned to automatically assign `sdlc_mode: minimal` and allow auto-approval for low-complexity, non-critical changes to avoid cognitive friction.

## References
- [00-architecture-planning-gate-intake.md](../../../sdlc/01-playbooks/00-architecture-planning-gate-intake.md)
