# Authoritative Tech Stack: Node.js & TypeScript Ecosystem

> **Bilingual Navigation:** [Versión en Español](./../blueprints/authoritative-tech-stack-nodejs.md)

**Document Type:** Runtime Addendum 
**Prerequisite:** MUST be read after the **[Agnostic Baseline](./authoritative-tech-stack-agnostic.md)**. 

---

## 1. Executive Compliance Matrix (Vendor Mandates)

| Category | Approved Tool / Framework | Validated Version | ADR Required to Swap? | Explicitly Rejected Alternatives |
| :--- | :--- | :--- | :--- | :--- |
| **Runtime Base** | **Node.js (LTS)** | 20.x | **YES** | Bun, Deno (until further audit) |
| **Web Host** | **NestJS (Express Engine)** | 10.x+ | **YES** | Fastify (unless ADR approved), Bare Express |
| **Relational DB** | **PostgreSQL** | v16+ | **YES** | MySQL, MariaDB |
| **Non-Relational DB** | **MongoDB** | Latest | **YES** | Cassandra, DynamoDB |
| **Relational ORM** | **TypeORM** or **Drizzle** | Latest | **NO** | Sequelize, Prisma (requires performance ADR) |
| **Validation** | **class-validator** | Latest | **NO** | Zod (except for API contracts) |
| **Testing Engine** | **Jest** | 29.x | **YES** | Mocha, Ava |
| **Monorepo Orchestrator**| **Nx** | 18.x+ | **YES** | Turborepo, Lerna |

> [!TIP]
> **Testing Isolation:** Developers MUST follow the isolation strategy defined in [ADR-0052](../adrs/core/0052-unit-testing-isolation-strategy.md) when using Mocks (interaction verification) or Stubs (state setup).
>
> **Infrastructure Testing:** Integration and E2E tests MUST utilize **Testcontainers** as defined in [ADR-0053](../adrs/core/0053-integration-e2e-testing-strategy.md) to guarantee production parity.

---

## 2. Architecture Organization (Nx Workspace)

Node.js solutions MUST utilize strict library isolation enforced by **Nx tags**:
1. **`type:domain`**: Zero external imports. Pure TS objects.
2. **`type:application`**: Contains NestJS-agnostic logic, purely dependency-injected command handlers.
3. **`type:infrastructure`**: Contains NestJS concrete modules, ORM entities, and adapters.
4. **`type:api`**: Entry point NestJS application shell.

---

## 3. Specific Runtime Tools

* **Compiler:** `@swc/core` for 20x faster CI/CD compilation.
* **Linting:** ESLint v8 strict mode + Prettier configuration.

---
-> Back to **[Global Master Index](../../control-center/taxonomy/MASTER_INDEX.md)**

---
[Back to Index](./README.md)
