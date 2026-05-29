# Hub de Arquitectura

> **Navegación bilingüe:** [English](./README.md)

Esta área contiene el modelo de arquitectura reutilizable. Léelo desde política general hasta evidencia concreta:

| Capa | Propósito | Punto de entrada |
|---|---|---|
| Línea base y blueprints | Define principios agnósticos al runtime, topología y criterios de selección | [Blueprints](./blueprints/README.md) |
| Decisiones arquitectónicas | Registra trade-offs aceptados y alcance | [Registro ADR](./adrs/README.md) |
| Descubrimiento de decisiones | Encuentra ADRs controladores por preocupación arquitectónica | [Matriz ADR](./adrs/adr-matrix.md) |
| Implementaciones por runtime | Provee patrones de código gobernados por ADRs específicos de runtime | [Patrones Canónicos](./canonical-patterns/README.md) |
| Evidencia aplicada de producto | Muestra cómo un producto real adopta o especializa la referencia | [Modelo de Referencia UMS](../knowledge/demo/ums-reference-model.md) |

## Regla de Lectura

La línea base y los ADRs aceptados definen la política. Los perfiles de runtime y los patrones canónicos definen guía de implementación condicionada. UMS es el modelo de referencia aplicado oficial: demuestra decisiones en un producto completo, pero sus escolhas específicas de producto no son automáticamente estándares universales.

---
[Volver al Hub de Referencia](../README.md)