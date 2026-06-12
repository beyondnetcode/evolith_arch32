# [ADR 0072](0072-dotnet-aop-cross-cutting-concern-strategy.md): Estrategia AOP para Preocupaciones Transversales en .NET — DispatchProxy sobre Pipeline Behaviors

## Estado

Aceptado

## Fecha

2026-06-07

## Alcance

Pila tecnológica — Preocupaciones Transversales .NET / AOP

> **Origen en satélite:** Validado originalmente en el satélite UMS (UMS ADR-0060). Promovido a línea base corporativa de Evolith.

---

## Contexto

Los command handlers .NET en arquitecturas basadas en CQRS requieren preocupaciones transversales estructuradas: logging de entrada/salida con duración, rastreo distribuido con etiquetas de tenant, métricas RED y captura de excepciones. Estas preocupaciones deben ser:

1. **Selectivas** — aplicadas por handler o por método, no uniformemente a cada solicitud.
2. **No invasivas** — sin cambios en la lógica de negocio del handler.
3. **Async-correctas** — los hooks se disparan *después* de que el resultado esperado se complete, no cuando se devuelve el objeto `Task`.
4. **Testeables de forma aislada** — los handlers se prueban unitariamente sin infraestructura transversal.

MediatR `IPipelineBehavior<TRequest, TResponse>` ya se usa para preocupaciones de pipeline **uniformes** (validación, idempotencia). La pregunta es si extender ese mecanismo para preocupaciones transversales selectivas o adoptar un modelo diferente.

### Alternativas Evaluadas

| Opción | Mecanismo | ¿Selectivo? | ¿Async-correcto? | ¿Dependencia externa? | Decisión |
|---|---|---|---|---|---|
| A | MediatR `IPipelineBehavior<,>` | Todo o nada por constraint de tipo | Sí | No | Rechazado para preocupaciones selectivas |
| B | Clases decoradoras por handler | Manual por handler | Sí | No | Rechazado — boilerplate O(n) |
| C | Castle.DynamicProxy / interceptores Autofac | Driven por atributos | Sí | Nueva dependencia NuGet | Rechazado — superficie de dependencia externa |
| D | `System.Reflection.DispatchProxy` con cadena de aspectos driven por atributos | Driven por atributos | Sí (tras corrección async) | Librería shell propia | **Adoptado** |

### Por qué `IPipelineBehavior` de MediatR es insuficiente para preocupaciones selectivas

`IPipelineBehavior<TRequest, TResponse>` aplica a cada comando que coincide con su constraint de tipo. Este es el modelo correcto para preocupaciones **uniformes** pero crea un acoplamiento inaceptable para las **selectivas**.

**Resolución:** Los behaviors de MediatR siguen siendo el mecanismo canónico para las preocupaciones de pipeline uniformes. `System.Reflection.DispatchProxy` con una librería de aspectos propia es el mecanismo canónico para la decoración selectiva por método.

---

## Decisión

**Implementar preocupaciones transversales selectivas por método mediante `System.Reflection.DispatchProxy` usando una cadena de ejecución de aspectos driven por atributos.**

### Separación de Responsabilidades

| Preocupación | Mecanismo | Se aplica a |
|---|---|---|
| Validación de entrada | `ValidationBehavior` (MediatR `IPipelineBehavior`) | Todos los comandos uniformemente |
| Idempotencia | `IdempotencyMiddleware` (HTTP — véase [ADR-0066](./0066-dotnet-lightweight-http-idempotency.es.md)) | Todos los endpoints mutantes |
| Logging (selectivo) | `LoggerAspect` vía `DispatchProxy` | Por handler, opt-in mediante `[LoggerAspect]` |
| Rastreo | `TracingAspect` vía `DispatchProxy` | Por handler, opt-in mediante `[Tracing]` |
| Métricas | `MetricsAspect` vía `DispatchProxy` | Por handler, opt-in mediante `[Metrics]` |
| Reintento (selectivo) | `RetryAspect` vía `DispatchProxy` | Por método, opt-in mediante `[RetryAspect]` |

### Corrección del Proxy Asíncrono — Prerrequisito Obligatorio

`System.Reflection.DispatchProxy.Invoke` es síncrono. Sin manejo async explícito, los hooks `OnSuccess` y `OnExit` se disparan cuando se **devuelve** un `Task` (antes de la completión), no después. Las implementaciones satélite deben:

- Tras `joinPoint.Proceed()`, detectar tipos de retorno `Task` / `Task<TResult>` y envolverlos en tareas de continuación.
- Usar `ConfigureAwait(false)` en la continuación.
- Omitir el bloque síncrono `finally { OnExit() }` para las rutas async para prevenir el doble disparo.

### Patrón de Registro en DI

```csharp
// El registro del proxy debe ir DESPUÉS del registro de MediatR
// para que el proxy gane la resolución DI de último-registro-gana
services.AddMediatR(cfg => cfg.RegisterServicesFromAssembly(assembly));
services.AddAop();
services.AddAopProxy<IRequestHandler<CreateCommand, Result<Response>>, CreateCommandHandler>();
```

### Restricciones

- `DispatchProxy` requiere que el servicio se registre como **interfaz** (o clase abstracta). No se admite el proxy de clase concreta.
- Los proxies con scope Singleton están prohibidos. Los aspectos pueden resolver servicios scoped (p. ej., `IRequestContext`); registrar el proxy como singleton crearía una dependencia cautiva.
- El registro del proxy debe seguir al registro de MediatR (último-registro-gana).
- El orden de aspectos (cuando se aplican múltiples) debe ser explícito: Tracing(10) → Logging(50) → Metrics(60).

### Política de PII para Aspectos de Logging

| Logger | Valores de argumentos registrados | Cuándo usar |
|---|---|---|
| Logger respaldado por MEL | Nunca — solo nombres de método y tipos | Por defecto; todos los handlers |
| Logger de desestructuración Serilog | Desestructurado (opt-in) | Solo tras revisión y aprobación explícita de PII |

`LogArguments = []` (array vacío) es el valor por defecto seguro contra PII y debe establecerse en todos los handlers a menos que un argumento específico haya sido revisado y aprobado.

---

## Consecuencias

### Positivas

- Los handlers permanecen como lógica de negocio pura — sin importaciones de logging o telemetría en el código de la capa Application.
- Las preocupaciones transversales se aplican de forma selectiva sin modificar el pipeline de MediatR para todos los handlers.
- La decoración por atributos (`[LoggerAspect]`, `[Tracing]`) hace que las preocupaciones sean visibles y buscables en la revisión de código.
- Los hooks async-correctos se disparan tras la completión real, no tras la creación del objeto `Task` — los logs y métricas son precisos.
- El mismo mecanismo de proxy aplica a cualquier interfaz registrada en DI: repositorios, servicios de dominio y adaptadores de pasarela externos pueden decorarse con el mismo patrón.

### Concesiones

- `DispatchProxy` requiere registro basado en interfaz — no se admite el proxy de clase concreta.
- El envoltorio de continuación async añade un pequeño overhead de asignación por llamada de método async (~1 asignación).
- El escaneo de ensamblados de MediatR registra los handlers antes de `AddAopProxy<>` — el orden de registro del proxy debe ser explícito.

### Decisiones No Tomadas

- **Tejido en tiempo de compilación** (PostSharp, Fody) no fue evaluado. La complejidad de build añadida no está justificada a la escala habitual de un satélite.
- **Castle.DynamicProxy / interceptores Autofac** siguen disponibles como alternativas futuras si la restricción de interfaz de `DispatchProxy` resulta limitante.

---

## Referencias

- [ADR-0041: Arquitectura Canónica de Backend .NET](./0041-canonical-dotnet-backend-architecture.es.md)
- [ADR-0064: Contexto de Observabilidad de Scope de Solicitud .NET](./0064-dotnet-request-scope-observability-context.es.md)
- [ADR-0065: Pipeline Serilog Seguro contra PII .NET](./0065-dotnet-pii-safe-serilog-pipeline.es.md)
- [ADR-0066: Idempotencia HTTP Ligera .NET](./0066-dotnet-lightweight-http-idempotency.es.md)





## Evidencias y Criterios de Evaluación

> Backfill pendiente — trazado como [GT-20](../../../governance/standards/vision/gap-reference-catalog.es.md#gt-20) (estandarización de ADRs 2026-06-10).

## Decisiones y Estándares Relacionados

> Backfill pendiente — trazado como [GT-20](../../../governance/standards/vision/gap-reference-catalog.es.md#gt-20) (estandarización de ADRs 2026-06-10).

## Vigilancia Tecnológica (Tendencias, Madurez, Adopción, Soporte)

> Backfill pendiente — trazado como [GT-20](../../../governance/standards/vision/gap-reference-catalog.es.md#gt-20) (estandarización de ADRs 2026-06-10).

## Fuentes Actuales

> Backfill pendiente — trazado como [GT-20](../../../governance/standards/vision/gap-reference-catalog.es.md#gt-20) (estandarización de ADRs 2026-06-10).

---
[Volver al Índice](./README.es.md)
