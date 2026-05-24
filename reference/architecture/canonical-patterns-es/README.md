# Patrones Canónicos

> **Navegación Bilingüe:** [English version](../canonical-patterns/README.md)

Los Patrones Canónicos son implementaciones de referencia listas para usar en producción que demuestran cómo las decisiones de arquitectura arc32 se materializan en código. Cada patrón mapea a uno o más ADRs y puede ser adoptado directamente por repositorios satélite.

---

## Ecosistema .NET (C#)

| CP | Título | Tipo | ADR |
|----|--------|------|-----|
| [CP-01](./dotnet/cp-01-request-scope-context-propagation.md) | Propagación del Contexto de Observabilidad con Scope de Request | Cross-Cutting | ADR-0064 |
| [CP-02](./dotnet/cp-02-pii-safe-serilog-logging.md) | Logging Estructurado Seguro de PII con Serilog | Seguridad / Observabilidad | ADR-0065 |
| [CP-03](./dotnet/cp-03-lightweight-http-idempotency.md) | Middleware de Idempotencia HTTP Ligera | Confiabilidad | ADR-0066 |
| [CP-04](./dotnet/cp-04-aop-logging-decorator.md) | Decorator de Logging AOP con Envelope de Observabilidad | Cross-Cutting | ADR-0064 / ADR-0065 |

---

**[Volver a Arquitectura](../README.md)** | **[Registro ADR](../adrs/README.md)**
