# ADR 0071: Estrategia de Clases Base e Herencia en la Capa de Dominio

## Estado

Aceptado

## Fecha

2026-06-07

## Alcance

Universal — Capa de Dominio .NET (todos los satélites de Evolith que usan DDD con C#)

> **Origen en satélite:** Validado originalmente en el satélite UMS (UMS ADR-0069). Promovido a línea base corporativa de Evolith como registro de gobernanza y concesiones.

---

## Contexto

Los satélites .NET basados en Evolith implementan Diseño Orientado al Dominio usando clases base para `AggregateRoot<T>` y `Entity<T>` proporcionadas por una librería de núcleo compartido (`BeyondNetCode.Shell.Ddd`). Este núcleo compartido trae una dependencia transitiva de MediatR a través de la librería shell.

La regla R-10 de la metodología BMAD establece: "El Dominio debe ser POCOs puros con cero referencias NuGet." Esto crea una tensión arquitectónica:

- El cumplimiento estricto de R-10 requiere eliminar todas las dependencias transitivas de la capa de Dominio.
- El uso pragmático del núcleo compartido permite a los equipos centrarse en la lógica de negocio en lugar de en el boilerplate de infraestructura, con MediatR contenido dentro de la librería shell y no referenciado directamente por el código de Dominio.

Existen tres opciones de implementación:

| Opción | Descripción |
|---|---|
| A — Continuar con la Herencia Shell | El Dominio hereda `AggregateRoot<T>` / `Entity<T>` de `Shell.Ddd`. Dependencia transitiva de MediatR presente pero no invocada por el código de Dominio. |
| B — Refactorización a Composición | Eliminar la herencia shell por completo. El Dominio usa POCOs puros sin clase base. Requiere refactorización O(n) en todos los agregados. |
| C — Capa Domain.Abstractions | Crear un proyecto `Domain.Abstractions` con interfaces puras (`IAggregateRoot<T>`, `IEntity<T>`, `IDomainEvents`). Shell implementa las interfaces. El Dominio solo referencia las abstracciones (cero dependencias NuGet). |

---

## Decisión

**Los satélites de Evolith pueden adoptar la Opción A (herencia shell actual) como una concesión pragmática controlada y documentada, sujeta a las restricciones siguientes.**

La Opción C (Domain.Abstractions) es la **ruta de evolución recomendada** y debe adoptarse cuando la portabilidad, la publicación independiente del dominio o la pureza estricta del dominio se convierta en un requisito del producto.

La Opción B (refactorización completa a composición) no se recomienda para bases de código existentes debido al coste y al riesgo.

### Restricciones para el Uso de la Opción A

1. **El código de Dominio no debe invocar MediatR directamente.** La dependencia transitiva es aceptable solo porque el Dominio no usa las APIs de MediatR. Los agregados de Dominio usan la infraestructura de la clase base (ID, colección de eventos de dominio, reglas rotas) — no importan ni llaman a ninguna interfaz de MediatR.
2. **Shell.Ddd debe tener una garantía de estabilidad explícita.** El núcleo compartido debe seguir una política de versionado para que los cambios disruptivos no se propaguen a los proyectos de Dominio sin advertencia.
3. **La dependencia transitiva debe documentarse por satélite.** Cada satélite que use la Opción A debe documentar esta concesión en su propio ADR de nivel de producto o notas arquitectónicas.
4. **La ruta de migración a la Opción C debe mantenerse clara.** Las clases base de Shell.Ddd deben implementar interfaces `IAggregateRoot<T>`, `IEntity<T>` e `IDomainEvents` desde el principio para hacer la migración a la Opción C incremental en lugar de una reescritura completa.

### Ruta de Migración a la Opción C

1. Crear el proyecto `{Satélite}.Domain.Abstractions`.
2. Definir las interfaces `IAggregateRoot<T>`, `IEntity<T>`, `IDomainEvents` sin dependencias externas.
3. Actualizar `AggregateRoot<T>` en `Shell.Ddd` para implementar estas interfaces.
4. Actualizar las referencias del proyecto de Dominio de `Shell.Ddd` a `Shell.Ddd.Abstractions`.
5. El Dominio ahora solo depende del proyecto Abstractions — cero referencias NuGet.

---

## Justificación

MediatR es una preocupación de infraestructura a nivel de shell, no en el Dominio directamente. El Dominio no invoca MediatR; usa clases base que casualmente lo incluyen. El riesgo de este acoplamiento está contenido dentro de la librería shell, que está controlada por la misma organización. Esta es una concesión reconocida del "Núcleo Compartido" de DDD.

La decisión de aceptar la Opción A es una elección arquitectónica pragmática tomada con pleno conocimiento de sus limitaciones, no un descuido.

---

## Consecuencias

### Positivas

- La velocidad de desarrollo se mantiene. Los equipos se centran en la lógica de negocio en lugar de en la infraestructura de clases base.
- Implementación consistente de agregados en todos los contextos acotados de todos los repositorios satélite.
- Las librerías shell pueden evolucionar de forma independiente sin requerir cambios de Dominio en cada iteración.

### Negativas

- La interpretación estricta de la regla BMAD R-10 (cero referencias NuGet en el Dominio) no se satisface completamente.
- La capa de Dominio no puede publicarse como un paquete NuGet independiente sin trabajo adicional.
- Los equipos deben entender el modelo de dependencia transitiva y aplicar la restricción de que el código de Dominio nunca invoca MediatR.

---

## Verificación

Para verificar que la capa de Dominio tiene cero referencias de paquete **directas**:

```bash
dotnet list <Domain.csproj> package
# Salida esperada: sin referencias de paquete directas
```

Para verificar que MediatR no se invoca directamente en el código de Dominio:

```bash
grep -r "using MediatR" src/Domain/ --include="*.cs"
# Salida esperada: sin salida (cero importaciones directas de MediatR)
```

---

## Referencias

- [ADR-0041: Arquitectura Canónica de Backend .NET](../dotnet/0041-canonical-dotnet-backend-architecture.es.md)
- [ADR-0019: Patrones de Diseño Funcional Táctico](./0019-tactical-design-patterns-future-proofing.es.md)




## Evidencias y Criterios de Evaluación

> Backfill pendiente — trazado como [GT-20](../../../governance/standards/vision/gap-reference-catalog.es.md#gt-20) (estandarización de ADRs 2026-06-10).

## Decisiones y Estándares Relacionados

> Backfill pendiente — trazado como [GT-20](../../../governance/standards/vision/gap-reference-catalog.es.md#gt-20) (estandarización de ADRs 2026-06-10).

---
[Volver al Índice](./README.es.md)
