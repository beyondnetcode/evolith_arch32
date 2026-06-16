# Senior Technical Analysis - Progressive Architecture Reference

> **Bilingual Navigation:** [Versión en Español](../../standards/engineering/senior-architectural-assessment.md)

## Architectural Evaluation: Progressive Monolith -> Microservices
**Role:** Principal Senior Architect | Stack: TypeScript/Node.js + C#/.NET

---

## 1. Global Evaluation

### Confirmed Structural Strengths

The repository presents a corporate reference architecture with a notable level of documentation maturity. The following stand out positively:

- **44 Formalized and Traceable ADRs**, with bidirectional linking between blueprint and technical decisions.
- **Architectural Model** (Hexagonal + Optional DDD + Polyglot) correctly justified rather than enforced.
- **Spec-driven AI-DD delivery** optimized via AI-Agent spec-driven workflows.
- **Injectable IEventBusPort** - the right decision; enables the In-Memory -> RabbitMQ -> Kafka transition without touching the domain.
- **Dual-Layer RLS** (ORM + PostgreSQL native) as a multi-tenant isolation mechanism - architecturally solid.
- **Result<T,E> Pattern** ([ADR-0019](../../../architecture/adrs/core/0019-tactical-design-patterns-future-proofing.md)) over exceptions - excellent choice for TypeScript, eliminating implicit side-effects.
- **Strict Dependency Pinning** without `^` or `~` ranges - critical for reproducibility in enterprise CI/CD.
- The **Engineering Manifesto** with automated enforcement (eslint-plugin-boundaries) is a mature pattern.

### Score by Dimension

| Dimension | Score | Justification |
| :--- | :--- | :--- |
| Hexagonal Design | 9/10 | Correctly implemented; domain without external dependencies |
| Microservices Migration Roadmap | 6/10 | Weak in concrete extraction details and activation triggers |
| ADR Governance | 8/10 | 44 well-classified ADRs, but lacking review/deprecation criteria |
| Observability | 8/10 | OTel + Loki + Jaeger is the correct stack; missing explicit SLOs/SLAs |
| Security | 8/10 | Zero-trust + RBAC/ABAC + MFA well documented |
| Multi-tenancy | 9/10 | Dual-layer is the gold standard trust pattern for SaaS |
| Resilience | 7/10 | Circuit breaker via `opossum` is OK; missing Bulkhead & explicit Retry policies |
| Testing Strategy | 6/10 | 70% threshold is insufficient for critical domain; lacks mutation testing |
| Debt / Risk Management | 5/10 | Only 3 risks and 2 debts documented; under-represented |
| .NET/C# Stack | 4/10 | [ADR-0041](../../../architecture/adrs/dotnet/0041-canonical-dotnet-backend-architecture.md) exists but is underdeveloped vs Node.js |

---

## 2. Critical Findings and Recommendations

### CRITICAL - C1: Migration Roadmap Milestones Lacking Activation Triggers

**Finding:** [ADR-0006](../../../architecture/adrs/core/0006-microservices-transition-sidecar-pattern.md) defines 3 milestones (Monolith -> Service Extraction -> Full Mesh) but fails to specify the **quantitative triggers** that activate transitions between phases.

**Problem:** Without objective criteria, the team will make extraction decisions based on intuition or political pressure, which is the #1 cause of failed microservice migrations (Sam Newman, *Building Microservices*, 2nd Ed. 2021).

**Concrete Recommendation:**

```markdown
# Activation Criteria: Monolith -> Service Extraction

A bounded context MUST be considered a candidate for extraction when it meets 2 of 4:
1. Sustained latency P95 > 200ms for that module (7 days)
2. Release frequency > 4x/week independent of other modules
3. Clear and isolated team ownership (> 80% commits from one squad)
4. Database payload > 20% of the overall total database size
```

**Reference:** To be created `[ADR-0045](../../../architecture/adrs/core/0045-microservice-extraction-readiness-criteria.md): Microservice Extraction Readiness Criteria`

---

### CRITICAL - C2: Ambiguous Database Strategy in Transition

**Finding:** The architecture defines `schema-per-context` ([ADR-0031](../../../architecture/adrs/core/0031-schema-per-context-domain-event-catalog.md)) but doesn't document managing the **transition from a shared DB to isolated service DBs** during the extraction phase.

**Problem:** The most dangerous antipattern in migrations is "shared database with microservices," leading to tight temporal coupling. The architecture mentions PostgreSQL with multiple schemas but omits synchronization mechanisms during coexistence.

**Recommendation:**

Add a Database Migration Path section to `[ADR-0031](../../../architecture/adrs/core/0031-schema-per-context-domain-event-catalog.md)` documentation:

```
Phase 1 (Monolith): Shared DB, schema-per-context, NO cross-schema JOINs
Phase 2 (Extraction): Separate DB per extracted service + Transactional Outbox ([ADR-0033](../../../architecture/adrs/core/0033-transactional-outbox-pattern.md))
 -> Sync via published events, NEVER via direct DB access from other services
Phase 3 (Mesh): Each service owns its DB completely; cross-service queries via API/gRPC only
```

**Reference:** "Database-per-Service" pattern - Chris Richardson, microservices.io; [ADR-0033](../../../architecture/adrs/core/0033-transactional-outbox-pattern.md) (Transactional Outbox) exists but is not explicitly chained to the roadmap.

---

### CRITICAL - C3: [ADR-0041](../../../architecture/adrs/dotnet/0041-canonical-dotnet-backend-architecture.md) (.NET) Is a Second-Class Citizen

**Finding:** The Node.js stack boasts 14 dedicated ADRs. The .NET/C# stack has exactly **1 ADR ([ADR-0041](../../../architecture/adrs/dotnet/0041-canonical-dotnet-backend-architecture.md))**. The runtime table defines it for "High Compute / Workers / Batch," but misses:
- Canonical C# project patterns (folder structure, DI config)
- .NET NestJS communication strategy (only mentions general gRPC + Protobuf)
- OpenBao secret management in .NET
- Specific .NET OpenTelemetry (OTel) configurations

**Impact:** For a C#/TypeScript practitioner, this gap is substantial. The .NET team will have to improvise what is hard-documented as "Law" for Node.js.

**Immediate Recommendations:**

```csharp
// [ADR-0041](../../../architecture/adrs/dotnet/0041-canonical-dotnet-backend-architecture.md) should include canonical structure:
/src
 /Domain // Entities, VOs, Domain Events (no external deps)
 /Application // Use Cases, Commands, Queries (MediatR)
 /Infrastructure // EF Core, gRPC clients, OpenBao integration
 /Api // Minimal API / Controller layer
```

Pending .NET ADRs:
- [ADR-0057](../../../architecture/adrs/dotnet/0071-dotnet-data-access-orm-strategy.md): .NET Data Access Strategy (EF Core + Dapper) — already exists, pending review for this gap
- `ADR-0068: .NET gRPC Service Setup & Protobuf Contracts` — pending creation
- `ADR-0069: .NET OpenTelemetry Configuration` — pending creation

---

### IMPORTANT - I1: 70% Coverage Target Insufficient for Critical Domain

**Finding:** The Engineering Manifesto and [ADR-0018](../../../architecture/adrs/core/0018-testing-pyramid-quality-gates.md) set `>70%` as the coverage threshold.

**Problem:** 70% can be reached by solely covering happy paths. For hexagonal architectures with rich domains, layer differentiation is required:

| Layer | Recommended Threshold | Justification |
| :--- | :--- | :--- |
| Domain (Entities, VOs) | 95% | Pure business logic, no excuses |
| Application (Use Cases) | 85% | Includes error paths from Result<T,E> |
| Infrastructure (Adapters) | 60% | Integration heavy; use contract tests |
| BFF / Controllers | 70% | Handled by E2E tests |

**Recommendation:** Configure per-layer thresholds in Jest/Istanbul using `coverageThresholds` via path patterns.

---

### IMPORTANT - I2: Dapr as Migration Strategy - Over-Engineering Risk

**Finding:** [ADR-0006](../../../architecture/adrs/core/0006-microservices-transition-sidecar-pattern.md) proposes Dapr Sidecars as the transition mechanism.

**Critical Assessment:** Dapr introduces significant operational complexity (sidecars, state stores, actor model) which might be premature if the team lacks service mesh expertise. For most orgs, Kubernetes + direct NestJS services via existing `IEventBusPort` suffices.

**Recommendation:** Document an explicit **Decision Gate** in [ADR-0006](../../../architecture/adrs/core/0006-microservices-transition-sidecar-pattern.md):

```markdown
Dapr is activated ONLY when:
- Extracted services count exceeds 5
- Automatic retry service-to-service invocation is mandatory
- The team possesses advanced operational Kubernetes maturity

Pre-Dapr Alternative: Kong + direct gRPC between NestJS services
```

---

### IMPORTANT - I3: Saga Pattern Lacks Concrete Compensation Strategy

**Finding:** [ADR-0035](../../../architecture/adrs/core/0035-distributed-saga-pattern-strategy.md) mentions "Compensating Transaction Strategy" but the blueprint provides no concrete code samples.

**Problem:** In practice, 80% of consistency issues arise in compensating actions, not happy paths. Without examples, teams deviate on implementation styles.

**Recommendation:** Add a canonical TypeScript example to [ADR-0035](../../../architecture/adrs/core/0035-distributed-saga-pattern-strategy.md):

```typescript
// Example: CreateOrder saga
class CreateOrderSaga implements ISaga {
 async execute(ctx: SagaContext): Promise<Result<Order, SagaError>> {
 const steps: SagaStep[] = [
 { execute: () => this.reserveInventory(ctx),
 compensate: () => this.releaseInventory(ctx) },
 { execute: () => this.chargePayment(ctx),
 compensate: () => this.refundPayment(ctx) },
 { execute: () => this.confirmOrder(ctx),
 compensate: () => this.cancelOrder(ctx) }
];
 return SagaOrchestrator.run(steps);
 }
}
```

---

### IMPORTANT - I4: Absence of Explicit Strangler Fig Pattern

**Finding:** The migration path omits the **Strangler Fig** pattern (Martin Fowler, 2004), the de facto standard for incremental legacy decommissioning.

**Problem:** Without dual-routing strategies, the team is prone to high-risk "big bang" extractions.

**Recommendation:** Document in [ADR-0006](../../../architecture/adrs/core/0006-microservices-transition-sidecar-pattern.md) how Kong (already configured as Edge Gateway) facilitates Strangler Fig:

```yaml
# Kong routing rule during transition
routes:
 - name: orders-new-service
 paths: ["/api/v2/orders"] # new service
 service: orders-microservice
 - name: orders-legacy
 paths: ["/api/orders"] # legacy monolith
 service: core-monolith
```

Allows instant rollbacks purely via Kong routing adjustments, zero deployment impact.

---

### IMPROVEMENT - M1: ADR Lifecycle Management

**Finding:** No documented process for ADR review/deprecation.

**Recommendation:** Add to the ADR README:
- Formal status list: `Proposed | Accepted | Deprecated | Superseded by ADR-XXXX`
- Periodic Review: Mark ADRs with mandatory audit dates (e.g., annually)
- Traceable Supersession process

---

### IMPROVEMENT - M2: Mutation Testing for Domain

**Finding:** Testing stack (Jest + Pact) lacks mutation testing.

**Recommendation:** Introduce **Stryker Mutator** for TypeScript in the Domain CI pipeline:

```json
// stryker.config.json
{
 "mutate": ["src/**/domain/**/*.ts", "src/**/application/**/*.ts"],
 "thresholds": { "high": 80, "low": 60, "break": 50 }
}
```

Mutation testing validates test *quality*. Highly useful for `Result<T,E>` checking that error conditions are legitimately evaluated.

---

### IMPROVEMENT - M3: Chaos Engineering Roadmap

**Finding:** [ADR-0037](../../../architecture/adrs/core/0037-performance-concurrency-chaos-strategy.md) mentions K6 for load testing but leaves out chaos engineering.

**Roadmap Recommendation:**
- **Short term:** Chaos Monkey for Kubernetes (pod killing)
- **Mid term:** Toxiproxy to simulate latency/failure in external deps during E2E
- **Long term:** Chaos Mesh or Gremlin for inter-service network partitions

---

## 3. .NET (C#) Specific Findings

### [ADR-0041](../../../architecture/adrs/dotnet/0041-canonical-dotnet-backend-architecture.md) Concrete Gaps

| Gap | Recommendation |
| :--- | :--- |
| No project structure | Adopt Clean Architecture template or .NET Aspire |
| MediatR vs Manual CQRS | Document in ADR-0046: MediatR for Dispatching |
| DB Migration strategy | EF Core Migrations with bundles for CI/CD |
| Health checks | .NET `IHealthCheck` on `/health/live` and `/health/ready` |
| OTel config | `OpenTelemetry.Extensions.Hosting` + `AspNetCore` |

### .NET NestJS gRPC Communication

[ADR-0027](../../../architecture/adrs/nodejs/0027-dual-protocol-rest-grpc-api-gateway.md) sets dual REST/gRPC but lacks .NET server-side guidance. Recommended:

```csharp
// Program.cs - .NET Minimal API + gRPC server
builder.Services.AddGrpc();
builder.Services.AddGrpcReflection(); // dev only
app.MapGrpcService<TodoService>();
```

```typescript
// NestJS - consume .NET gRPC service
@Module({
 imports: [ClientsModule.register([{
 name: 'TODO_PACKAGE',
 transport: Transport.GRPC,
 options: {
 url: 'dotnet-service:5001',
 package: 'todo',
 protoPath: join(__dirname, 'proto/todo.proto'),
 }
 }])]
})
```

---

## 4. Undocumented Risks (Additional)

| Risk ID | Description | Severity | Mitigation |
| :--- | :--- | :--- | :--- |
| **R-04** | **Nx Monorepo Scale** - >200 libs degrades CI time without caching | HIGH | Activate Nx Cloud or shared remote cache immediately |
| **R-05** | **TypeORM Deprecation** - Reference impl uses TypeORM vs Audit recommendation (Drizzle) | MEDIUM | [ADR-0043](../../../architecture/adrs/nodejs/0043-data-access-orm-strategy.md) defines strategy; ensure clear documented migration path |
| **R-06** | **Kong DB-less Drift** - Static YAML config can drift from dynamic production states | MEDIUM | GitOps strategy via deck CLI for Kong synchronization |
| **R-07** | **Protobuf Evolution** - No registry leads to silent breaking contract changes | HIGH | Adopt Buf Registry or Schema Registry |
| **R-08** | **Redis as SPOF** - Incorrect cluster setup causes data loss during failover | HIGH | Document minimum Redis Sentinel configuration in [ADR-0014](../../../architecture/adrs/core/0014-multi-layer-distributed-caching-strategy.md) |

---

## 5. Prioritized Improvement Roadmap

### Sprint 1 (Immediate)
- [x] [ADR-0045](../../../architecture/adrs/core/0045-microservice-extraction-readiness-criteria.md) already exists — Microservice Extraction Readiness Criteria
- [] Enrich [ADR-0006](../../../architecture/adrs/core/0006-microservices-transition-sidecar-pattern.md) with Decision Gate for Dapr
- [] Add Database Migration Path to [ADR-0031](../../../architecture/adrs/core/0031-schema-per-context-domain-event-catalog.md)
- [] Document Strangler Fig Pattern with Kong routing in [ADR-0006](../../../architecture/adrs/core/0006-microservices-transition-sidecar-pattern.md)

### Sprint 2 (Short Term)
- [] Review [ADR-0057](../../../architecture/adrs/dotnet/0071-dotnet-data-access-orm-strategy.md) — covers ORM Strategy (EF Core + Dapper); verify whether it closes the identified gap
- [] Create ADR-0068: .NET gRPC Setup & Protobuf Contract Governance
- [] Create ADR-0069: .NET OTel Configuration
- [] Update [ADR-0018](../../../architecture/adrs/core/0018-testing-pyramid-quality-gates.md) with per-layer coverage thresholds
- [] Add canonical Saga example to [ADR-0035](../../../architecture/adrs/core/0035-distributed-saga-pattern-strategy.md)

### Sprint 3 (Medium Term)
- [] Implement Stryker Mutator in Domain CI
- [] Define Buf Registry ADR for Protobuf governance
- [] Document Redis Sentinel config in [ADR-0014](../../../architecture/adrs/core/0014-multi-layer-distributed-caching-strategy.md)
- [] Introduce periodic review lifecycle for ADRs

---

## 6. Bibliographic References

- **Sam Newman** - *Building Microservices* (2nd Ed., O'Reilly 2021)
- **Chris Richardson** - microservices.io
- **Martin Fowler** - [Strangler Fig Application](https://martinfowler.com/bliki/StranglerFigApplication.html)
- **Vaughn Vernon** - *Implementing Domain-Driven Design*
- **Mark Richards & Neal Ford** - *Fundamentals of Software Architecture*
- **Michael Nygard** - *Release It!*
- **.NET Aspire** - [Microsoft Learn](https://learn.microsoft.com/dotnet/aspire)
- **Buf Schema Registry** - [buf.build](https://buf.build)
- **Stryker Mutator** - [stryker-mutator.io](https://stryker-mutator.io)

---
[Back to Index](./README.md)
