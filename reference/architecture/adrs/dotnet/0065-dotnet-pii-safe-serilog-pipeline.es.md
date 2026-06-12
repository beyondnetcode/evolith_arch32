# [ADR 0065](0065-dotnet-pii-safe-serilog-pipeline.md): Pipeline de Logging Estructurado Seguro de PII en .NET (Serilog)

## 1. Estado
**Estado**: Aceptado  
**Fecha**: 2026-05-24  
**Alcance**: Stack Tecnológico - Seguridad / Observabilidad .NET  
**Origen satélite**: UMS ADR-0062 (HARDENING-04) — promovido a baseline corporativo tras confirmar cero dependencias específicas de UMS

---

## 2. Contexto

Las APIs .NET construidas sobre este framework procesan Información de Identificación Personal (PII): direcciones de correo electrónico, referencias de identidad, contraseñas, tokens e IDs nacionales. El framework corporativo exige logging estructurado, pero el uso de Serilog sin protección crea riesgo de filtrado de PII en tres niveles:

| Nivel de Riesgo | Mecanismo | Ejemplo |
|----------------|-----------|---------|
| Captura explícita | El desarrollador registra un campo PII por nombre | `_logger.LogInformation("{Email}", user.Email)` |
| Destructuring | `{@object}` serializa todas las propiedades | `_logger.LogDebug("{@user}", userRecord)` |
| Texto libre | El template del mensaje contiene una cadena con forma de email | `_logger.LogError("Failed for " + user.Email)` |

Anotar entidades de dominio con atributos `[Sensitive]` está rechazado: acopla la capa de Dominio a una librería de logging, violando las reglas de pureza del dominio.

---

## 3. Decisión

**Aplicar enmascaramiento de PII a nivel del pipeline de Serilog mediante dos componentes complementarios que interceptan eventos de log antes de que cualquier sink los reciba. No se requieren cambios en las capas de Dominio o Aplicación.**

### A. PiiSanitizerEnricher

Registrado vía `.Enrich.With<PiiSanitizerEnricher>()`. Escanea cada propiedad `ScalarValue` de tipo cadena en cada evento de log. Lista de nombres enmascarados (insensible a mayúsculas): `email`, `emailaddress`, `mail`, `password`, `passwordhash`, `token`, `accesstoken`, `refreshtoken`, `bearertoken`, `idtoken`, `secret`, `apikey`, `clientsecret`, `ssn`, `nationalid`, `taxid`, `identityreference`. Barrido adicional por regex para cadenas con forma de email en cualquier propiedad.

### B. PiiMaskingPolicy

Registrado vía `.Destructure.With<PiiMaskingPolicy>()`. Participa en la cadena de destructuring y pasa; el enmascaramiento real lo ejecuta el enricher a nivel de evento.

### C. Extensión ConfigureSerilog

```csharp
builder.Host.UseSerilog((ctx, cfg) => cfg.ConfigureSerilog(ctx));
```

**Estrategia de salida:**

| Entorno | Formato | Justificación |
|---------|---------|---------------|
| Development | Consola texto coloreado | Legible por humanos |
| Staging/Production | JSON compacto | Legible por máquinas; compatible con Fluentd / drivers de log de contenedor |

**Enrichers siempre aplicados:** `FromLogContext()`, `WithMachineName()`, `WithThreadId()`, `PiiSanitizerEnricher`.

### D. Tabla de Referencia de Enmascaramiento

| Patrón de nombre de propiedad | Reemplazo |
|------------------------------|-----------|
| `email`, `emailAddress`, `mail` | `jo***@***.com` (parcial) |
| `password`, `passwordHash`, etc. | `[REDACTED]` |
| `token`, `accessToken`, etc. | `[REDACTED]` |
| `secret`, `apiKey`, etc. | `[REDACTED]` |
| `ssn`, `nationalId`, `taxId` | `[REDACTED]` |
| Cualquier escalar que coincida con `x@y.z` | `xx***@***.z` |

### E. Configuración

```json
"Observability": {
  "Logging": {
    "ConsoleFormat": "CompactJson",   // "Text" or "CompactJson"
    "MinimumLevel": "Information",
    "OutputTemplate": "..."           // Solo para modo texto
  }
}
```

### F. Patrones de Log Prohibidos y Requeridos

```csharp
//  PROHIBIDO — concatenación de strings, sin campos estructurados
_logger.LogInformation("User " + userId);

//  PROHIBIDO — volcado de objeto no estructurado
_logger.LogInformation(user.ToString());

//  PROHIBIDO — PII en valor del template (el enricher lo capturará, pero evitarlo por diseño)
_logger.LogInformation("Email: {email}", user.Email);

//  REQUERIDO — campos estructurados con nombres sin PII
_logger.LogInformation("User {UserId} activated by {ActorId}", userId, actorId);
```

### G. Tabla de Referencia de Enmascaramiento

| Nombre de propiedad | Reemplazo |
|---------------------|-----------|
| `email`, `emailAddress`, `mail` | `jo***@***.com` (parcial) |
| `password`, `passwordHash`, `passwordText` | `[REDACTED]` |
| `identityReference` | `[REDACTED]` |
| `token`, `accessToken`, `refreshToken`, `bearerToken`, `idToken` | `[REDACTED]` |
| `secret`, `apiKey`, `apiSecret`, `clientSecret` | `[REDACTED]` |
| `ssn`, `nationalId`, `taxId` | `[REDACTED]` |
| Cualquier escalar string que coincida con `x@y.z` | `xx***@***.z` |

---

## 4. Consecuencias

### Positivas
- Protección de PII centralizada a nivel del pipeline — cero cambios en Dominio o Aplicación
- El barrido por regex de email captura filtraciones accidentales a través de propiedades con nombres no obvios
- `ConfigureSerilog` es el único punto de configuración auditable; todos los sinks reciben eventos enmascarados
- Los sinks remotos se añaden vía NuGet + `appsettings.json` — sin cambios en el código
- Combinado con los enrichers del ADR-0064, cada línea de log lleva trazabilidad completa y enmascaramiento de PII simultáneamente

### Compromisos
- El escaneo por regex agrega <0.1ms de overhead por evento
- El enmascaramiento es basado en convención — un campo PII con nombre no estándar elude el enmascaramiento; la revisión de código debe cubrir el nombrado de campos de log

---

**[Volver al Índice ADR .NET](./README.es.md)** | **[Registro ADR](../README.es.md)**

## Objetivo y Alcance

Backfill histórico: Abordar la tensión arquitectónica donde context is unavailable, estableciendo un límite estándar.

## Opciones Consideradas

- **Seleccionada:** Pipeline de Logging Estructurado Seguro de PII en .NET (Serilog)
- **Otras:** Desconocido (el registro histórico no enumera explícitamente alternativas rechazadas).

## Evidencias y Criterios de Evaluación

Desconocido (registro histórico; evaluado contra principios generales de arquitectura como mantenibilidad y confiabilidad).

## Decisiones y Estándares Relacionados

Ninguna explícitamente enlazada.

## Vigilancia Tecnológica (Tendencias, Madurez, Adopción, Soporte)

> Backfill pendiente — trazado como [GT-20](../../../governance/standards/vision/gap-reference-catalog.es.md#gt-20) (estandarización de ADRs 2026-06-10).

## Fuentes Actuales

Desconocido (registro histórico).
