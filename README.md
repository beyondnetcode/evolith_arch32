# Evolith: Progressive Architecture Reference Base

[![Status](https://img.shields.io/badge/Status-Active-brightgreen?style=for-the-badge)]()
[![Method](https://img.shields.io/badge/Method-Spec--driven_AI--DD-blueviolet?style=for-the-badge)]()
[![License](https://img.shields.io/badge/License-MIT-informational?style=for-the-badge)]()

**Evolith is the corporate architecture upstream for product repositories.** It defines reusable architecture standards, governance rules, ADRs, patterns, and operating guidance that satellite products inherit and specialize.

Evolith solves a common enterprise problem: teams need one clear place to understand what is reusable policy, what is a product-specific implementation, and how decisions are promoted from real products back into the architecture reference.

> Separate conceptually before separating physically.

Language: [English](./README.md) | [Español](./README.es.md)

---

## Start Here — Choose Your Path

### Path 1 — I want a 5-minute overview

Read [Executive One-Pager Visual](./reference/governance/standards/communication/visuals/v01-executive-one-pager.md) (or [Spanish](./reference/governance/standards/communication/visuals/v01-executive-one-pager.es.md)). It answers: What is Evolith? Why do we need it? What is UMS?

### Path 2 — I have a specific role

| Role | Start here | Then read |
|---|---|---|
| Architect | [Architecture Hub](./reference/architecture/README.md) | [ADR Matrix](./reference/architecture/adrs/adr-matrix.md) |
| Developer | [Engineering Manifesto](./reference/governance/standards/engineering/engineering-manifesto.md) | [UMS Reference Model](./reference/knowledge/demo/README.md) |
| DevOps / SRE | [Operations Hub](./reference/operations/README.md) | [Infrastructure Hub](./reference/infrastructure/README.md) |
| Product / PM | [UMS Reference Model](./reference/knowledge/demo/ums-reference-model.md) | [Adoption Cases](./reference/knowledge/adoption-cases.md) |
| AI Contributor | [AI-Augmented Standards](./reference/governance/standards/ai-augmented/README.md) | [AGENTS.md](./AGENTS.md) |

### Path 3 — I need to make an architectural decision

1. Check the [ADR Registry](./reference/architecture/adrs/README.md) to see if a decision already exists
2. If not, use the [ADR Template](./reference/governance/sdlc/04-artifact-templates/adr-template.md) to propose one
3. Submit to the [Architecture Board](./reference/governance/standards/communication/architecture-communication-strategy.md) for review

---

## Evolith vs UMS — What Goes Where

| Question | Evolith | UMS |
|---|---|---|
| What belongs here? | Reusable standards, principles, ADRs, governance, canonical patterns, quality gates | Product-specific implementation evidence |
| How does a product contribute? | Propose an ADR backed by real evidence | Provide executable proof of concept |
| What stays local? | Product routes, schemas, seeds, branding | Enterprise policy must go through Evolith governance |

UMS is the official executable reference. See [Adoption Cases](./reference/knowledge/adoption-cases.md) for real examples of product lessons promoted into standards.

---

## Contribution

Before contributing, read:

- [AGENTS.md](./AGENTS.md) — Agent rules and conventions
- [Repository Taxonomy](./reference/governance/standards/repository-taxonomy.es.md) — What goes where
- [Child Repository Inheritance Guide](./reference/governance/standards/onboarding/child-repository-inheritance-guide.md) — How products inherit from Evolith

Full navigation: [MASTER_INDEX.md](./MASTER_INDEX.md)

---

## License

Published under the [MIT License](./LICENSE).

---

<div align="center">
  <sub>Evolith - Enterprise Architecture Platform | Progressive Reference Corpus | Spec-driven AI-DD</sub>
</div>