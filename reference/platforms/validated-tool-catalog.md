# Evolith Validated Tool Catalog

> **Bilingual navigation:** [Versión en Español](./validated-tool-catalog.es.md)

> **Document Type:** Corporate Standard
> **Status:** Active
> **Date:** 2026-06-06
> **Purpose:** Define validated tools per phase, architecture pattern, and runtime. CLI uses this catalog for interactive tool selection.

---

## 1. Tool Validation Criteria

A tool is "validated" by Evolith Core when:
- Has ADR approval or explicit corporate standard entry
- Has defined version range (min/max)
- Has CLI execution capability (integrated or scriptable)
- Has documented exit criteria if tool changes

Tools NOT in this catalog require Architecture Board approval and ADR before use.

---

## 2. Phase 1 — Structure Tools

### 2.1 Monorepo Orchestration

| Tool | Version | Category | CLI Action | Notes |
|------|---------|----------|------------|-------|
| **Nx** | 18.x+ | Monorepo | `smart-cli init --monorepo=nx` | NestJS native, strict library tags |
| **NPM Workspaces** | 10.x+ | Monorepo | `smart-cli init --monorepo=npm` | Simpler, no strict boundaries |
| **Both (Nx + NPM)** | 18.x+ / 10.x+ | Monorepo | `smart-cli init --monorepo=both` | Nx for CI, NPM for local dev |

**Selection Prompt:**
```
Which monorepo orchestrator?
  [nx]      Nx — Strict library isolation, affected graph, CI optimization
  [npm]     NPM Workspaces — Simpler, flat structure
  [both]    Both — Nx for CI/CD, NPM for local development
```

### 2.2 Architecture Pattern

| Pattern | Tools | CLI Action | Notes |
|---------|-------|------------|-------|
| **Clean Architecture** | NestJS + Layers | `smart-cli init --arch=clean` | Controller → Service → Repository |
| **Hexagonal (Ports & Adapters)** | NestJS + Ports | `smart-cli init --arch=hexagonal` | Domain ports, Infrastructure adapters |
| **DDD (Domain-Driven Design)** | NestJS + DDD patterns | `smart-cli init --arch=ddd` | Aggregates, Value Objects, Domain Events |
| **Clean + Hexagonal** | Combined | `smart-cli init --arch=clean-hex` | Clean structure + explicit ports |
| **Hexagonal + DDD** | Combined | `smart-cli init --arch=hex-ddd` | Ports + rich domain model |
| **Clean + Hex + DDD** | Full Stack | `smart-cli init --arch=full` | All patterns combined |

**Selection Prompt:**
```
Select architecture pattern:
  [clean]       Clean Architecture — Simple layer separation
  [hexagonal]   Hexagonal — Ports and Adapters isolation
  [ddd]         DDD — Rich domain model with bounded contexts
  [clean-hex]   Clean + Hexagonal — Layered with port isolation
  [hex-ddd]     Hexagonal + DDD — Ports with rich domain
  [full]        Full Stack — Clean + Hexagonal + DDD
```

### 2.3 Runtime Selection

| Runtime | Version | CLI Flag | Notes |
|---------|---------|----------|-------|
| **Node.js / TypeScript** | 20.x LTS | `smart-cli init --runtime=nodejs` | NestJS, TypeORM, Jest |
| **.NET / C#** | .NET 8+ | `smart-cli init --runtime=dotnet` | EF Core, xUnit, MediatR |
| **Android / Kotlin** | Latest | `smart-cli init --runtime=android` | Jetpack Compose, Hilt |

---

## 3. Phase 2 — Governance Tools

### 3.1 ACL (Anti-Corruption Layer)

| Tool | Purpose | CLI Action |
|------|---------|------------|
| **ACL Schema Validator** | Validate external data against Core schemas | `smart-cli validate --ruleset=acl` |
| **Transformation Logger** | Track all external data transformations | Auto-instrumented |
| **External System Adapters** | Jira, Linear, GitHub, Confluence connectors | Per integration |

### 3.2 Documentation

| Tool | Purpose | CLI Action |
|------|---------|------------|
| **Bilingual Docs** | EN + ES documentation | `smart-cli docs --bilingual` |
| **ADR Registry** | Architecture Decision Records | `smart-cli docs --adr` |
| **Harness Scripts** | Pre-commit validation hooks | `smart-cli init --hooks` |

---

## 4. Phase 3 — Architecture Tools

### 4.1 Bounded Context Mapping

| Tool | Purpose | CLI Action |
|------|---------|------------|
| **Context Mapper** | Define bounded contexts | `smart-cli sdlc handoff --phase=3 --context-map` |
| **Contract Registry** | Document inter-context contracts | Auto-generated |
| **Event Schema Registry** | Domain event definitions | `smart-cli docs --events` |

### 4.2 API Protocol

| Protocol | Use Case | CLI Action |
|----------|----------|------------|
| **REST (OpenAPI v3)** | External APIs | `smart-cli init --api=rest` |
| **gRPC (Protobuf)** | Internal services | `smart-cli init --api=grpc` |
| **Both** | REST external, gRPC internal | `smart-cli init --api=hybrid` |

---

## 5. Phase 4 — Production Tools

### 5.1 CI/CD

| Tool | Version | CLI Action |
|------|---------|------------|
| **GitHub Actions** | Primary CI | `smart-cli init --ci=github` |
| **GitLab CI** | Alternative CI | `smart-cli init --ci=gitlab` |
| **Azure DevOps** | Enterprise CI | `smart-cli init --ci=azure` |

### 5.2 Container & Orchestration

| Tool | Version | CLI Action |
|------|---------|------------|
| **Docker** | Containerization | `smart-cli init --container=docker` |
| **Docker Compose** | Local orchestration (Phase 1-2) | Default |
| **Kubernetes (K8s)** | Production orchestration (Phase 3+) | `smart-cli init --k8s` |
| **Helm** | Chart management | `smart-cli init --helm` |

### 5.3 Observability

| Tool | Purpose | CLI Action |
|------|---------|------------|
| **OpenTelemetry** | Tracing/Metrics | `smart-cli init --otel` |
| **Prometheus** | Metrics collection | Auto-configured |
| **Jaeger/Tempo** | Distributed tracing | `smart-cli init --tracing=jaeger` |
| **Loki** | Log aggregation | `smart-cli init --logging=loki` |

### 5.4 Security

| Tool | Purpose | CLI Action |
|------|---------|------------|
| **HashiCorp Vault** | Secrets management | `smart-cli init --secrets=vault` |
| **Trivy** | Vulnerability scanning | `smart-cli init --security=trivy` |
| **Snyk** | Dependency scanning | `smart-cli init --security=snyk` |

---

## 6. Runtime-Specific Tool Sets

### 6.1 Node.js / TypeScript

| Category | Tool | Version | CLI Flag |
|----------|------|---------|----------|
| Framework | NestJS | 10.x+ | `--runtime=nodejs` |
| ORM | TypeORM | Latest | `--orm=typeorm` |
| ORM | Drizzle | Latest | `--orm=drizzle` |
| Validation | class-validator | Latest | Default |
| Testing | Jest | 29.x | `--test=jest` |
| Linting | ESLint + Prettier | 8.x / 3.x | Default |
| Compiler | @swc/core | Latest | `--fast-build` |

### 6.2 .NET / C#

| Category | Tool | Version | CLI Flag |
|----------|------|---------|----------|
| Framework | ASP.NET Core | .NET 8+ | `--runtime=dotnet` |
| ORM | Entity Framework Core | 8.x | `--orm=efcore` |
| CQRS | MediatR | Latest | `--cqrs=mediatr` |
| Testing | xUnit | Latest | `--test=xunit` |
| Logging | Serilog | Latest | `--logging=serilog` |

### 6.3 Android / Kotlin

| Category | Tool | Version | CLI Flag |
|----------|------|---------|----------|
| Framework | Jetpack Compose | Latest | `--runtime=android` |
| DI | Hilt | Latest | `--di=hilt` |
| Database | Room | Latest | `--db=room` |
| Networking | Retrofit | Latest | `--net=retrofit` |

---

## 7. Tool Selection Flow

When running `smart-cli init` or `smart-cli sdlc handoff`, the CLI presents tool selection based on current phase:

```
┌─────────────────────────────────────────────────────────────┐
│  Evolith Tool Selection                                     │
├─────────────────────────────────────────────────────────────┤
│  Phase: 1 - Structure                                       │
│                                                             │
│  1. Monorepo Orchestrator                                   │
│     > [Nx] [NPM Workspaces] [Both]                         │
│                                                             │
│  2. Architecture Pattern                                    │
│     > [Clean] [Hexagonal] [DDD] [Clean+Hex] [Hex+DDD] [Full]│
│                                                             │
│  3. Database                                                │
│     > [PostgreSQL] [MongoDB] [SQL Server] [Both]           │
│                                                             │
│  4. API Protocol                                            │
│     > [REST] [gRPC] [Both (REST external, gRPC internal)]  │
│                                                             │
│  [Continue] [Back] [Show Summary] [Help]                   │
└─────────────────────────────────────────────────────────────┘
```

---

## 8. CLI Tool Catalog Structure

```typescript
interface EvolithTool {
  id: string;
  name: string;
  version: string;
  phase: 'phase-0' | 'phase-1' | 'phase-2' | 'phase-3' | 'phase-4';
  category: 'monorepo' | 'architecture' | 'database' | 'api' | 'ci' | 'container' | 'observability' | 'security';
  runtime?: 'nodejs' | 'dotnet' | 'android' | 'agnostic';
  validated: boolean;
  cliCommand?: string;
  description: string;
  alternatives?: string[];
  adrReference?: string;
}
```

---

## 9. Adding New Tools

To add a tool to the catalog:

1. Create ADR referencing the tool
2. Register the gap/feature in `reference/governance/standards/vision/gap-tracking.md` (single tracking board)
3. Implement CLI integration if executable
4. Update this catalog with version constraints

---

## 10. Rejected Tools

Tools explicitly rejected by Evolith Core (require ADR to overturn):

| Tool | Category | Reason |
|------|----------|--------|
| Bun | Runtime | Not audited, ecosystem compatibility unproven |
| Deno | Runtime | Production readiness not confirmed |
| Prisma | ORM (Node.js) | Performance issues in high-load scenarios (requires ADR) |
| Sequelize | ORM | Not recommended, use TypeORM/Drizzle |
| Mocha | Testing | Use Jest for consistency |
| Fastify | Web Host | Unless ADR approved, use NestJS/Express |

---

## References

- [Authoritative Tech Stack - Agnostic](../architecture/blueprints/authoritative-tech-stack-agnostic.md)
- [Authoritative Tech Stack - Node.js](../architecture/blueprints/authoritative-tech-stack-nodejs.md)
- [Authoritative Tech Stack - .NET](../architecture/blueprints/authoritative-tech-stack-dotnet.md)
- [Phase Gates Ruleset](../../rulesets/sdlc/phase-gates.rules.json)
- [Gap Tracking Board](../governance/standards/vision/gap-tracking.md)