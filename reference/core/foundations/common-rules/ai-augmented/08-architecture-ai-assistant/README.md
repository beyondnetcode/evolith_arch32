# 08 — Evolith AI Architecture Assistant

> **Bilingual navigation:** [Español](./README.es.md)  
> **Owner:** Evolith Architecture Board  
> **Status:** Strategic Proposal — Approved for Incremental Adoption  
> **Parent:** [AI-Augmented Engineering](../README.md)

---

## What Is This?

This module defines the strategy to transform the **Evolith knowledge base** — ADRs, blueprints, standards, DDD models, canonical patterns, and governance rules — into a **governed, versioned, and reusable knowledge corpus** consumable by enterprise AI agents.

The result is the **Evolith AI Architecture Assistant**: a Principal Architect persona embedded in AI coding tools, guiding teams, providers, and autonomous agents to always build in alignment with corporate standards.

---

## The Problem This Solves

```
Without this:                         With this:
─────────────────────────────         ────────────────────────────────
AI agents write code that             AI agents write code that IS
violates Hexagonal Architecture  →    validated against ADR-0002

Copilot suggests raw SQL inside  →    Every suggestion respects the
domain classes                        Hexagonal boundary rule

Vendors integrate without            Vendors receive architecture
respecting contract standards   →    guardrails embedded in their
                                      AI tools from day 1

133 ADRs exist but no AI agent   →    Every AI agent can query and
knows about them                      reason about any ADR in context
```

---

## Navigation

| Document | Purpose |
|---|---|
| [AI Architecture Assistant Strategy](./ai-architecture-assistant-strategy.md) | Full vision, ingestion strategy, agent ecosystem, governance, roadmap |
| [Knowledge Taxonomy for AI](./knowledge-taxonomy.md) | How each artifact type (ADR, pattern, standard) is structured for AI consumption |
| [External Knowledge Intake Governance](./visuals/v12-external-knowledge-intake.md) | Proposed provenance, licensing, and promotion controls for external architectural sources |
| [Harness Platform Evaluation](./harness-platform-evaluation.md) | Harness AI Agent evaluation as primary orchestration platform |
| [Visuals](./visuals/README.md) | Architecture diagrams: AI ecosystem, RAG flow, agent collaboration |

---

## Relationship to Existing AI Standards

This module **extends** the existing AI-Augmented Engineering section — it does not replace it:

| Existing module | This module adds |
|---|---|
| Harness Engineering (AGENTS.md) | Knowledge layer powering the harness system prompt |
| MCP Integration | MCP server exposing Evolith ADRs as structured tools |
| Agentic Patterns | Architecture-specific agent roles (Architect Agent, Review Agent) |
| Model Selection | Which models handle architectural reasoning vs. code generation |
| AI ADRs | New ADRs for knowledge governance and RAG strategy |

---

<div align="center">
  <sub>Evolith — Enterprise Architecture Platform | AI Architecture Assistant</sub>
</div>
