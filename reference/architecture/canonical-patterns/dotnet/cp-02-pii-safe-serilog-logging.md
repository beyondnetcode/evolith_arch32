# CP-02: PII-Safe Structured Logging with Serilog

**Type:** Canonical Pattern — .NET (C#)  
**Status:** Accepted  
**Related ADR:** [ADR-0065: .NET PII-Safe Structured Logging Pipeline](../../adrs/dotnet/0065-dotnet-pii-safe-serilog-pipeline.md)

---

## Problem

Serilog structured logging risks leaking PII (email, token, password, national ID) through:
1. Developers explicitly logging PII field values by name
2. `{@object}` destructuring expanding domain objects that contain PII properties
3. Free-text string values containing email-shaped content

The Domain layer must remain free of any logging-library annotation.

---

## Pattern

Apply PII masking at the Serilog pipeline level through two complementary components that run before any sink receives the log event.

```
Application code                    Serilog pipeline
──────────────────                  ─────────────────────────────────────
_logger.LogXxx(...)   ──────────►  Destructure.With<PiiMaskingPolicy>()
                                     │
                                     ▼
                                   Enrich.With<PiiSanitizerEnricher>()
                                     │  – mask by property name (list)
                                     │  – mask by email regex (free-text)
                                     ▼
                                   WriteTo.Console / WriteTo.* (PII scrubbed)
```

---

## Components

### 1. PiiSanitizerEnricher

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

### 2. PiiMaskingPolicy

```csharp
public sealed class PiiMaskingPolicy : IDestructuringPolicy
{
    public bool TryDestructure(object value, ILogEventPropertyValueFactory _,
        out LogEventPropertyValue? result)
    {
        result = null;
        return false; // enricher handles masking at event level
    }
}
```

### 3. ConfigureSerilog Extension

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
        .Enrich.FromLogContext()           // picks up ILogger scopes (CorrelationId etc.)
        .Enrich.WithMachineName()
        .Enrich.WithThreadId()
        .Enrich.With<PiiSanitizerEnricher>()
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

### 4. Program.cs Wiring

```csharp
builder.Host.UseSerilog((ctx, cfg) => cfg.ConfigureSerilog(ctx));
```

---

## Configuration

```json
"Observability": {
  "Logging": {
    "ConsoleFormat": "CompactJson",    // "Text" (dev) or "CompactJson" (prod)
    "MinimumLevel":  "Information"
  }
}
```

Remote sinks (Seq, Loki, Elasticsearch, Application Insights):
- Add sink NuGet package to Presentation
- Add sink config under `"Serilog"` section in `appsettings.json`
- No code change required

---

## Masking Reference

| Pattern | Result |
|---------|--------|
| `email`, `emailAddress`, `mail` | `jo***@***.com` |
| `password`, `passwordHash`, etc. | `[REDACTED]` |
| `token`, `accessToken`, etc. | `[REDACTED]` |
| `secret`, `apiKey`, etc. | `[REDACTED]` |
| `ssn`, `nationalId`, `taxId` | `[REDACTED]` |
| Any scalar matching `x@y.z` | `xx***@***.z` |

---

## Forbidden / Required Patterns

```csharp
// ✗ string concatenation
_logger.LogInformation("User " + userId);

// ✗ unstructured object dump
_logger.LogInformation(user.ToString());

// ✗ PII in template (enricher catches it — but avoid by design)
_logger.LogInformation("Email: {email}", user.Email);

// ✓ structured fields with non-PII names
_logger.LogInformation("User {UserId} created by {ActorId}", userId, actorId);
```

---

## Related Patterns

- [CP-01: Request-Scope Context Propagation](./cp-01-request-scope-context-propagation.md) — enriches log lines with CorrelationId and SessionTrackingId
- [CP-04: AOP Logging Decorator](./cp-04-aop-logging-decorator.md) — uses this pattern for entry/exit/exception logs
- [ADR-0065](../../adrs/dotnet/0065-dotnet-pii-safe-serilog-pipeline.md)
