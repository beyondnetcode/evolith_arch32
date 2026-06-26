# Mapa de Bounded Contexts

> **Navegación Bilingüe:** [English Version](./bounded-context-map.md)

Este archivo es el mapa canónico de bounded contexts para este repositorio satélite. Cada bounded context debe declarar ownership, aggregate roots y estrategia de persistencia.

## Contextos

| Contexto | Owner | Aggregate Roots | Persistencia |
|----------|-------|-----------------|--------------|
| (completar en Fase 2) | — | — | — |

## Estilos de Integración

| Contexto Origen | Contexto Destino | Estilo | Contrato |
|-----------------|------------------|--------|----------|
| (completar en Fase 2) | — | — | — |

## Notas

- Este es un **placeholder de referencia** en el repositorio Core. Cada satélite debe producir su propio bounded-context-map.md durante la Fase 2.
- El evidence-validator mapea `Bounded Context Map` a esta ruta en el Core para validación de existencia de template. Los satélites copian esta estructura a su propio repositorio.
- Seguir ADR-0031 (Schema-per-Context) para reglas de aislamiento de datos.
- Seguir ADR-0032 (Protocol Selection Matrix) para contratos entre contextos.
