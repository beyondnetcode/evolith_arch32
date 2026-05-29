# Inteligencia Arquitectonica

> Navegacion bilingue: [English](./README.es.md)

Inteligencia Arquitectonica es la capa de conocimiento curado que hace que las decisiones, patrones, reglas de validacion y guias de adopcion de Evolith sean mas faciles de consumir por personas y herramientas de ingenieria asistida por IA.

Este portal es un indice y una pagina de orientacion. No reemplaza ADRs, estandares de gobierno, patrones canonicos ni referencias aplicadas de producto.

## Empieza aqui

| Necesidad | Ir a |
|---|---|
| Entender por que existe este catalogo | [ADR-0057 Catalogo de Inteligencia Arquitectonica](../../architecture/adrs/core/0057-architecture-intelligence-catalog.md) |
| Entender conocimiento arquitectonico consumible por IA | [ADR-0058 Conocimiento Arquitectonico Consumible por IA](../../architecture/adrs/core/0058-ai-consumable-architecture-knowledge.md) |
| Validar artefactos de Inteligencia Arquitectonica | [Validacion de Inteligencia Arquitectonica](./validation/architecture-intelligence-validation.md) |
| Revisar patrones arquitectonicos curados | [Patrones](./patterns/) |

## Ejemplos actuales de patrones

| Patron | Proposito |
|---|---|
| [Bounded Context Isolation](./patterns/bounded-context-isolation.md) | Mantener limites modulares explicitos en codigo y propiedad de datos. |
| [Data Ownership per Bounded Context](./patterns/data-ownership-per-bounded-context.md) | Aclarar reglas de propiedad de datos dentro de bounded contexts. |
| [No Cross-Domain Joins](./patterns/no-cross-domain-joins.md) | Evitar acoplamiento de persistencia entre limites modulares. |

## Que pertenece aqui

| Pertenece aqui | No pertenece aqui |
|---|---|
| Patrones arquitectonicos curados | Evidencia de implementacion especifica de producto |
| Analisis de tradeoffs | Decisiones locales de rutas, schemas, headers o seeds |
| Guia arquitectonica legible por IA | Estandares empresariales no aprobados |
| Enlaces hacia ADRs y estandares | Copias de material externo sin revision de gobierno |

## Regla de gobierno

Los artefactos de Inteligencia Arquitectonica ayudan a explicar y reutilizar conocimiento arquitectonico. No son estandares por si mismos salvo que apunten a un ADR aprobado, estandar de gobierno o patron canonico.

La evidencia especifica de producto permanece en UMS u otro repositorio satelite.

---

[Volver al area de conocimiento](../demo/README.es.md) | [Volver al repositorio](../../../README.es.md)
