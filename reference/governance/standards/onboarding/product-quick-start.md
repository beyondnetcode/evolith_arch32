# Evolith Quick Start — Onboarding New Products onto the Platform

**Role:** Developer / Solutions Architect  
**Objective:** Apply the Evolith architecture reference to a new product without confusing policy with a sample implementation.

## 1. Choose the Correct Starting Point

| Need | Starting point |
|---|---|
| Define a new product architecture | [Architecture Hub](../../../architecture/README.md) and [Child Repository Inheritance Guide](./child-repository-inheritance-guide.md) |
| Review a complete executable example | [UMS Applied Reference Model](../../../knowledge/demo/ums-reference-model.md) |
| Run the official example | [UMS README](https://github.com/beyondnetcode/ums/blob/main/README.md) |
| Select a runtime | [Authoritative Tech Stack Index](../../../architecture/blueprints/authoritative-tech-stack.md) |

**Evolith** is a documentation and decision upstream — not a starter template. It is not cloned as an application starter and does not contain a local product sandbox.

## 2. Applying the Reference to a Product

1. Read the agnostic baseline and the ADR matrix.
2. Select the runtime profile justified by the product context.
3. Create product-owned documentation: vision, bounded contexts, glossary, constraints, and local decisions.
4. Record whether each applicable upstream ADR is adopted, extended, overridden, or not applicable.
5. Use UMS as implementation evidence for enterprise concerns, not as an automatic copy of every technology selection.

## 3. Reviewing UMS

UMS is now the official applied product reference because it demonstrates concerns absent from a trivial example: identity lifecycle, access control, auditability, bounded contexts, API protocol boundaries, persistence, frontend integration, and operational documentation.

```bash
git clone https://github.com/beyondnetcode/ums.git
cd ums
```

Use the current [UMS setup instructions](https://github.com/beyondnetcode/ums/blob/main/README.md) for prerequisites and execution. Commands remain in UMS so that this upstream never publishes stale product setup.

## 4. Mandatory Documentation Gates

Before contributing changes to this reference corpus, run:

```bash
node .harness/scripts/validate-docs.mjs
```

When adding or changing Mermaid diagrams, also run:

```bash
node .harness/scripts/validate-docs.mjs --render-mermaid
```

## 5. AI Agent Collaboration (BMAD Method)

Evolith Core uses the BMAD Method to orchestrate specialized AI agents. You can invoke them by their specific persona names in your IDE or prompts to assist with different lifecycle tasks:

- **Wilson (Principal Architect):** Invoke for deep architectural audits, repository maturity checks, and automated gap tracking updates.
- **Architect Agent:** Invoke to design multi-topology structures (Data Mesh, Serverless, Edge), define OPA/Rego contracts, and draft new ADRs.
- **Developer Agent:** Invoke to implement clean architecture layers, distributed patterns (e.g., Transactional Outbox), and secure UI components.
- **QA Agent:** Invoke to write automated tests, validate inter-domain event payloads, and enforce OWASP security mitigations.
- **DevOps Agent:** Invoke to configure GitHub Actions, automate documentation releases, and manage distributed deployments.
- **Docs Agent:** Invoke to translate files to maintain bilingual parity and validate markdown structures.

## 6. Assistance

- [ADR Registry](../../../architecture/adrs/README.md)
- [Repository Taxonomy](../repository-taxonomy.md)
- [Reference vs UMS Applied Model](../../../knowledge/demo/demo-vs-reference.md)

---
[Back to Onboarding](./README.md)
