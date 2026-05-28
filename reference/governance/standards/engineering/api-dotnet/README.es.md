# Estandar API Dotnet

> Navegacion bilingue: [English](./README.md)

Esta seccion define el estandar empresarial Evolith para APIs backend basadas en Dotnet. Es normativo para arquitectura API reutilizable, reglas de bootstrap, fronteras de aplicacion, gobierno de persistencia, observabilidad, seguridad, quality gates y criterios de promocion.

UMS se trata solo como referencia aplicada. Los modulos de producto, endpoints concretos, nombres de headers de tenant, agregados de dominio, reglas de seeding y switches especificos de persistencia deben permanecer en UMS salvo que se promuevan aqui mediante un ADR, estandar o patron canonico.

## Documentos

| Documento | Proposito |
|---|---|
| [Estandar API Dotnet](./api-dotnet-standard.es.md) | Estandar normativo para APIs empresariales Dotnet. |

## Limite de autoridad

| Aspecto | Autoridad Evolith | Autoridad UMS |
|---|---|---|
| Principios API | Define reglas backend reutilizables | Aplica o especializa mediante ADRs |
| Boilerplate | Define limites estables de modulos y capas | Demuestra una implementacion concreta |
| Persistencia | Define gobierno y expectativas de calidad | Posee DbContext, repositorios, migraciones y providers concretos |
| Superficie API | Define reglas de responsabilidad REST y GraphQL | Posee endpoints, schemas y rutas de dominio concretos |
| Observabilidad y resiliencia | Define capacidades obligatorias | Posee logging, tracing, metricas y valores runtime concretos |

## Regla de promocion

Una practica de API UMS se convierte en estandar Evolith solo cuando es reutilizable, validada, documentada aqui y aprobada mediante el camino correcto: ADR, estandar de gobierno o patron canonico.

---
[Volver a estandares de ingenieria](../README.md)
