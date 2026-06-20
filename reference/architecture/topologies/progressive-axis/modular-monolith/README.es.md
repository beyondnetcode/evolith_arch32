# Perfil Topologico de Monolito Modular

> **Navegacion Bilingue:** [English Version](./README.md)

**Estado:** Aceptado  
**Dimension:** `progressive-axis`  
**ID de Topologia:** `modular-monolith`  
**Alias de Compatibilidad:** `F1`  
**Manifiesto:** [topology.manifest.json](./topology.manifest.json)

El monolito modular es la topologia inicial canonica de Evolith. Mantiene simple el despliegue mientras exige limites de dominio estrictos, contratos explicitos, patrones Data Mapper y Repository, y preparacion para extraccion desde el inicio.

## Proposito

Usa esta topologia cuando el producto debe avanzar rapido sin pagar el costo de sistemas distribuidos antes de que el negocio y la operacion lo justifiquen.

La topologia no es un monolito sin estructura. Es un sistema desplegable organizado como bounded contexts explicitos con contratos estables, logica de dominio aislada, limites de persistencia controlados y una ruta clara de extraccion futura.

## Reglas de Gobernanza

| Regla | Requisito |
|---|---|
| Bounded contexts | Las capacidades de dominio deben aislarse como modulos o bounded contexts explicitos. |
| Persistencia | La logica de dominio debe permanecer desacoplada de la persistencia mediante patrones Data Mapper y Repository. |
| Integracion | La comunicacion entre contextos debe preferir contratos y eventos explicitos sobre acoplamiento oculto directo. |
| Preparacion para extraccion | Los limites de modulo, contratos y ownership de datos deben permanecer listos para evolucion F2/F3. |
| Restriccion de distribucion | No extraer servicios hasta que los criterios de readiness de ADR-0045 justifiquen el costo operativo. |

## Autoridad Requerida

| Artefacto | Rol |
|---|---|
| [ADR-0047: Framework de Evolucion Arquitectonica Progresiva](../../../adrs/core/0047-architectural-patterns-monolith-soa-microservices.es.md) | Gobierna la evolucion progresiva y la prevencion de sobre-diseno. |
| [ADR-0067: Monolito Modular con Schema por Dominio](../../../adrs/core/0067-modular-monolith-schema-per-domain.es.md) | Gobierna el aislamiento de fronteras de datos en monolitos modulares. |
| [ADR-0079: Corpus de Referencia Multi-Topologia](../../../adrs/core/0079-multi-topology-reference-corpus.es.md) | Gobierna manifiestos topologicos y composicion. |
| [Reglas de Arquitectura F1](./modular-monolith.rules.json) | Reglas ejecutables existentes de compatibilidad. |
| [Modelo de Dimensiones Topologicas](../../topology-dimensions.es.md) | Define reglas de composicion y compatibilidad. |

## Composicion

`modular-monolith` puede combinarse con:

| Topologia | Por que Puede Componerse |
|---|---|
| `event-driven` | Agrega integracion desacoplada mientras preserva un solo sistema desplegable. |
| `serverless` | Permite puntos aislados de ejecucion administrada sin forzar extraccion completa de servicios. |
| `data-mesh` | Puede introducir modelos de ownership analitico mientras el ownership transaccional permanece delimitado. |
| `agentic-ai` | Puede agregar workflows de agentes IA gobernados por contexto MCP y rulesets. |

## Frontera de Negocio

Este perfil es solo tecnico. Define restricciones de arquitectura y contexto de validacion. No define timing de entrega, ownership, staffing, ROI, costo, presupuesto ni priorizacion de Funnel 0. Evolith Tracker posee esas preocupaciones de negocio mediante su ACL.

---
[Volver al Hub de Topologias](../../README.es.md)
