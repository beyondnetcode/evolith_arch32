# ADR-0074: Evolith Core API Native Exposure Layer

> **Bilingual Navigation:** [Versión en Español](./0074-evolith-core-api-exposure-layer.es.md)

## Status

Approved — Evolith Architecture Board, 2026-06-13.

## Date

2026-06-13

## Context and Problem

Evolith Core has been historically distributed primarily as a CLI (`@evolith/smart-cli`). Recent architectural decisions incorporated a Model Context Protocol (MCP) server exposed through the CLI (`evolith mcp start`) to serve governance as real-time context to AI Agents and external orchestrators like the Evolith Tracker.

However, as the Evolith Tracker transitions into an independent SaaS SDLC Orchestrator, depending solely on a CLI-spawned MCP server or embedding the core libraries limits scalability, restricts protocol choices, and misplaces the network boundary. Evolith Tracker needs a robust, scalable, and secure API to query architectural evaluation results, without duplicating the domain logic.

If we force the Tracker to host the domain logic, we violate the fundamental rule that `evolith_arch32` is the single source of truth for Core architecture.

## Objective and Scope

**Objective:** Define an official, scalable network exposure layer for Evolith Core that encapsulates the domain logic and provides standard REST interfaces to external clients (like Evolith Tracker and AI Agents), with MCP served by the standalone gateway.

**In scope:**
- Creation of `apps/core-api` within the Evolith Core monorepo.
- Technology stack selection (NestJS).
- Boundary definition between Evolith Core and Evolith Tracker.

**Out of scope:**
- Implementation details of the Evolith Tracker (which belongs in its own repository).
- Refactoring the entire CLI codebase away from the shared domain packages.

## Options Considered

1. **Tracker BFF (Backend-For-Frontend) inside Evolith Core:** Build the Tracker's backend in this repository. Rejected: Violates the repository boundary. Evolith Core is an architectural reference, not a product codebase for the Tracker UI.
2. **Expose Core Domain via npm only:** Force the Tracker to import `@evolith/smart-cli` as a library and build its own API. Rejected: Tracker becomes tightly coupled to Core's execution environment; any API logic wouldn't be reusable for other clients (like executive dashboards).
3. **Evolith Core API using NestJS (chosen):** Build a dedicated API gateway (`apps/core-api`) inside the `evolith_arch32` monorepo using NestJS. This API wraps the Core Domain and exposes standard network interfaces. The Tracker remains an external consumer.

## Decision and Rationale

Adopt **option 3**. We will construct the **Evolith Core API** as a NestJS application in the `apps/core-api` directory.

**Ratified elements:**
1. **Network Sovereignty:** Evolith Core is the sole owner of its domain, rulesets, and evaluation logic. It exposes this capability natively via `apps/core-api`.
2. **Client Agnosticism:** The Evolith Tracker acts strictly as a client to the Core API. Tracker will consume REST interfaces to display phase gates, validation statuses, and manage the SDLC.
3. **Monorepo Structure:** The root `package.json` will be updated to support npm workspaces targeting `apps/*` and `sdk/*`.
4. **Technology Stack:** NestJS is selected for the `core-api` to maintain strong typing, enforce hexagonal architecture natively, and seamlessly integrate the existing TypeScript domain logic from the `smart-cli`.
5. **MCP Exposure (amended 2026-06-19 — see Amendment):** The existing MCP server logic is exposed as a dedicated NestJS interface that serves AI Agents over MCP alongside the REST consumers, sharing the same application-layer use cases as `apps/core-api` and the CLI.

> **Amendment (2026-06-19, GT-119):** Ratified element 5 originally specified the MCP logic as *"integrated into or wrapped by the NestJS application to provide a unified deployment unit."* As implemented under [ADR-0075](../../../architecture/adrs/nodejs/0075-application-gateway-bff-nestjs.md), the MCP gateway was extracted into a **standalone NestJS package** (`@evolith/mcp-server`) rather than fused into `apps/core-api`. `smart-cli mcp serve` delegates to that package, and `apps/core-api` does **not** serve MCP. This preserves the single-domain-logic principle (all surfaces call the same application use cases) while keeping MCP, REST, and CLI as **independent deployment units**, which improves protocol isolation and lets the MCP transport scale separately. The Product Vision §2.5 Technical Interface Layer already reflects this two-layer exposure.

**Rationale:** This decision preserves the domain sovereignty of Evolith Core while providing a mature, scalable interface for the Evolith Tracker SaaS. NestJS aligns perfectly with our existing TypeScript ecosystem and strictly enforces the dependency injection and hexagonal boundaries we have standardized.

## Evidence and Evaluation Criteria

Criteria used to judge the options: (a) Clear domain boundaries; (b) Scalability of the Core logic; (c) Reusability of the API for clients other than Tracker.

Evidence: The current CLI implementation has already demonstrated the viability of the domain logic. This ADR simply lifts that logic into a persistent network service.

## Consequences, Risks, and Trade-offs

**Positive:**
- Centralized governance plane: All evaluations happen in one official API.
- The Tracker is unblocked to build its UI without reinventing domain evaluations.

**Negative / risks:**
- Adds maintenance overhead for a new NestJS application within the repository.
- Requires refactoring the build pipeline to support a monorepo with both a CLI and an API.

**Trade-off accepted:** The operational cost of maintaining a NestJS app is offset by the architectural purity and security of having a strict API boundary for the Core domain.

## References

- [SDLC Tracker — Technical Interface Design](../../../sdlc/standards/vision/sdlc-tracker-technical-interfaces.md)
- [Maturity Assessment](../../../sdlc/standards/vision/maturity-assessment.md)

## Related Decisions and Standards

- [ADR 0073: Unified CLI/MCP Output Contract](./0073-unified-cli-output-contract.md)
- [ADR 0047: Architectural Patterns](./0047-architectural-patterns-monolith-soa-microservices.md)

---
[Back to ADR Registry](../README.md)

> **Agent Signature:** Architect Agent
