# Progressive Monolith Architecture Reference

[![Status](https://img.shields.io/badge/Status-Active-brightgreen?style=for-the-badge)]()

[![Method](https://img.shields.io/badge/Method-Spec--driven_AI--DD-blueviolet?style=for-the-badge)]()
[![License](https://img.shields.io/badge/License-MIT-informational?style=for-the-badge)]()

This repository is the **corporate architectural upstream** — the authoritative source of decisions, standards, and patterns for all product repositories in the organization. It is not a framework to install. It is a living contract that product teams inherit, extend, and contribute back to over time.

**arc32** identifies the supporting toolset and repository implementation. It is not the product vision itself. The vision is the progressive architecture reference documented here.

> Separate conceptually before separating physically.

[English](./README.md) | [Español](./README.es.md)

---

## What Is This Repository For?

This repository serves three distinct purposes depending on who is reading it.

**You are evaluating the architecture model.**
Read the [Reference Blueprint](./reference/architecture/blueprints/reference-blueprint.md) and the [ADR Registry](./reference/architecture/adrs/README.md). Everything is documented with its rationale and trade-offs.

**You are starting a new product repository.**
This base is your starting point. You inherit its full decision corpus, structure your repository using its taxonomy, and document every point where your product context diverges. The mechanics of this process are defined in the **[Child Repository Inheritance Guide](./reference/governance/standards/onboarding/child-repository-inheritance-guide.md)** — read it before writing a single line of code.

**You are contributing a new architectural decision.**
If the decision is universal, it belongs here. If it is product-specific, it belongs in the child repository. The [Promotion Path](./reference/governance/standards/onboarding/child-repository-inheritance-guide.md#7-promotion-path) defines how decisions move from product repositories back into this base.

**You are setting up AI-assisted development (AI-DD).**
This repository uses BMAD-METHOD as its AI-DD framework. The local agent configuration, harness rules, and replication guide are documented in the [AI-DD Frameworks Adoption Reference](./reference/governance/standards/ai-augmented/frameworks/README.md).

---

## Contents

- [What Is This Repository For?](#what-is-this-repository-for)
- [Start Here](#start-here)
- [Prerequisites](#prerequisites)
- [The Architecture Journey](#the-architecture-journey)
- [Repository Map](#repository-map)
- [Recommended First Reads](#recommended-first-reads)
- [Quick Start: Demo Sandbox](#quick-start-demo-sandbox)
- [Contribution](#contribution)
- [License](#license)

---

## Start Here

| If you want to... | Go to |
|---|---|
| Understand the whole repository | [Global Master Index](./MASTER_INDEX.md) |
| **Start a new product from this base** | **[Child Repository Inheritance Guide](./reference/governance/standards/onboarding/child-repository-inheritance-guide.md)** |
| Learn the architecture model | [Reference Blueprint](./reference/architecture/blueprints/reference-blueprint.md) |
| Review the universal rules | [Agnostic Architecture Baseline](./reference/architecture/blueprints/authoritative-tech-stack-agnostic.md) |
| Explore decisions and trade-offs | [ADR Registry](./reference/architecture/adrs/README.md) |
| Inspect the executable example | [Demo Sandbox](./reference/knowledge/demo/README.md) |
| Understand how AI agents must operate here | [AGENTS.md](./AGENTS.md) |

---

## Prerequisites

| Requirement | Minimum Version |
|---|---|
| Node.js | 20+ |
| npm | 10+ |
| Docker + Docker Compose | Latest stable |

---

## The Architecture Journey

The architecture reference is intentionally progressive. It does not treat microservices as the default starting point.

```text
Simple Monolith
  -> Modular Monolith
    -> Distributed Modules
      -> Microservices
```

The repository helps teams decide **when to stay simple**, **when to modularize**, and **when distribution is worth the operational cost**.

---

## Repository Map

| Area | What you will find |
|---|---|
| [reference/architecture/](./reference/architecture/blueprints/README.md) | Blueprints, topology, stack profiles, and architectural decisions |
| [reference/governance/](./reference/governance/standards/README.md) | Engineering standards, SDLC, onboarding, and architecture rules |
| [reference/operations/](./reference/operations/README.md) | Observability, runtime support, and operational documentation |
| [reference/infrastructure/](./reference/infrastructure/README.md) | Local platform, gateway, containers, and infrastructure assets |
| [reference/knowledge/](./reference/knowledge/demo/README.md) | Demo documentation, research, examples, and learning material |
| [src/](./src/apps/todo-web/README.md) | Reference implementation and executable sandbox |

For role-based navigation, use the [Global Master Index](./MASTER_INDEX.md).

---

## Recommended First Reads

1. [Architectural Directives](./reference/governance/standards/vision/architectural-directives.md)
2. [Reference Blueprint](./reference/architecture/blueprints/reference-blueprint.md)
3. [Agnostic Architecture Baseline](./reference/architecture/blueprints/authoritative-tech-stack-agnostic.md)
4. [ADR Registry](./reference/architecture/adrs/README.md)
5. [Demo Sandbox](./reference/knowledge/demo/README.md)

---

## Quick Start: Demo Sandbox

```bash
git clone https://github.com/beyondnetcode/arc32_nodejs_progresive_monolith.git
cd arc32_nodejs_progresive_monolith/src
npm install

docker-compose -f ../reference/infrastructure/docker-compose.yml up -d
npm run dev
```

The demo exists to show architecture patterns in code. General rules and policies remain in `reference/architecture/` and `reference/governance/`.

---

## Contribution

Contributions are welcome through issues, documentation improvements, ADR reviews, examples, tests, and refinements to the demo.

Before contributing, read:

- [AGENTS.md](./AGENTS.md)
- [Repository Taxonomy](./reference/governance/standards/repository-taxonomy.md)
- [Engineering Manifesto](./reference/governance/standards/engineering/engineering-manifesto.md)
- [Gitflow ADR](./reference/architecture/adrs/core/0050-gitflow-branching-strategy.md)

---

## License

This project is published under the [MIT License](./LICENSE). You are free to use, copy, modify, merge, publish, and distribute it. Attribution is appreciated but not required.

---

<div align="center">
 <sub>2026 Progressive Architecture Reference | arc32 toolset | Spec-driven AI-DD</sub>
</div>
