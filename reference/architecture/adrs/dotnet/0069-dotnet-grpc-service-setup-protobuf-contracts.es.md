# [ADR 0069](0069-dotnet-grpc-service-setup-protobuf-contracts.es.md): Configuración de Servicios gRPC en .NET y Contratos Protobuf

## 1. Estado
**Estado**: Propuesto
**Fecha**: 2026-06-06
**Alcance**: Stack de Tecnología — Comunicación Inter-Servicio en .NET
**Owner**: Architecture Board de Evolith
**Origen satélite**: UMS — promovido a baseline corporativo tras confirmar cero dependencias específicas de producto

---

## 2. Contexto

[ADR-0032](../core/0032-api-protocol-decision-matrix-rest-grpc-graphql.md) mandates **gRPC (Protocol Buffers over HTTP/2)** para toda comunicación interna servicio-a-servicio. [ADR-0040](../core/0040-multi-runtime-selection-contracts.md) refuerza esto requiriendo gRPC para comunicación síncrona entre runtime (Node.js ↔ .NET).

Sin embargo, actualmente no existe guía canónica en .NET para:
- Configurar infraestructura de servidor gRPC dentro de la arquitectura hexagonal Evolith
- Gestionar archivos `.proto` y sus salidas C# generadas
- Configurar el pipeline gRPC de ASP.NET Core con middleware, TLS y health checks
- Instrumentar llamadas gRPC con trazabilidad OpenTelemetry

Los repositorios satélite .NET implementan configuraciones gRPC ad-hoc que arriesgan **drift de contratos**, **encadenamiento inconsistente de middleware** y **brechas de telemetría** — especialmente cuando servicios gRPC abarcan bounded contexts (ej., validación Identity → Order).

---

## 3. Factores de Decisión

| Factor | Descripción |
|---|---|
| **Consistencia de Contratos** | Archivos .proto deben ser la única fuente de verdad; sin edición manual de Protobuf |
| **Interoperabilidad Inter-Runtime** | Comunicación Node.js ↔ .NET requiere versionado compartido de contratos |
| **Cobertura de Observabilidad** | Llamadas gRPC deben emitir Spans con atributos gRPC-específicos (método, estado, nombre servicio) |
| **Postura de Seguridad** | Todo tráfico gRPC debe usar TLS; gRPC plaintext no autenticado está bloqueado |
| **Readiness de Health Probes** | Kubernetes liveness/readiness probes deben funcionar contra servicios gRPC |
| **Cumplimiento de Patrones Canónicos** | Debe encajar en los límites de arquitectura hexagonal definidos en [ADR-0002](../nodejs/0002-clean-architecture-nestjs.md) y [ADR-0041](./0041-canonical-dotnet-backend-architecture.md) |

---

## 4. Opciones Consideradas

| Opción | Resumen | Pros | Contras |
|---|---|---|---|
| **Opción A — Grpc.Core channel ad-hoc por servicio** | Cada servicio crea `GrpcChannel` manualmente con opciones inline | Simple para servicio único | Sin health checks compartidos, configuración TLS inconsistente, sin centralización de contratos |
| **Opción B — Grpc.Net.Client con `GrpcClientFactory` compartido** | `IGrpcClientFactory` centralizado con clientes tipados registrados via DI | Clientes tipados, friendly-DI, interceptores compartidos | Sin integración built-in de health check, requiere gestión custom de canales |
| **Opción C — Grpc.AspNetCore + `GrpcChannel` via `IHttpClientFactory`** | Servidor gRPC ASP.NET Core + canales cliente gestionados por `IHttpClientFactory` con OTel integrado | Pipeline ASP.NET Core completo, integración OTel, health checks, lifetime gestionado | Curva de aprendizaje leve para el patrón `IHttpClientFactory` |

---

## 5. Decisión

Adoptamos **Opción C** como la configuración canónica gRPC para .NET.

### A. Estructura Canónica de Proyecto

Todos los servicios gRPC .NET DEBEN seguir esta estructura, alineada con [ADR-0041](./0041-canonical-dotnet-backend-architecture.md):

```
/src
  /Contracts                              # Archivos .proto + stubs C# generados
    /Protos
      /v1
        identity.proto                    # Versionado por versión API mayor
        order.proto
    /Generated
      /V1                                # Salida generada, NO editada manualmente
        Identity.cs
        Order.cs
  /Domain                                 # Entities, VOs, Domain Events (cero deps externos)
  /Application                            # Use Cases, Commands, Queries, Ports (interfaces)
  /Infrastructure                         # Clientes gRPC, EF Core, adaptadores externos
    /Grpc
      /Clients
        IdentityGrpcClient.cs            # Implementa interfaz del puerto Application
      /Interceptors
        CorrelationInterceptor.cs        # Propagación de span OTel
        ErrorHandlingInterceptor.cs      # Mapeo de excepciones GrpcCore
  /Api                                    # Minimal API / registro de servidor gRPC
    /Program.cs
    /GrpcServices
      IdentityService.cs                 # Implementa stub gRPC generado
```

### B. Convenciones de Archivo Proto

| Regla | Aplicación |
|---|---|
| **Contratos centralizados** | Todos los archivos `.proto` viven bajo `/Contracts/Protos`; compartidos via `Contracts.csproj` referenciado por todos los servicios |
| **Versionado por versión API mayor** | Estructura de directorios `/Protos/v1/`, `/Protos/v2/`; cambios breaking requieren nuevo directorio de versión |
| **Convención namespace** | `option csharp_namespace = "Evolith.Contracts.V1";` |
| **Convención package** | `option go_package = "evolith/contracts/v1";` |
| **C# generado NO editada manualmente** | Archivos `*.cs` bajo `/Generated` son solo salida; CI verifica regeneración ante cambio en `.proto` |
| **Sin Well-Known Types de Protobuf para objetos de dominio** | Usar primitivas de dominio; Well-Known Types (`google.protobuf.Timestamp`) solo para infraestructura |
| **Validación de contratos en build-time** | `Protoc` debe ejecutarse exitosamente en CI antes de cualquier build de servicio |

### C. Configuración del Servidor (ASP.NET Core gRPC)

```csharp
// src/Api/Program.cs

var builder = WebApplication.CreateBuilder(args);

// Servidor gRPC con OpenTelemetry
builder.Services.AddGrpc(options =>
{
    options.EnableDetailedErrors = builder.Environment.IsDevelopment();
    options.Interceptors.Add<CorrelationInterceptor>();
    options.Interceptors.Add<ErrorHandlingInterceptor>();
})
    .AddOpenTelemetry();

// Health checks para probes de Kubernetes
builder.Services.AddGrpcHealthChecks()
    .AddCheck("grpc", () => HealthCheckResult.Healthy());

// Aplicación TLS
builder.WebHost.ConfigureKestrel(serverOptions =>
{
    serverOptions.ListenAnyIP(5001, listenOptions =>
    {
        listenOptions.UseHttps("/certs/server.crt", "/certs/server.key");
    });
});

var app = builder.Build();

app.MapGrpcService<IdentityService>();
app.MapGrpcHealthChecks();  // Endpoint /grpc.health.v1.Health check

app.Run();
```

### D. Configuración del Cliente (IHttpClientFactory + GrpcChannel)

```csharp
// src/Infrastructure/Grpc/Clients/IdentityGrpcClient.cs

public sealed class IdentityGrpcClient : IIdentityGrpcClient
{
    private readonly GrpcClientFactory _factory;
    private readonly IRequestContext _ctx;  // Propagación de contexto ADR-0064

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
// Registro DI en capa Infrastructure
builder.Services.AddHttpClient("IdentityService", options =>
{
    options.BaseAddress = new Uri("https://identity.internal:5001");
})
    .AddGrpcClient<IdentityGrpcClient>();
```

### E. Instrumentación OpenTelemetry

```csharp
// CorrelationInterceptor — propaga W3C Trace Context en metadata gRPC

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

### F. Integración de Health Check

Todos los servicios gRPC DEBEN implementar el servicio estándar `grpc.health.v1.Health`. El `AddGrpcHealthChecks()` de ASP.NET Core registra la implementación por defecto automáticamente. Para lógica de health custom:

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

// En Program.cs
builder.Services.AddGrpcHealthChecks()
    .AddCheck<CustomHealthService>("custom-service-health");
```

---

## 6. Consecuencias

### Positivas

- **Centralización de contratos**: Todos los archivos `.proto` en una librería `Contracts` compartida previene drift de versión entre servicios Node.js y .NET
- **Completitud de observabilidad**: Spans OTel capturan método gRPC, nombre de servicio, código de estado y duración por llamada
- **Readiness para Kubernetes**: Endpoint `/grpc.health.v1.Health` habilita probes liveness y readiness out-of-the-box
- **TLS por defecto**: Configuración HTTPS de Kestrel asegura que todo el tráfico gRPC esté encriptado en producción
- **Clientes DI-friendly**: `IHttpClientFactory` gestiona lifetime del canal; sin llamadas manuales a `GrpcChannel.Dispose()`

### Negativas / Trade-offs

- **Complejidad de `IHttpClientFactory`**: Equipos familiarizados con `GrpcChannel` raw necesitan onboarding al patrón factory
- **Dependencia de generación de `*.cs`**: Requiere toolchain `protoc` en CI; cambios breaking deben detectarse antes del merge
- **Lagged de instrumentación gRPC OTel**: La instrumentación gRPC de OTel .NET fue marcada experimental hasta recientemente; asegurar OTel 1.7+ se usa

### Acciones de Seguimiento

| Acción | Owner | Fecha Límite |
|---|---|---|
| Promover `Contracts.csproj` como librería compartida canónica en Evolith SDK | Arquitecto | 2026-06-30 |
| Agregar paso de generación `protoc` a la plantilla CI de `ADR-0005` | DevOps | 2026-06-30 |
| Crear ADR-0072 para Configuración OpenTelemetry en .NET (pipeline completo) | Arquitecto | 2026-07-15 |

---

## 7. Cumplimiento y Trazabilidad

| Item | Enlace / Notas |
|---|---|
| PRD padre | N/A — ADR de infraestructura corporativa |
| Functional Story | N/A |
| Technical Story | N/A |
| Bounded context afectado | Cross-cutting (todos los contextos .NET usando gRPC) |
| ADRs Evolith relacionados | [ADR-0032](../core/0032-api-protocol-decision-matrix-rest-grpc-graphql.md), [ADR-0040](../core/0040-multi-runtime-selection-contracts.md), [ADR-0064](./0064-dotnet-request-scope-observability-context.md), [ADR-0005](../core/0005-ci-cd-quality-codeql.md) |
| Referencia Externa Relacionada | [gRPC para .NET](https://grpc.io/docs/languages/csharp/), [Instrumentación OTel gRPC .NET](https://opentelemetry.io/docs/instrumentation/net/instrumentation-configuration/) |

---

**[Volver al Índice ADR .NET](./README.md)** | **[Registro ADR](../README.md)**

## Objetivo y Alcance

> Backfill pendiente — trazado como [GT-20](../../../governance/standards/vision/gap-tracking.es.md#gt-20) (estandarización de ADRs 2026-06-10).

## Evidencias y Criterios de Evaluación

> Backfill pendiente — trazado como [GT-20](../../../governance/standards/vision/gap-tracking.es.md#gt-20) (estandarización de ADRs 2026-06-10).

## Decisiones y Estándares Relacionados

> Backfill pendiente — trazado como [GT-20](../../../governance/standards/vision/gap-tracking.es.md#gt-20) (estandarización de ADRs 2026-06-10).

## Vigilancia Tecnológica (Tendencias, Madurez, Adopción, Soporte)

> Backfill pendiente — trazado como [GT-20](../../../governance/standards/vision/gap-tracking.es.md#gt-20) (estandarización de ADRs 2026-06-10).

## Fuentes Actuales

> Backfill pendiente — trazado como [GT-20](../../../governance/standards/vision/gap-tracking.es.md#gt-20) (estandarización de ADRs 2026-06-10).
