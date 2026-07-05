# AI Knowledge Strategy

> Strategy for making Evolith architectural intelligence consumable by AI agents without losing governance, traceability, or architectural consistency.

## Purpose

This document defines how Architecture Intelligence can be prepared for AI-assisted engineering tools and private enterprise agents.

Target consumers include:

- Claude
- Codex
- GitHub Copilot
- Cursor
- Harness Agents
- Enterprise RAG systems

## Principles

- Evolith remains the source of architectural authority.
- AI agents consume knowledge; they do not define standards independently.
- Promoted decisions require ADRs, standards, blueprints, or canonical patterns.
- AI-generated outputs must be reviewable and traceable.
- Context must be scoped by role, domain, and repository intent.

## Knowledge Types

| Knowledge type | Purpose |
|---|---|
| ADRs | Decision authority and tradeoffs |
| Standards | Engineering and governance rules |
| Blueprints | Architecture baselines and topology |
| Canonical patterns | Reusable implementation guidance |
| Pattern cards | Curated external/internal architecture ideas |
| Radar entries | Adoption status and maturity classification |
| UMS evidence | Applied implementation reference |

## AI Consumption Requirements

Every AI-consumable document should include:

- clear title
- purpose
- scope
- decision or recommendation
- tradeoffs
- validation rules
- related ADRs
- related standards
- links to authoritative sources

## Agent Guardrails

AI agents must:

- respect repository taxonomy
- avoid inventing architecture rules
- cite or reference controlling documents
- detect product-specific vs universal decisions
- avoid direct promotion of external ideas into standards
- propose ADRs when a recommendation becomes reusable authority

## RAG Strategy

Recommended indexing groups:

1. Governance and taxonomy
2. Architecture blueprints
3. ADRs
4. Canonical patterns
5. Architecture Intelligence
6. UMS applied evidence

## Harness Agent Role

Harness Agents can be used as an enterprise architecture assistant that:

- answers architecture questions
- explains standards
- validates PR intent
- checks documentation consistency
- recommends related ADRs
- routes teams to the right artifact

## Validation

Before AI agents use this corpus:

- links must be valid
- bilingual navigation must be consistent
- ADR references must resolve
- diagrams must render
- taxonomy must be respected
- obsolete demo references must be removed

---

[Back to Architecture Intelligence](../README.md)
