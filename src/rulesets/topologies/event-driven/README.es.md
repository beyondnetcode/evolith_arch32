# Perfil Topologico Event-Driven

> **Navegacion Bilingue:** [English Version](./README.md)

**Estado:** Accepted  
**Dimension:** `integration`  
**ID de Topologia:** `event-driven`  
**Alias de Compatibilidad:** `F2-compatible`  
**Manifiesto:** [topology.manifest.json](./topology.manifest.json)

La arquitectura event-driven es una topologia de integracion para coordinacion asincrona mediante contratos de eventos explicitos, publicacion confiable, consumidores idempotentes y flujo de mensajes observable.

## Proposito

Usa esta topologia cuando bounded contexts, modulos, servicios, funciones o workloads edge deben coordinar sin acoplamiento sincrono fuerte.

La integracion event-driven no autoriza esconder workflows de negocio en infraestructura. Los eventos deben expresar hechos de dominio explicitos, ownership, reglas de evolucion de schema y semantica de fallo.

## Reglas de Gobernanza

| Regla | Requisito |
|---|---|
| Contratos de eventos | Los eventos deben ser explicitos, versionados y backward-compatible. |
| Confiabilidad | La publicacion entre fronteras debe usar Transactional Outbox o un patron equivalente de confiabilidad. |
| Idempotencia | Los consumidores deben tolerar entrega duplicada y reintentos. |
| Observabilidad | El flujo de eventos debe exponer correlacion, lag, fallos y evidencia de replay. |
| Ownership | Los productores poseen el significado del evento; los consumidores poseen sus reacciones locales. |

### Que vale cada veredicto

**Lee la columna `Garantia` antes de fiarte de un visto bueno.** `observed` significa que la evaluacion abrio el repositorio. `declared` significa que el veredicto se decidio comparando un campo de un fichero de declaracion: un satelite que declara un control que no ha construido va a pasar. `unevaluated` significa que hoy ninguna comprobacion decide esa regla: se embarca y no se aplica. Se dicen aqui en vez de dejar que lo descubra quien compra, y un guard hace fallar el build cuando esta tabla y el ruleset embarcado discrepan.

| Regla | Control | Garantia |
|---|---|---|
| ED-R01 | Strict AsyncAPI Contract | `declared` |
| ED-R02 | Transactional Outbox | `declared` |
| ED-R03 | Dead Letter Queue | `declared` |
| ED-R04 | Event Ordering Guarantee | `declared` |
| ED-R05 | Idempotent Consumer Contract | `declared` |
| ED-R06 | Backward-Compatible Schema Evolution | `declared` |
| ED-R07 | Retention Policy Declaration | `unevaluated` |
| ED-R08 | Event Observability (Correlation and Trace Propagation) | `observed` |
| ED-R09 | Explicit Consumer Group Registration | `unevaluated` |

## Autoridad Requerida

| Artefacto | Rol |
|---|---|
| [ADR-0015: Arquitectura Event-Driven Intra-Dominio](../../../../reference/core/architecture/adrs/core/0015-event-driven-architecture-intra-domain.md) | Gobierna la coordinacion event-driven dentro de contextos acotados. |
| [ADR-0079: Corpus de Referencia Multi-Topologia](../../../../reference/core/architecture/adrs/core/0079-multi-topology-reference-corpus.md) | Gobierna los manifiestos de topologia y composicion. |
| [Reglas de Arquitectura Event-Driven](./event-driven.rules.json) | Reglas de compatibilidad ejecutables existentes. |
| [Modelo de Dimensiones de Topologia](../../../../reference/core/architecture/topologies/topology-dimensions.md) | Define reglas de composicion y compatibilidad. |

## Contrato Ejecutable

Todo satelite que adopte este perfil proporciona `event-driven.config.json`:

```json
{
  "strictAsyncApi": true,
  "transactionalOutbox": true,
  "deadLetterQueue": true
}
```

ED-R01 a ED-R03 exigen ese contrato, forzando la definicion explicita de AsyncAPI, el patron Transactional Outbox para la confiabilidad, y un Dead Letter Queue (DLQ) para el manejo de mensajes fallidos. El evaluador Native y la [politica OPA](./event-driven.rego) evaluan estos campos.

## Composicion

`event-driven` puede combinarse con:

| Topologia | Por Que Puede Componerse |
|---|---|
| `modular-monolith` | Agrega integracion event-driven desacoplada preservando un sistema desplegable. |
| `distributed-modules` | Habilita coordinacion asincrona entre fronteras de modulo con contratos explicitos. |
| `microservices` | Proporciona comunicacion event-driven confiable entre servicios con propiedad independiente. |
| `serverless` | Impulsa ejecucion serverless disparada por eventos gobernada por contratos explicitos. |
| `edge-computing` | Soporta flujo de eventos asincrono hacia y desde workloads ubicados en el edge. |
| `data-mesh` | Habilita actualizaciones de productos de datos impulsadas por eventos con propiedad analitica gobernada. |
| `agentic-ai` | Coordina workflows de agentes IA a traves de canales de eventos observables. |

## Frontera de Negocio

Este perfil es solo tecnico. No define priorizacion de negocio, timing, ROI, costo, presupuesto, staffing ni Funnel 0. Evolith Tracker posee esas preocupaciones de negocio mediante su ACL.

---
[Volver al Hub de Topologias](../../README.es.md)
