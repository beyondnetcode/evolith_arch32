# AI-DD Frameworks — Adoption Reference

> **Bilingual Navigation:** Versión en Español — pendiente

This section documents how this repository adopts and configures external AI-driven development frameworks. It is **not** a replacement or mirror of any framework's official documentation. Each entry describes the local implementation decisions, adaptations, and extensions made on top of the upstream framework.

---

## Important Distinction

The documents in this section describe **this repository's specific configuration** of each framework — the agents added, the rules defined, the playbooks written, and the harness wired up for the progressive architecture context.

For the authoritative source of each framework, always refer to its official upstream repository.

---

## Frameworks Adopted in This Repository

| Framework | Official Source | What Is Documented Here |
| :--- | :--- | :--- |
| [BMAD-METHOD](./bmad-method/README.md) | [github.com/bmad-code-org/BMAD-METHOD](https://github.com/bmad-code-org/BMAD-METHOD) | How this repo adopted BMAD, what was extended, and the local harness rules layer built on top |

---

## Document Structure per Framework

| Document | Purpose |
| :--- | :--- |
| `README.md` | Adoption context — what was taken from the framework, what was added locally, and what was left out |
| `agents-catalog.md` | Local agent configuration — how each agent is scoped for this architecture context |
| `rules-reference.md` | Local harness rules — what they are, why they were added, and how they extend the framework |
| `portable-setup.md` | How another team can replicate this repository's adoption in their own context |

---

[Back to AI-Augmented Architecture](../README.md)
