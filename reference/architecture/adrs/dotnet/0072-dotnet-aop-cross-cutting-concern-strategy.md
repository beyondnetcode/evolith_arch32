# [ADR 0072](0072-dotnet-aop-cross-cutting-concern-strategy.md): .NET AOP Cross-Cutting Concern Strategy — DispatchProxy over Pipeline Behaviors

## Status

Accepted

## Date

2026-06-07

## Scope

Technology Stack — .NET Cross-Cutting Concerns / AOP

> **Satellite origin:** Originally validated in UMS satellite (UMS ADR-0060). Promoted to Evolith corporate baseline.

---

## Context

.NET command handlers in CQRS-based architectures require structured cross-cutting concerns: entry/exit logging with duration, distributed tracing with tenant tags, RED metrics, and exception capture. These concerns must be:

1. **Selective** — applied per-handler or per-method, not uniformly to every request.
2. **Non-invasive** — zero changes to the handler's business logic.
3. **Async-correct** — hooks fire *after* the awaited result completes, not when the `Task` object is returned.
4. **Testable in isolation** — handlers unit-tested without cross-cutting infrastructure.

MediatR `IPipelineBehavior<TRequest, TResponse>` is already used for **uniform** pipeline concerns (validation, idempotency). The question is whether to extend that mechanism for selective cross-cutting concerns or adopt a different model.

### Alternatives Evaluated

| Option | Mechanism | Selective? | Async-correct? | External dependency? | Decision |
|---|---|---|---|---|---|
| A | MediatR `IPipelineBehavior<,>` | All-or-nothing per type constraint | Yes | No | Rejected for selective concerns |
| B | Decorator classes per handler | Manual per-handler | Yes | No | Rejected — O(n) boilerplate |
| C | Castle.DynamicProxy / Autofac interceptors | Attribute-driven | Yes | New NuGet required | Rejected — external dependency surface |
| D | `System.Reflection.DispatchProxy` with attribute-driven aspects | Attribute-driven | Yes (after async fix) | Owned shell library | **Adopted** |

### Why MediatR `IPipelineBehavior` Is Insufficient for Selective Concerns

`IPipelineBehavior<TRequest, TResponse>` applies to every command matching its type constraint. This is the correct model for **uniform** concerns but creates unacceptable coupling for **selective** concerns:

- A logging behavior that applies to a specific handler requires type-specific conditions or separate behavior registrations per request type.
- Conditional behavior logic (`if request is X then log, else skip`) defeats the purpose of the pipeline abstraction.
- MediatR behaviors cannot distinguish between handlers that should emit structured Serilog logs versus those that should emit only MEL Debug logs.

**Resolution:** MediatR behaviors remain the canonical mechanism for uniform pipeline concerns. `System.Reflection.DispatchProxy` with an owned aspect library is the canonical mechanism for selective, per-method decoration.

---

## Decision

**Implement selective, per-method cross-cutting concerns via `System.Reflection.DispatchProxy` using an attribute-driven aspect execution chain.**

### Separation of Responsibilities

| Concern | Mechanism | Applies to |
|---|---|---|
| Input validation | `ValidationBehavior` (MediatR `IPipelineBehavior`) | All commands uniformly |
| Idempotency | `IdempotencyMiddleware` (HTTP — see [ADR-0066](./0066-dotnet-lightweight-http-idempotency.md)) | All mutating endpoints |
| Logging (selective) | `LoggerAspect` via `DispatchProxy` | Per-handler, opt-in via `[LoggerAspect]` |
| Tracing | `TracingAspect` via `DispatchProxy` | Per-handler, opt-in via `[Tracing]` |
| Metrics | `MetricsAspect` via `DispatchProxy` | Per-handler, opt-in via `[Metrics]` |
| Retry (selective) | `RetryAspect` via `DispatchProxy` | Per-method, opt-in via `[RetryAspect]` |

### Async Proxy Fix — Mandatory Prerequisite

`System.Reflection.DispatchProxy.Invoke` is synchronous. Without explicit async handling, `OnSuccess` and `OnExit` hooks fire when a `Task` is **returned** (before completion), not after it completes. Satellite implementations must:

- After `joinPoint.Proceed()`, detect `Task` / `Task<TResult>` return types and wrap them in continuation tasks.
- Use `ConfigureAwait(false)` on the continuation.
- Skip the synchronous `finally { OnExit() }` block for async paths to prevent double-firing.

### DI Registration Pattern

```csharp
// The proxy registration must come AFTER MediatR registration
// so the proxy wins the last-registration-wins DI resolution
services.AddMediatR(cfg => cfg.RegisterServicesFromAssembly(assembly));
services.AddAop();
services.AddAopProxy<IRequestHandler<CreateCommand, Result<Response>>, CreateCommandHandler>();
```

### Constraints

- `DispatchProxy` requires the service to be registered as an **interface** (or abstract class). Concrete class proxying is not supported.
- Singleton-scoped proxies are prohibited. Aspects may resolve scoped services (e.g., `IRequestContext`); registering the proxy as singleton would create a captive dependency.
- The proxy registration must follow MediatR registration (last-registration-wins).
- Aspect ordering (when multiple aspects apply) should be explicit: Tracing(10) → Logging(50) → Metrics(60).

### PII Policy for Logging Aspects

| Logger | Argument values logged | When to use |
|---|---|---|
| MEL-backed logger | Never — method names and types only | Default; all handlers |
| Serilog destructuring logger | Destructured (opt-in) | Only after explicit PII review and approval |

`LogArguments = []` (empty array) is the PII-safe default and must be set on all handlers unless a specific argument has been reviewed and cleared.

---

## Consequences

### Positive

- Handlers remain pure business logic — no logging or telemetry imports in Application layer code.
- Cross-cutting concerns are applied selectively without modifying the MediatR pipeline for all handlers.
- Attribute decoration (`[LoggerAspect]`, `[Tracing]`) makes concerns visible and searchable in code review.
- Async-correct hooks fire after real completion, not after `Task` object creation — logs and metrics are accurate.
- The same proxy mechanism applies to any DI-registered interface: repositories, domain services, and external gateway adapters can be decorated with the same pattern.

### Trade-offs

- `DispatchProxy` requires interface-based registration — concrete class proxying is not supported.
- The async continuation wrapper adds a minor allocation overhead per async method call (~1 allocation).
- MediatR's assembly scanning registers handlers before `AddAopProxy<>` — proxy registration ordering must be explicit.
- The `PointCut` cache grows proportionally with proxied methods; negligible in practice.

### Non-decisions

- **Compile-time weaving** (PostSharp, Fody) was not evaluated. The added build complexity is not justified at typical satellite scale.
- **Castle.DynamicProxy / Autofac interceptors** remain available as future alternatives if `DispatchProxy`'s interface constraint becomes limiting.

---

## References

- [ADR-0041: Canonical .NET Backend Architecture](./0041-canonical-dotnet-backend-architecture.md)
- [ADR-0064: .NET Request-Scope Observability Context](./0064-dotnet-request-scope-observability-context.md)
- [ADR-0065: .NET PII-Safe Serilog Pipeline](./0065-dotnet-pii-safe-serilog-pipeline.md)
- [ADR-0066: .NET Lightweight HTTP Idempotency](./0066-dotnet-lightweight-http-idempotency.md)





## Evidence and Evaluation Criteria

Unknown (historical record; evaluated against general architectural principles of maintainability and reliability).

## Related Decisions and Standards

- [ADR-0041: Canonical .NET Backend Architecture](./0041-canonical-dotnet-backend-architecture.md)
- [ADR-0064: .NET Request-Scope Observability Context](./0064-dotnet-request-scope-observability-context.md)
- [ADR-0065: .NET PII-Safe Serilog Pipeline](./0065-dotnet-pii-safe-serilog-pipeline.md)
- [ADR-0066: .NET Lightweight HTTP Idempotency](./0066-dotnet-lightweight-http-idempotency.md)

## Technology Watch (Trends, Maturity, Adoption, Support)

> Backfill pending — tracked as [GT-20](../../../governance/standards/vision/gap-reference-catalog.md#gt-20) (ADR standardization 2026-06-10).

## Current Sources

Unknown (historical record).

---
[Back to Index](./README.md)
