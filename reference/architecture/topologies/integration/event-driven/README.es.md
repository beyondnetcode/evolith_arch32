# Perfil Topologico Event-Driven

> **Navegacion Bilingue:** [English Version](./README.md)

**Estado:** Draft  
**Dimension:** `integration`  
**ID de Topologia:** `event-driven`  
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

## Contrato Ejecutable

Todo satélite que adopte este perfil proporciona `event-driven.config.json`:

```json
{
  "strictAsyncApi": true,
  "transactionalOutbox": true,
  "deadLetterQueue": true
}
```

ED-R01 a ED-R03 exigen ese contrato, forzando la definición explícita de AsyncAPI, el patrón Transactional Outbox para la confiabilidad, y un Dead Letter Queue (DLQ) para el manejo de mensajes fallidos. El evaluador Native y la [política OPA](./event-driven.rego) evalúan estos campos.

## Composicion

`event-driven` puede combinarse con cada perfil progressive-axis y con `serverless`, `edge-computing`, `data-mesh` y `agentic-ai` cuando contratos y telemetria son explicitos.

## Frontera de Negocio

Este perfil draft es solo tecnico. No define priorizacion de negocio, timing, ROI, costo, presupuesto, staffing ni Funnel 0. Evolith Tracker posee esas preocupaciones de negocio mediante su ACL.

---
[Volver al Hub de Topologias](../../README.es.md)
