# CP-02: Logging Estructurado Seguro de PII con Serilog

**Tipo:** Patrón Canónico — .NET (C#)  
**Estado:** Aceptado  
**ADR relacionado:** [ADR-0065: Pipeline de Logging Seguro de PII en .NET](../../adrs/dotnet/0065-dotnet-pii-safe-serilog-pipeline.es.md)

---

## Problema

El logging estructurado con Serilog arriesga filtrar PII (email, token, contraseña, ID nacional) a través de: captura explícita de campos PII, destructuring `{@object}` que expande propiedades de clases de dominio, y cadenas de texto libre con formato de email. La capa de Dominio debe permanecer libre de anotaciones de librería de logging.

---

## Patrón

Aplicar el enmascaramiento de PII a nivel del pipeline de Serilog mediante dos componentes complementarios que se ejecutan antes de que cualquier sink reciba el evento de log.

```
Código de aplicación                Serilog pipeline
──────────────────                  ─────────────────────────────────────
_logger.LogXxx(...)   ──────────►  Destructure.With<PiiMaskingPolicy>()
                                     │
                                     ▼
                                   Enrich.With<PiiSanitizerEnricher>()
                                     │  – enmascara por nombre de propiedad
                                     │  – enmascara por regex de email
                                     ▼
                                   WriteTo.Console / WriteTo.* (PII depurado)
```

---

## Componentes

### 1. PiiSanitizerEnricher

Registrado vía `.Enrich.With<PiiSanitizerEnricher>()`. Ver código completo en [CP-02 EN](./cp-02-pii-safe-serilog-logging.md).

Nombres de propiedad enmascarados (insensible a mayúsculas): `email`, `emailaddress`, `mail`, `password`, `passwordhash`, `token`, `accesstoken`, `refreshtoken`, `bearertoken`, `idtoken`, `secret`, `apikey`, `clientsecret`, `ssn`, `nationalid`, `taxid`, `identityreference`.

Barrido adicional por regex: cualquier escalar de tipo cadena que coincida con `[^@\s]+@[^@\s]+\.[^@\s]+` se enmascara parcialmente.

### 2. PiiMaskingPolicy

Registrado vía `.Destructure.With<PiiMaskingPolicy>()`. Participa en la cadena de destructuring; el enmascaramiento real lo ejecuta el enricher.

### 3. Extensión ConfigureSerilog

```csharp
builder.Host.UseSerilog((ctx, cfg) => cfg.ConfigureSerilog(ctx));
```

**Enrichers siempre aplicados:** `FromLogContext()`, `WithMachineName()`, `WithThreadId()`, `PiiSanitizerEnricher`.

**Formato de salida:** texto coloreado en Development, JSON compacto en Staging/Production.

### 4. Program.cs Wiring

```csharp
builder.Host.UseSerilog((ctx, cfg) => cfg.ConfigureSerilog(ctx));
```

---

## Configuración

```json
"Observability": {
  "Logging": {
    "ConsoleFormat": "CompactJson",    // "Text" (dev) o "CompactJson" (prod)
    "MinimumLevel":  "Information"
  }
}
```

Sinks remotos (Seq, Loki, Elasticsearch, Application Insights):
- Añadir el NuGet del sink al proyecto Presentation
- Añadir la configuración del sink bajo la sección `"Serilog"` en `appsettings.json`
- Ningún cambio de código requerido

---

## Referencia de Enmascaramiento

| Patrón de nombre | Reemplazo |
|-----------------|-----------|
| `email`, `emailAddress`, `mail` | `jo***@***.com` |
| `password`, `passwordHash`, etc. | `[REDACTED]` |
| `token`, `accessToken`, etc. | `[REDACTED]` |
| `secret`, `apiKey`, etc. | `[REDACTED]` |
| `ssn`, `nationalId`, `taxId` | `[REDACTED]` |
| Cualquier escalar que coincida con `x@y.z` | `xx***@***.z` |

---

## Patrones Prohibidos / Requeridos

```csharp
//  PROHIBIDO
_logger.LogInformation("User " + userId);
_logger.LogInformation(user.ToString());
_logger.LogInformation("Email: {email}", user.Email);

//  REQUERIDO
_logger.LogInformation("User {UserId} created by {ActorId}", userId, actorId);
```

---

## Patrones Relacionados

- [CP-01: Propagación del Contexto](./cp-01-request-scope-context-propagation.es.md)
- [CP-04: Decorator de Logging AOP](./cp-04-aop-logging-decorator.es.md)
- [ADR-0065](../../adrs/dotnet/0065-dotnet-pii-safe-serilog-pipeline.es.md)
