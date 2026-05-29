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
| **Phase 1 — Conception** | |
| New to Evolith | [Getting Started by Role](./reference/getting-started/README.md) |
| Understand Evolith quickly | [Architecture Communication & Adoption Strategy](./reference/governance/standards/communication/architecture-communication-strategy.md) |
| See all explanation and communication visuals | [Visual Architecture Backlog](./reference/governance/standards/communication/visuals/README.md) |
| **Phase 2 — Design and Architecture** | |
| Understand the architecture model | [Architecture Hub](./reference/architecture/README.md) |
| Review decisions and trade-offs | [ADR Registry](./reference/architecture/adrs/README.md) |
| Find React, Web, C# or .NET standards | [Quick Access by Stack](./reference/quick-access/README.md) |
| Apply governance rules | [Governance Standards](./reference/governance/standards/README.md) |
| **Phase 3 — Construction** | |
| Follow the software delivery lifecycle | [SDLC Governance Center](./reference/governance/sdlc/README.md) |
| Work with AI-assisted engineering | [AI-DD Adoption Reference](./reference/governance/standards/ai-augmented/frameworks/README.md) |
| See the executable product reference | [UMS Applied Reference](./reference/knowledge/demo/README.md) |
| **Phases 4–5 — Validation and Delivery** | |
| Operate or observe the platform | [Operations & Observability](./reference/operations/README.md) |
| Run local infrastructure | [Infrastructure & Orchestration](./reference/infrastructure/README.md) |
| **All phases** | |
| Browse everything | [Global Master Index](./MASTER_INDEX.md) |

---

## Evolith vs UMS

| Question | Evolith | UMS |
|---|---|---|
| What belongs here? | Reusable standards, principles, ADRs, governance, canonical patterns, quality gates | Product-specific implementation evidence and applied examples |
| What should not be copied here directly? | Local product routes, headers, schemas, seeds, runtime values, branding | Enterprise-wide policy unless promoted through Evolith governance |
| How does a UMS practice become a standard? | Through ADR, governance standard, or canonical pattern promotion | By providing evidence, not authority |

UMS is the official executable reference model. Use it to see Evolith ideas applied in a real product, but keep product-specific details in UMS unless they are formally promoted.

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