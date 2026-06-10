# [ADR 0069](0069-dotnet-grpc-service-setup-protobuf-contracts.md): .NET gRPC Service Setup & Protobuf Contracts

## 1. Status
**Status**: Proposed
**Date**: 2026-06-06
**Scope**: Technology Stack — .NET Inter-Service Communication
**Owner**: Evolith Architecture Board
**Satellite origin**: UMS — promoted to corporate baseline after zero UMS-specific dependencies were confirmed

---

## 2. Context

[ADR-0032](../core/0032-api-protocol-decision-matrix-rest-grpc-graphql.md) mandates **gRPC (Protocol Buffers over HTTP/2)** for all internal service-to-service communication. [ADR-0040](../core/0040-multi-runtime-selection-contracts.md) reinforces this by requiring gRPC for synchronous inter-runtime communication between Node.js and .NET.

However, no canonical .NET guidance currently exists for:
- Setting up gRPC server infrastructure within the Evolith hexagonal architecture
- Managing `.proto` file contracts and their generated C# outputs
- Configuring the ASP.NET Core gRPC pipeline with middleware, TLS, and health checks
- Instrumenting gRPC calls with OpenTelemetry tracing

Satellite .NET repositories implement ad-hoc gRPC setups that risk **contract drift**, **inconsistent middleware chaining**, and **telemetry gaps** — especially when gRPC services span bounded contexts (e.g., Identity → Order validation calls).

---

## 3. Decision Drivers

| Driver | Description |
|---|---|
| **Contract Consistency** | .proto files must be the single source of truth; no manual Protobuf editing |
| **Inter-Runtime Interop** | Node.js ↔ .NET communication requires shared contract versioning |
| **Observability Coverage** | gRPC calls must emit Spans with gRPC-specific attributes (method, status, service name) |
| **Security Posture** | All gRPC traffic must use TLS; unauthenticated plaintext gRPC is blocked |
| **Health Probe Readiness** | Kubernetes liveness/readiness probes must function against gRPC services |
| **Canonical Pattern Compliance** | Must fit the hexagonal architecture boundaries defined in [ADR-0002](../nodejs/0002-clean-architecture-nestjs.md) and [ADR-0041](./0041-canonical-dotnet-backend-architecture.md) |

---

## 4. Options Considered

| Option | Summary | Pros | Cons |
|---|---|---|---|
| **Option A — Ad-hoc Grpc.Core channel per service** | Each service creates `GrpcChannel` manually with inline options | Simple for single service | No shared health checks, inconsistent TLS config, no contract centralization |
| **Option B — Grpc.Net.Client with shared `GrpcClientFactory`** | Centralized `IGrpcClientFactory` with typed clients registered via DI | Typed clients, DI-friendly, shared interceptors | No built-in health check integration, requires custom channel management |
| **Option C — Grpc.AspNetCore + `GrpcChannel` via `IHttpClientFactory`** | ASP.NET Core gRPC server + `IHttpClientFactory`-managed client channels with built-in OpenTelemetry | Full ASP.NET Core pipeline, OTel integration, health checks, managed lifetime | Slight learning curve for `IHttpClientFactory` pattern |

---

## 5. Decision

We adopt **Option C** as the canonical .NET gRPC setup.

### A. Canonical Project Structure

All .NET gRPC services MUST follow this structure, aligned with [ADR-0041](./0041-canonical-dotnet-backend-architecture.md):

```
/src
  /Contracts                              # .proto files + generated C# stubs
    /Protos
      /v1
        identity.proto                    # Versioned by major API version
        order.proto
    /Generated
      /V1                                # Generated output, NOT edited manually
        Identity.cs
        Order.cs
  /Domain                                 # Entities, VOs, Domain Events (zero external deps)
  /Application                            # Use Cases, Commands, Queries, Ports (interfaces)
  /Infrastructure                         # gRPC clients, EF Core, external adapters
    /Grpc
      /Clients
        IdentityGrpcClient.cs            # Implements Application port interface
      /Interceptors
        CorrelationInterceptor.cs        # OTel span propagation
        ErrorHandlingInterceptor.cs      # GrpcCore exception mapping
  /Api                                    # Minimal API / gRPC server registration
    /Program.cs
    /GrpcServices
      IdentityService.cs                 # Implements generated gRPC stub
```

### B. Proto File Conventions

| Rule | Enforcement |
|---|---|
| **Centralized contracts** | All `.proto` files live under `/Contracts/Protos`; shared via `Contracts.csproj` referenced by all services |
| **Versioned by major API version** | Directory structure `/Protos/v1/`, `/Protos/v2/`; breaking changes require new version directory |
| **Namespace convention** | `option csharp_namespace = "Evolith.Contracts.V1";` |
| **Package convention** | `option go_package = "evolith/contracts/v1";` |
| **Generated C# not manually edited** | `*.cs` files under `/Generated` are output-only; CI verifies regeneration on `.proto` change |
| **No Protobuf Well-Known Types for domain objects** | Use domain primitives; Well-Known Types (`google.protobuf.Timestamp`) only for infrastructure |
| **Build-time contract validation** | `Protoc` must run successfully in CI before any service build |

### C. Server Setup (ASP.NET Core gRPC)

```csharp
// src/Api/Program.cs

var builder = WebApplication.CreateBuilder(args);

// gRPC server with OpenTelemetry
builder.Services.AddGrpc(options =>
{
    options.EnableDetailedErrors = builder.Environment.IsDevelopment();
    options.Interceptors.Add<CorrelationInterceptor>();
    options.Interceptors.Add<ErrorHandlingInterceptor>();
})
    .AddOpenTelemetry();

// Health checks for Kubernetes probes
builder.Services.AddGrpcHealthChecks()
    .AddCheck("grpc", () => HealthCheckResult.Healthy());

// TLS enforcement
builder.WebHost.ConfigureKestrel(serverOptions =>
{
    serverOptions.ListenAnyIP(5001, listenOptions =>
    {
        listenOptions.UseHttps("/certs/server.crt", "/certs/server.key");
    });
});

var app = builder.Build();

app.MapGrpcService<IdentityService>();
app.MapGrpcHealthChecks();  // /grpc.health.v1.Health check endpoint

app.Run();
```

### D. Client Setup (IHttpClientFactory + GrpcChannel)

```csharp
// src/Infrastructure/Grpc/Clients/IdentityGrpcClient.cs

public sealed class IdentityGrpcClient : IIdentityGrpcClient
{
    private readonly GrpcClientFactory _factory;
    private readonly IRequestContext _ctx;  // ADR-0064 context propagation

    public IdentityGrpcClient(GrpcClientFactory factory, IRequestContext ctx)
    {
        _factory = factory;
        _ctx = ctx;
    }

    public async Task<ValidateUserResponse> ValidateUserAsync(ValidateUserRequest request, CancellationToken ct)
    {
        var channel = _factory.CreateClient<IdentityGrpcClient>("IdentityService");

        var headers = new Metadata();
        headers.Add("X-Correlation-Id", _ctx.CorrelationId ?? "");

        var callOptions = new CallOptions().WithHeaders(headers).WithCancellationToken(ct);

        return await channel.ValidateUserAsync(request, callOptions);
    }
}
```

```csharp
// DI registration in Infrastructure layer
builder.Services.AddHttpClient("IdentityService", options =>
{
    options.BaseAddress = new Uri("https://identity.internal:5001");
})
    .AddGrpcClient<IdentityGrpcClient>();
```

### E. OpenTelemetry Instrumentation

```csharp
// CorrelationInterceptor — propagates W3C Trace Context into gRPC metadata

public class CorrelationInterceptor : Interceptor
{
    private readonly IRequestContext _ctx;

    public override ClientAsyncStreamingMethod<TRequest, TResponse> ClientStreamingMethod<TRequest, TResponse>()
        => base.ClientStreamingMethod<TRequest, TResponse>();

    public override AsyncUnaryCall<TResponse> AsyncUnaryCall<TRequest, TResponse>(
        TRequest request, ClientInterceptorContext<TRequest, TResponse> context, InterceptorSequentialAsyncUnaryCallContinuation<TRequest, TResponse> continuation)
    {
        var metadata = context.Options.Headers ?? new Metadata();
        metadata.Add("traceparent", Activity.Current?.Id ?? "");

        var options = context.Options.WithHeaders(metadata);
        var newContext = new ClientInterceptorContext<TRequest, TResponse>(
            context.Method, context.Host, options, context.CancellationToken);

        return base.AsyncUnaryCall(request, newContext, continuation);
    }
}
```

### F. Health Check Integration

All gRPC services MUST implement the standard `grpc.health.v1.Health` service. The ASP.NET Core `AddGrpcHealthChecks()` auto-registers the default implementation. For custom health logic:

```csharp
public class CustomHealthService : HealthServiceBase
{
    protected override Task<HealthCheckResponse> Check(HealthCheckRequest request, CancellationToken cancellationToken)
    {
        return Task.FromResult(new HealthCheckResponse
        {
            Status = HealthCheckResponse.ServingStatus.Serving
        });
    }
}

// In Program.cs
builder.Services.AddGrpcHealthChecks()
    .AddCheck<CustomHealthService>("custom-service-health");
```

---

## 6. Consequences

### Positive

- **Contract centralization**: All `.proto` files in one `Contracts` library prevent version drift between Node.js and .NET services
- **Observability completeness**: OTel spans capture gRPC method, service name, status code, and duration per call
- **Kubernetes readiness**: `/grpc.health.v1.Health` endpoint enables liveness and readiness probes out of the box
- **TLS by default**: Kestrel HTTPS configuration ensures all gRPC traffic is encrypted in production
- **DI-friendly clients**: `IHttpClientFactory` manages channel lifetime; no manual `GrpcChannel.Dispose()` calls

### Negative / Trade-offs

- **`IHttpClientFactory` complexity**: Teams familiar with raw `GrpcChannel` need onboarding to the factory pattern
- **`*.cs` generation dependency**: Requires `protoc` toolchain in CI; breaking changes must be detected before merge
- **OpenTelemetry gRPC instrumentation lag**: OTel .NET gRPC instrumentation was marked experimental until recently; ensure OTel 1.7+ is used

### Follow-up Actions

| Action | Owner | Due Date |
|---|---|---|
| Promote `Contracts.csproj` as canonical shared library in Evolith SDK | Architect | 2026-06-30 |
| Add `protoc` generation step to `ADR-0005` CI pipeline template | DevOps | 2026-06-30 |
| Create ADR-0072 for .NET OpenTelemetry Configuration (full pipeline) | Architect | 2026-07-15 |

---

## 7. Compliance and Traceability

| Item | Link / Notes |
|---|---|
| Parent PRD | N/A — corporate infrastructure ADR |
| Functional Story | N/A |
| Technical Story | N/A |
| Affected bounded context | Cross-cutting (all .NET bounded contexts using gRPC) |
| Related Evolith ADRs | [ADR-0032](../core/0032-api-protocol-decision-matrix-rest-grpc-graphql.md), [ADR-0040](../core/0040-multi-runtime-selection-contracts.md), [ADR-0064](./0064-dotnet-request-scope-observability-context.md), [ADR-0005](../core/0005-ci-cd-quality-codeql.md) |
| Related External Reference | [gRPC for .NET](https://grpc.io/docs/languages/csharp/), [OTel .NET gRPC instrumentation](https://opentelemetry.io/docs/instrumentation/net/instrumentation-configuration/) |

---

**[Back to .NET ADR Index](./README.md)** | **[ADR Registry](../README.md)**

## Objective and Scope

> Backfill pending — tracked as [GT-20](../../../governance/standards/vision/gap-tracking.md#gt-20) (ADR standardization 2026-06-10).

## Evidence and Evaluation Criteria

> Backfill pending — tracked as [GT-20](../../../governance/standards/vision/gap-tracking.md#gt-20) (ADR standardization 2026-06-10).

## Related Decisions and Standards

> Backfill pending — tracked as [GT-20](../../../governance/standards/vision/gap-tracking.md#gt-20) (ADR standardization 2026-06-10).

## Technology Watch (Trends, Maturity, Adoption, Support)

> Backfill pending — tracked as [GT-20](../../../governance/standards/vision/gap-tracking.md#gt-20) (ADR standardization 2026-06-10).

## Current Sources

> Backfill pending — tracked as [GT-20](../../../governance/standards/vision/gap-tracking.md#gt-20) (ADR standardization 2026-06-10).
