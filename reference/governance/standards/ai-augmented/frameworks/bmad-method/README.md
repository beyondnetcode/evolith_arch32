# BMAD-METHOD — Adoption Reference

> **This document describes how this repository adopted and configured BMAD-METHOD.**
> It is not a substitute for the official framework documentation.
>
> **Official BMAD-METHOD source:** [github.com/bmad-code-org/BMAD-METHOD](https://github.com/bmad-code-org/BMAD-METHOD)
>
> **Bilingual Navigation:** [Version en Espanol](./README.es.md)

---

## Quick Reference

| I need to... | Go to |
| :--- | :--- |
| Understand what BMAD-METHOD is | [Official repository](https://github.com/bmad-code-org/BMAD-METHOD) |
| See how this repo adopted it | [Section 1 — Adoption Context](#1-adoption-context) |
| See the local agent configuration | [Agents Catalog](./agents-catalog.md) |
| See the local harness rules | [Rules Reference](./rules-reference.md) |
| Replicate this adoption in another repo | [Portable Setup Guide](./portable-setup.md) |

---

## 1. Adoption Context

BMAD-METHOD is a spec-driven AI-DD (AI-Driven Development) framework created by the `bmad-code-org` community. It structures AI assistance as a team of specialized agent personas, each with a defined role, responsibility boundary, and handoff protocol — enabling more predictable and auditable outputs than a single general-purpose AI conversation.

This repository adopted BMAD-METHOD as the AI-DD method for its spec-driven development workflow and document governance. The adoption involved three decisions:

**1. Which BMAD agents to use and how to scope them.**
The six BMAD team agents (analyst, pm, architect, sm, dev, qa) were adopted and scoped to the progressive monolith context: hexagonal architecture constraints, multi-tenancy requirements, the specific Node.js/.NET/Android runtime profiles, and the ADR-driven decision process defined in this repository.

**2. What local harness rules to add on top.**
BMAD-METHOD does not prescribe documentation quality rules. This repository defined 18 harness rules (R-01 through R-18) as a local governance layer on top of BMAD — covering bilingual sync, UTF-8 enforcement, diagram labeling, multi-tenancy isolation standards, modular extraction readiness, and API governance. These rules are local to this repository and are not part of the BMAD-METHOD framework.

**3. What lightweight governance agents to add.**
Four harness governance agents (@po, @architect, @analyst, @devops) were defined locally for on-demand document review and architectural auditing. These complement the sequential BMAD team workflow but are not part of the upstream BMAD framework.

---

## 2. What Comes From BMAD-METHOD

The following elements in this repository originate directly from BMAD-METHOD:

| Element | Location | Notes |
| :--- | :--- | :--- |
| Six agent personas | `.bmad-core/agents/` | Scoped to this repo's stack and architecture context |
| Sequential delivery workflow | `.bmad-core/workflows/development.yaml` | Adapted deliverable paths for this repo's directory structure |
| Spec-driven approach | Throughout | The principle of analyst → PRD → TAD → backlog → code → QA |

---

## 3. What Was Added Locally

The following elements are **not part of BMAD-METHOD** — they were built by this repository on top of the framework:

| Element | Location | Purpose |
| :--- | :--- | :--- |
| 18 harness rules (R-01–R-18) | `.harness/rules/global-rules.md` | Document quality, diagram standards, architecture governance |
| 4 harness governance agents | `.harness/agents/agent-specs.md` | On-demand review: @po, @architect, @analyst, @devops |
| 4 governance playbooks | `.harness/playbooks/` | Recurring operational checklists |
| `validate-docs.mjs` script | `.harness/scripts/` | Automated UTF-8, link, anchor, bilingual, and Mermaid validation |
| Architecture-specific constraints | Agent personas | Hexagonal boundaries, RLS, modular extraction, ADR traceability |

---

## 4. What Was Left Out

Not all BMAD-METHOD capabilities were adopted. The following were intentionally excluded:

| Capability | Reason |
| :--- | :--- |
| Frontend-specific agent directives (React, Tailwind) | This repo is architecture-agnostic at the reference level; frontend stack is demo-specific |
| Backlog tooling integrations | Kept as flat files to remain tool-agnostic |
| Any BMAD community templates not aligned with ADR taxonomy | This repo uses its own ADR and story formats, defined in `.harness/templates/` |

---

## 5. Documents in This Section

| Document | Purpose |
| :--- | :--- |
| [Agents Catalog](./agents-catalog.md) | How each agent is configured in this repo — scope, constraints, handoff protocol |
| [Rules Reference](./rules-reference.md) | The 18 local harness rules: what they are, why they were added, how to adapt them |
| [Portable Setup Guide](./portable-setup.md) | How another team can replicate this adoption in their own repository |

---

[Back to Frameworks Index](../README.md)
