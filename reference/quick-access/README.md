# Quick Access — Reference Standards by Stack

> **Purpose:** reduce navigation friction for teams looking for the authoritative standards for Web, C#/.NET, and React.

Use this page when you already know the target stack and need the shortest path to the relevant Evolith standards.

---

## Direct Standard Links

| Need | Direct link | Authority |
| :--- | :--- | :--- |
| React Web frontend standard | [React Web Frontend Standard](../governance/standards/engineering/web-frontend/react/react-web-frontend-standard.md) | Evolith normative standard |
| C# / .NET API standard | [.NET API Standard](../governance/standards/engineering/api-dotnet/api-dotnet-standard.md) | Evolith normative standard |
| .NET and C# runtime profile | [.NET & C# Tech Stack Profile](../architecture/blueprints/authoritative-tech-stack-dotnet.md) | Evolith runtime profile |
| Runtime-agnostic baseline | [Agnostic Architecture Baseline](../architecture/blueprints/authoritative-tech-stack-agnostic.md) | Evolith universal baseline |

---

## Start Here by Stack

| I am working on... | Read first | Then read | Use for |
| :--- | :--- | :--- | :--- |
| Any product or runtime | [Agnostic Architecture Baseline](../architecture/blueprints/authoritative-tech-stack-agnostic.md) | [Reference Blueprint](../architecture/blueprints/reference-blueprint.md) | Universal architecture constraints before stack-specific decisions |
| Web frontend in React | [React Web Frontend Standard](../governance/standards/engineering/web-frontend/react/react-web-frontend-standard.md) | [React Frontend Section](../governance/standards/engineering/web-frontend/react/README.md) | React architecture, boilerplate, UI system, data access, testing, accessibility and promotion rules |
| C# / .NET API backend | [.NET API Standard](../governance/standards/engineering/api-dotnet/api-dotnet-standard.md) | [.NET & C# Tech Stack Profile](../architecture/blueprints/authoritative-tech-stack-dotnet.md) | ASP.NET Core APIs, host bootstrap, REST/GraphQL surface, EF Core, observability, resilience and quality gates |
| C# / .NET workers or non-HTTP runtime | [.NET & C# Tech Stack Profile](../architecture/blueprints/authoritative-tech-stack-dotnet.md) | [Agnostic Architecture Baseline](../architecture/blueprints/authoritative-tech-stack-agnostic.md) | Runtime stack decisions for non-API .NET workloads |
| Node.js / TypeScript backend | [Node.js / TypeScript Tech Stack Profile](../architecture/blueprints/authoritative-tech-stack-nodejs.md) | [Agnostic Architecture Baseline](../architecture/blueprints/authoritative-tech-stack-agnostic.md) | Runtime-specific backend stack decisions |
| Stack comparison or selection | [All Runtime Profiles Index](../architecture/blueprints/authoritative-tech-stack.md) | [Tech Stack Summary](../architecture/blueprints/tech-stack-summary.md) | Choosing or validating an approved runtime profile |

---

## Fast Paths

### React Web Standard

1. Open [React Web Frontend Standard](../governance/standards/engineering/web-frontend/react/react-web-frontend-standard.md).
2. Confirm the product keeps product-specific details outside Evolith unless promoted.
3. Apply the standard for folder structure, UI tokens, API boundaries, testing, security, and accessibility.

### C# / .NET API Standard

1. Open [.NET API Standard](../governance/standards/engineering/api-dotnet/api-dotnet-standard.md).
2. Read it with the [.NET & C# Tech Stack Profile](../architecture/blueprints/authoritative-tech-stack-dotnet.md).
3. Apply the standard for host bootstrap, layered architecture, API surface governance, EF Core persistence, tenancy, observability, resilience, security, and quality gates.

### General Web / Frontend Work

1. Start with [React Web Frontend Standard](../governance/standards/engineering/web-frontend/react/react-web-frontend-standard.md) when React is the target.
2. Use [Notification & Feedback Architecture](../architecture/blueprints/notification-feedback-architecture.md) when the work touches user feedback, toasts, drawers, errors, or mutation feedback.
3. Escalate reusable UI or boilerplate decisions through ADR, governance standard, or canonical pattern before treating them as enterprise-wide.

---

## What Belongs Where

| Concern | Source of truth |
| :--- | :--- |
| Universal architecture rules | `reference/architecture/blueprints/authoritative-tech-stack-agnostic.md` |
| API .NET standard | `reference/governance/standards/engineering/api-dotnet/` |
| Runtime-specific backend choices | `reference/architecture/blueprints/authoritative-tech-stack-*.md` |
| React frontend rules | `reference/governance/standards/engineering/web-frontend/react/` |
| Product-specific implementation | Child repository or UMS applied reference |
| Reusable promoted practice | Evolith ADR, governance standard, or canonical pattern |

---

## Quality Rule

Do not copy a product-specific practice into Evolith just because it exists in UMS or another satellite repository. Promote it only when it is reusable, documented, validated, and approved through the promotion path.

---

[Back to Repository Root](../../README.md)
