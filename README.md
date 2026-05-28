# Evolith: Progressive Architecture Reference Base

[![Status](https://img.shields.io/badge/Status-Active-brightgreen?style=for-the-badge)]()
[![Method](https://img.shields.io/badge/Method-Spec--driven_AI--DD-blueviolet?style=for-the-badge)]()
[![License](https://img.shields.io/badge/License-MIT-informational?style=for-the-badge)]()

**Evolith is the corporate architecture upstream for product repositories.** It defines reusable architecture standards, governance rules, ADRs, patterns, and operating guidance that satellite products inherit and specialize.

Evolith solves a common enterprise problem: teams need one clear place to understand what is reusable policy, what is a product-specific implementation, and how decisions are promoted from real products back into the architecture reference.

> Separate conceptually before separating physically.

Language: [English](./README.md) | [Español](./README.es.md)

---

## Start Here

| Need | Go to |
|---|---|
| New to Evolith | [Getting Started by Role](./reference/getting-started/README.md) |
| Find React, Web, C# or .NET standards | [Quick Access by Stack](./reference/quick-access/README.md) |
| Understand the architecture model | [Architecture Hub](./reference/architecture/README.md) |
| Review decisions and trade-offs | [ADR Registry](./reference/architecture/adrs/README.md) |
| Apply governance rules | [Governance Standards](./reference/governance/standards/README.md) |
| See the executable product reference | [UMS Applied Reference](./reference/knowledge/demo/README.md) |
| Work with AI-assisted engineering | [AI-DD Adoption Reference](./reference/governance/standards/ai-augmented/frameworks/README.md) |
| Operate or observe the platform | [Operations & Observability](./reference/operations/README.md) |
| Run local infrastructure | [Infrastructure & Orchestration](./reference/infrastructure/README.md) |
| Browse everything | [Global Master Index](./MASTER_INDEX.md) |

---

## Quick Paths by Role

| Role | Start with | Then read |
|---|---|---|
| Architect | [Architecture Hub](./reference/architecture/README.md) | [ADR Registry](./reference/architecture/adrs/README.md) |
| Backend engineer | [.NET API Standard](./reference/governance/standards/engineering/api-dotnet/api-dotnet-standard.md) | [.NET & C# Tech Stack Profile](./reference/architecture/blueprints/authoritative-tech-stack-dotnet.md) |
| Frontend engineer | [React Web Frontend Standard](./reference/governance/standards/engineering/web-frontend/react/react-web-frontend-standard.md) | [Quick Access by Stack](./reference/quick-access/README.md) |
| Product or delivery lead | [UMS Applied Reference](./reference/knowledge/demo/README.md) | [Child Repository Inheritance Guide](./reference/governance/standards/onboarding/child-repository-inheritance-guide.md) |
| DevOps or platform engineer | [Operations & Observability](./reference/operations/README.md) | [Infrastructure & Orchestration](./reference/infrastructure/README.md) |
| AI-assisted engineering user | [AI-DD Adoption Reference](./reference/governance/standards/ai-augmented/frameworks/README.md) | [AGENTS.md](./AGENTS.md) |
| Governance reviewer | [Governance Standards](./reference/governance/standards/README.md) | [Repository Taxonomy](./reference/governance/standards/repository-taxonomy.md) |

---

## Standards Shortcuts

| Standard or profile | Direct link | Use for |
|---|---|---|
| React Web Frontend Standard | [Open](./reference/governance/standards/engineering/web-frontend/react/react-web-frontend-standard.md) | React architecture, boilerplate, UI tokens, data access, testing, accessibility |
| .NET API Standard | [Open](./reference/governance/standards/engineering/api-dotnet/api-dotnet-standard.md) | ASP.NET Core APIs, host bootstrap, REST/GraphQL surface, persistence, quality gates |
| .NET & C# Tech Stack Profile | [Open](./reference/architecture/blueprints/authoritative-tech-stack-dotnet.md) | Runtime choices, libraries, platform profile |
| Runtime-Agnostic Baseline | [Open](./reference/architecture/blueprints/authoritative-tech-stack-agnostic.md) | Universal architecture constraints before stack-specific decisions |
| All stack paths | [Open](./reference/quick-access/README.md) | One-page routing for Web, React, C#/.NET, Node.js, and runtime profiles |

---

## Evolith vs UMS

| Question | Evolith | UMS |
|---|---|---|
| What belongs here? | Reusable standards, principles, ADRs, governance, canonical patterns, quality gates | Product-specific implementation evidence and applied examples |
| What should not be copied here directly? | Local product routes, headers, schemas, seeds, runtime values, branding | Enterprise-wide policy unless promoted through Evolith governance |
| How does a UMS practice become a standard? | Through ADR, governance standard, or canonical pattern promotion | By providing evidence, not authority |

UMS is the official executable reference model. Use it to see Evolith ideas applied in a real product, but keep product-specific details in UMS unless they are formally promoted.

---

## Repository Map

| Area | Entry point | Purpose |
|---|---|---|
| Architecture | [reference/architecture](./reference/architecture/README.md) | Blueprints, ADRs, runtime profiles, canonical patterns |
| Governance | [reference/governance/standards](./reference/governance/standards/README.md) | Enterprise standards, SDLC, onboarding, taxonomy, quality rules |
| Architecture Intelligence | [reference/knowledge/architecture-intelligence](./reference/knowledge/architecture-intelligence/README.md) | AI-consumable architecture knowledge and pattern catalog governance |
| AI-Augmented Engineering | [AI-DD Frameworks](./reference/governance/standards/ai-augmented/frameworks/README.md) | Local adoption rules for AI-assisted development frameworks |
| Operations | [reference/operations](./reference/operations/README.md) | Observability, runtime support, operational guidance |
| Infrastructure | [reference/infrastructure](./reference/infrastructure/README.md) | Local platform, gateway, containers, orchestration assets |
| Knowledge | [reference/knowledge](./reference/knowledge/demo/README.md) | UMS applied reference, migration records, architecture intelligence assets |
| Product reference | [UMS repository](https://github.com/beyondnetcode/ums) | Official executable satellite product |

---

## Recommended First Reads

1. [Getting Started by Role](./reference/getting-started/README.md)
2. [Quick Access by Stack](./reference/quick-access/README.md)
3. [Architecture Hub](./reference/architecture/README.md)
4. [ADR Registry](./reference/architecture/adrs/README.md)
5. [Governance Standards](./reference/governance/standards/README.md)
6. [UMS Applied Reference](./reference/knowledge/demo/README.md)

---

## Contribution

Contributing to Evolith means strengthening the enterprise standard. Add reusable guidance here. Keep product-specific implementation evidence in satellite repositories such as UMS unless the practice has been promoted through the governance path.

Before contributing, read:

- [AGENTS.md](./AGENTS.md)
- [Repository Taxonomy](./reference/governance/standards/repository-taxonomy.md)
- [Child Repository Inheritance Guide](./reference/governance/standards/onboarding/child-repository-inheritance-guide.md)
- [Gitflow ADR](./reference/architecture/adrs/core/0050-gitflow-branching-strategy.md)

---

## License

This project is published under the [MIT License](./LICENSE).

---

<div align="center">
 <sub>Evolith - Enterprise Architecture Platform | Progressive Reference Corpus | Spec-driven AI-DD</sub>
</div>
