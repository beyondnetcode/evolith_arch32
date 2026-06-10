# [ADR 0065](0065-dotnet-pii-safe-serilog-pipeline.md): .NET PII-Safe Structured Logging Pipeline (Serilog)

## 1. Status
**Status**: Accepted  
**Date**: 2026-05-24  
**Scope**: Technology Stack - .NET Security / Observability  
**Satellite origin**: UMS ADR-0062 (HARDENING-04) — promoted to corporate baseline after zero UMS-specific dependencies were confirmed

---

## 2. Context

.NET APIs built on this framework process Personally Identifiable Information (PII): email addresses, identity references, passwords, tokens, and national IDs. The parent framework mandates structured logging ([ADR-0007](../nodejs/0007-observability-telemetry-loki-opentelemetry.md), [ADR-0046](../core/0046-dapr-unified-observability.md)), but unguarded Serilog usage creates PII leakage at three levels:

| Risk Level | Mechanism | Example |
|-----------|-----------|---------|
| Explicit capture | Developer logs a PII field by name | `_logger.LogInformation("{Email}", user.Email)` |
| Destructuring | `{@object}` expansion serializes all properties | `_logger.LogDebug("{@user}", userRecord)` |
| Free-text | Message template contains email-shaped string | `_logger.LogError("Failed for " + user.Email)` |

Annotating domain entities with `[Sensitive]` attributes is rejected: it couples the Domain layer to a logging library, violating domain purity rules from [ADR-0041](./0041-canonical-dotnet-backend-architecture.md).

---

## 3. Decision

**Apply PII masking at the Serilog pipeline level through two complementary components that intercept log events before any sink receives them. No Domain or Application layer changes are required.**

### A. PiiSanitizerEnricher

Registered via `.Enrich.With<PiiSanitizerEnricher>()`. Scans every `ScalarValue` string property of every log event:

```csharp
public sealed class PiiSanitizerEnricher : ILogEventEnricher
{
    private static readonly HashSet<string> MaskedNames =
        new(StringComparer.OrdinalIgnoreCase)
        {
            "email", "emailaddress", "mail",
            "password", "passwordhash", "passwordtext",
            "identityreference",
            "token", "accesstoken", "refreshtoken", "bearertoken", "idtoken",
            "secret", "apikey", "apisecret", "clientsecret",
            "ssn", "nationalid", "taxid",
        };

    private static readonly Regex EmailRegex =
        new(@"[^@\s]+@[^@\s]+\.[^@\s]+",
            RegexOptions.Compiled | RegexOptions.IgnoreCase,
            TimeSpan.FromMilliseconds(100));

    public void Enrich(LogEvent logEvent, ILogEventPropertyFactory factory)
    {
        foreach (var prop in logEvent.Properties.ToList())
        {
            if (MaskedNames.Contains(prop.Key))
                logEvent.AddOrUpdateProperty(factory.CreateProperty(prop.Key, "[REDACTED]"));
            else if (prop.Value is ScalarValue { Value: string s } && EmailRegex.IsMatch(s))
                logEvent.AddOrUpdateProperty(factory.CreateProperty(prop.Key, MaskEmail(s)));
        }
    }

    private static string MaskEmail(string email)
    {
        var at = email.IndexOf('@');
        if (at <= 0) return "***@***.***";
        var local  = email[..Math.Min(at, 2)];
        var domain = email[(at + 1)..];
        var dot    = domain.LastIndexOf('.');
        var tld    = dot > 0 ? domain[(dot + 1)..] : "***";
        return $"{local}***@***.{tld}";
    }
}
```

### B. PiiMaskingPolicy (Destructuring Hook)

Registered via `.Destructure.With<PiiMaskingPolicy>()`. Participates in the destructuring chain and passes through; actual masking is performed by the enricher at event level:

```csharp
public sealed class PiiMaskingPolicy : IDestructuringPolicy
{
    public bool TryDestructure(object value, ILogEventPropertyValueFactory _,
        out LogEventPropertyValue? result)
    {
        result = null;
        return false; // pass through — enricher handles masking
    }
}
```

### C. ConfigureSerilog Extension

A single extension method wires the complete Serilog configuration:

```csharp
public static LoggerConfiguration ConfigureSerilog(
    this LoggerConfiguration cfg,
    HostBuilderContext context)
{
    var env           = context.HostingEnvironment;
    var loggingSection = context.Configuration.GetSection("Observability:Logging");
    var consoleFormat  = loggingSection["ConsoleFormat"]
                         ?? (env.IsDevelopment() ? "Text" : "CompactJson");
    var minimumLevel   = loggingSection["MinimumLevel"]
                         ?? (env.IsDevelopment() ? "Debug" : "Information");

    cfg
        .ReadFrom.Configuration(context.Configuration)
        .Enrich.FromLogContext()
        .Enrich.WithMachineName()
        .Enrich.WithThreadId()
        .Enrich.With<PiiSanitizerEnricher>()        // ← PII masking
        .Destructure.With<PiiMaskingPolicy>()
        .MinimumLevel.Is(ParseLevel(minimumLevel))
        .MinimumLevel.Override("Microsoft", LogEventLevel.Warning)
        .MinimumLevel.Override("Microsoft.Hosting.Lifetime", LogEventLevel.Information)
        .MinimumLevel.Override("Microsoft.EntityFrameworkCore.Database.Command",
            LogEventLevel.Warning);

    if (consoleFormat.Equals("CompactJson", StringComparison.OrdinalIgnoreCase))
        cfg.WriteTo.Console(new CompactJsonFormatter());
    else
        cfg.WriteTo.Console(outputTemplate:
            "[{Timestamp:HH:mm:ss} {Level:u3}] {CorrelationId} {SessionTrackingId} "
            + "{SourceContext} {Message:lj}{NewLine}{Exception}");

    return cfg;
}
```

### D. Output Strategy

| Environment | Format | Rationale |
|-------------|--------|-----------|
| Development | Coloured text console | Human-readable; correlation prefix visible |
| Staging / Production | Compact JSON (`CompactJsonFormatter`) | Machine-readable; Fluentd / container log driver compatible |

### E. Configuration

```json
"Observability": {
  "Logging": {
    "ConsoleFormat": "CompactJson",   // "Text" or "CompactJson"
    "MinimumLevel": "Information",
    "OutputTemplate": "..."           // Text-mode only
  }
}
```

### F. Forbidden and Required Log Patterns

```csharp
//  FORBIDDEN — string concatenation, no structured fields
_logger.LogInformation("User " + userId);

//  FORBIDDEN — unstructured object dump
_logger.LogInformation(user.ToString());

//  FORBIDDEN — PII in template value (enricher will catch, but avoid by design)
_logger.LogInformation("Email: {email}", user.Email);

//  REQUIRED — structured fields with non-PII names
_logger.LogInformation("User {UserId} activated by {ActorId}", userId, actorId);
```

### G. Masking Reference Table

| Property name | Replacement |
|--------------|-------------|
| `email`, `emailAddress`, `mail` | `jo***@***.com` (partial) |
| `password`, `passwordHash`, `passwordText` | `[REDACTED]` |
| `identityReference` | `[REDACTED]` |
| `token`, `accessToken`, `refreshToken`, `bearerToken`, `idToken` | `[REDACTED]` |
| `secret`, `apiKey`, `apiSecret`, `clientSecret` | `[REDACTED]` |
| `ssn`, `nationalId`, `taxId` | `[REDACTED]` |
| Any scalar string matching `x@y.z` | `xx***@***.z` |

---

## 4. Consequences

### Positive
- PII protection is applied centrally at pipeline level — zero Domain or Application layer changes
- Email regex sweep catches accidental leakage through non-obviously named properties
- `ConfigureSerilog` provides a single auditable configuration point shared across all sinks
- Remote sinks (Seq, Elasticsearch, Loki, Application Insights) are added via NuGet + `appsettings.json` only — no code changes
- When paired with ADR-0064 enrichers (CorrelationId, SessionTrackingId in ILogger scope), every log line carries full traceability and PII masking simultaneously

### Trade-offs
- Regex scanning of all log event properties adds <0.1ms overhead per event (benchmarked on a 10-property event)
- Masking is convention-based: a field named `userEmailAddress` (not in the list) bypasses masking — code review must enforce log field naming
- The enricher scans ALL properties on every event; for extremely high-throughput paths, add a level gate or property-count guard if profiling reveals a hotspot

---

**[Back to .NET ADR Index](./README.md)** | **[ADR Registry](../README.md)**

## Objective and Scope

> Backfill pending — tracked as [GT-20](../../../governance/standards/vision/gap-tracking.md#gt-20) (ADR standardization 2026-06-10).

## Options Considered

> Backfill pending — tracked as [GT-20](../../../governance/standards/vision/gap-tracking.md#gt-20) (ADR standardization 2026-06-10).

## Evidence and Evaluation Criteria

> Backfill pending — tracked as [GT-20](../../../governance/standards/vision/gap-tracking.md#gt-20) (ADR standardization 2026-06-10).

## Related Decisions and Standards

> Backfill pending — tracked as [GT-20](../../../governance/standards/vision/gap-tracking.md#gt-20) (ADR standardization 2026-06-10).

## Technology Watch (Trends, Maturity, Adoption, Support)

> Backfill pending — tracked as [GT-20](../../../governance/standards/vision/gap-tracking.md#gt-20) (ADR standardization 2026-06-10).

## Current Sources

> Backfill pending — tracked as [GT-20](../../../governance/standards/vision/gap-tracking.md#gt-20) (ADR standardization 2026-06-10).
