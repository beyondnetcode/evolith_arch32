# Perfil Topologico Data Mesh

> **Navegacion Bilingue:** [English Version](./README.md)

**Estado:** Accepted  
**Dimension:** `data`  
**ID de Topologia:** `data-mesh`  
**Alias de Compatibilidad:** `F2-compatible`  
**Manifiesto:** [topology.manifest.json](./topology.manifest.json)

Data mesh es una topologia de datos para ownership analitico distribuido, productos de datos gobernados, contratos descubribles e interoperabilidad soportada por plataforma entre dominios.

## Proposito

Usa esta topologia cuando el ownership de datos analiticos debe acercarse a los equipos de dominio sin perder gobernanza, calidad, interoperabilidad ni cumplimiento.

Data mesh no debilita el ownership transaccional. Las fronteras de datos de dominio permanecen gobernadas por el bounded context o servicio propietario.

## Reglas de Gobernanza

| Regla | Requisito |
|---|---|
| Ownership de dominio | Los productos de datos deben alinearse a dominios delimitados u ownership de servicio. |
| Productos contratados | Los productos de datos deben publicar schemas, expectativas de calidad y metadata de ciclo de vida. |
| Interoperabilidad | Los datos compartidos deben usar contratos gobernados y semantica descubrible. |
| Evidencia de calidad | Los productos de datos deben exponer validacion, lineage, frescura y senales de confiabilidad. |
| Frontera transaccional | La distribucion analitica no debe saltarse ownership transaccional ni invariantes de dominio. |

## Autoridad Requerida

| Artefacto | Rol |
|---|---|
| [ADR-0084: Data Mesh y Datos como Producto](../../../reference/core/architecture/adrs/core/0084-data-mesh-data-products.md) | Gobierna la topologia data mesh y los contratos de productos de datos. |
| [ADR-0079: Corpus de Referencia Multi-Topologia](../../../reference/core/architecture/adrs/core/0079-multi-topology-reference-corpus.md) | Gobierna los manifiestos de topologia y composicion. |
| [Reglas de Arquitectura Data Mesh](./data-mesh.rules.json) | Reglas de compatibilidad ejecutables existentes. |
| [Modelo de Dimensiones de Topologia](../../../reference/core/architecture/topologies/topology-dimensions.md) | Define reglas de composicion y compatibilidad. |

## Contrato Ejecutable

Todo satelite que adopte este perfil proporcionando o consumiendo productos de datos debe proporcionar `data-mesh.config.json`:

```json
{
  "isDataProduct": true,
  "hasDataContracts": true,
  "federatedGovernance": true
}
```

DM-R01 a DM-R03 exigen ese contrato, forzando la designacion explicita de Data Product, la presencia de Data Contracts para interoperabilidad, y el cumplimiento de las politicas de gobernanza federada. El evaluador Native y la [politica OPA](./data-mesh.rego) evaluan estos campos.

## Composicion

`data-mesh` puede combinarse con:

| Topologia | Por Que Puede Componerse |
|---|---|
| `distributed-modules` | Habilita productos de datos analiticos propiedad de modulos de dominio con contratos gobernados. |
| `microservices` | Soporta productos de datos con propiedad independiente alineados a fronteras de servicio. |
| `event-driven` | Impulsa actualizaciones de productos de datos a traves de canales de eventos observables. |
| `serverless` | Proporciona ejecucion de productos de datos analiticos sin acoplamiento transaccional. |
| `agentic-ai` | Alimenta workflows de agentes IA con productos de datos analiticos gobernados. |

## Frontera de Negocio

Este perfil es solo tecnico. No define monetizacion de datos, ROI, asignacion de costos, staffing, priorizacion, timing de entrega ni Funnel 0. Evolith Tracker posee esas preocupaciones de negocio mediante su ACL.

---
[Volver al Hub de Topologias](../../README.es.md)
