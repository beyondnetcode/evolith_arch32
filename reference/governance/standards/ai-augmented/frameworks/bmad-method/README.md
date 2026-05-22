# BMAD-METHOD Framework Reference

> **Status:** Active | **Version:** 1.0.0 (as configured in this repository)
> **Bilingual Navigation:** Versión en Español — pendiente

---

## Quick Reference

| I need to... | Go to |
| :--- | :--- |
| Understand what BMAD is and its two layers | [Section 1 — What Is BMAD-METHOD](#1-what-is-bmad-method) |
| See every agent and what it does | [Agents Catalog](./agents-catalog.md) |
| See every rule with rationale and examples | [Rules Reference](./rules-reference.md) |
| Copy this setup into my own repository | [Portable Setup Guide](./portable-setup.md) |

---

## 1. What Is BMAD-METHOD

BMAD-METHOD (Breakthrough Method for Agile AI-Driven Development) is a spec-driven development framework that structures AI assistance as a team of specialized agents, each with a defined role, responsibility boundary, and handoff protocol — rather than a single general-purpose AI conversation.

The core insight is that different phases of software delivery require different reasoning modes: requirements analysis demands functional precision and business narrative; architecture demands structural rigor and trade-off documentation; implementation demands code discipline and security compliance. Assigning these to distinct agent personas prevents context bleed and produces more predictable, auditable outputs.

In this repository, BMAD-METHOD operates in two complementary layers.

---

## 2. The Two Layers

### Layer 1 — BMAD Team Agents (`.bmad-core/`)

A full project delivery team simulated as AI agent personas. Used when building or specifying a new feature end-to-end.

```
Analyst → PM → Architect → Scrum Master → Developer → QA
```

Each agent receives defined inputs from the previous agent and produces a defined deliverable. The workflow is sequential and explicit — no agent skips its predecessor's output.

| Agent | Persona | Primary Deliverable |
| :--- | :--- | :--- |
| **Analyst** | Requirements & Specification Specialist | Product Brief / Functional Specification |
| **PM** | Product & Strategy Lead | Product Requirements Document (PRD) |
| **Architect** | Systems & Security Architect | Technical Architecture Design (TAD) |
| **Scrum Master** | Project Coordinator & Agile Master | Sprint Backlog / Task List |
| **Developer** | High-Performance Software Engineer | Executable code + self-review report |
| **QA** | Quality Assurance & Security Tester | QA Report + Test Logs |

### Layer 2 — Harness Governance Agents (`.harness/`)

A lighter set of agents focused on document governance, architectural review, and continuous quality enforcement. Used on-demand during any phase of development — not sequentially.

| Agent | Scope | Trigger |
| :--- | :--- | :--- |
| **@po** | Business logic, functional stories, OKRs, readability | When reviewing functional stories or product documentation |
| **@architect** | Tech stack, system design, diagrams, ADRs | When reviewing architectural decisions or diagrams |
| **@analyst** | Bilingual sync, backlog hygiene, cross-references | When auditing documentation or translating content |
| **@devops** | Docker, CI/CD, security scanning, harness governance | When reviewing infrastructure or operational configuration |

---

## 3. The Harness Rules Layer

Orthogonal to both agent layers, the harness defines 18 binding rules (R-01 through R-18) that apply regardless of which agent is active. Rules govern documentation quality, diagram labeling, tech stack validation, multi-tenancy standards, and API governance.

Rules are enforced by:
- The `validate-docs.mjs` script (automated, runs in CI)
- Agent self-check behavior (agents are instructed to apply rules before producing output)
- Human review during PR process

See the full [Rules Reference](./rules-reference.md) for rationale, trigger conditions, and adaptation guidance for each rule.

---

## 4. The Workflow

The greenfield development workflow defines the canonical sequence for building a new feature spec-to-code:

```
analysis → product-definition → architectural-design → task-breakdown → implementation → verification
```

Each step maps to a BMAD Team Agent, has a defined deliverable file path, and declares its dependency on the previous step. No step executes without its declared dependency being complete.

The workflow is intentionally sequential. Parallel agent execution is only permitted for independent sub-tasks within a step (e.g., multiple endpoints designed simultaneously within architectural-design), never for cross-step dependencies.

---

## 5. What This Framework Is Not

| Misconception | Reality |
| :--- | :--- |
| "BMAD replaces human judgment" | Agents produce structured drafts. All architectural decisions, ADRs, and merges require human review. |
| "You must use all six BMAD agents" | The workflow is modular. A team may adopt only the @architect harness agent for ADR review without using the full BMAD team. |
| "Rules are suggestions" | Rules R-01 through R-18 are binding directives. R-03 and link validation are enforced automatically in CI. |
| "This only works with Claude" | The agent personas are model-agnostic markdown specifications. They work with any LLM that supports system prompts or custom instructions. |

---

## 6. Relationship to This Repository's Architecture

BMAD-METHOD is classified as an **optional extension** of the corporate architecture standard. It does not modify or replace any base ADR, blueprint, or governance rule. A product team operates entirely within corporate standards whether or not they adopt this framework.

When a team adopts it, BMAD-METHOD accelerates the production of ADRs, functional stories, and technical architecture documents — but the standards those documents must meet remain unchanged.

---

## Documents in This Section

| Document | Purpose |
| :--- | :--- |
| [Agents Catalog](./agents-catalog.md) | Full reference for all 10 agents (6 BMAD team + 4 harness), with invocation instructions and copy-ready persona files |
| [Rules Reference](./rules-reference.md) | All 18 harness rules with intent, trigger condition, compliance example, and adaptation notes |
| [Portable Setup Guide](./portable-setup.md) | Everything needed to adopt this framework in any repository — files, configuration, and CI integration |

---

[Back to Frameworks Index](../README.md)
