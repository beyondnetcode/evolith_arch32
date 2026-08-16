# Perfil Topologico Edge Computing

> **Navegacion Bilingue:** [English Version](./README.md)

**Estado:** Accepted  
**Dimension:** `execution`  
**ID de Topologia:** `edge-computing`  
**Alias de Compatibilidad:** `F2-compatible`  
**Manifiesto:** [topology.manifest.json](./topology.manifest.json)

Edge computing es una topologia de ejecucion para workloads que deben correr cerca de usuarios, dispositivos, regiones o fronteras de red restringidas mientras permanecen gobernados por los mismos contratos arquitectonicos de Evolith Core.

## Proposito

Usa esta topologia cuando latencia, localidad, tolerancia offline, ubicacion regulatoria o procesamiento cercano a dispositivos requiere ejecucion fuera del runtime central.

Los workloads edge deben permanecer gobernados por reglas explicitas de sincronizacion, seguridad, observabilidad, despliegue y frontera de datos. La ubicacion edge no autoriza duplicar logica de dominio sin ownership.

## Reglas de Gobernanza

| Regla | Requisito |
|---|---|
| Razon de localidad | La ubicacion edge debe justificarse por latencia, resiliencia, localidad o restricciones regulatorias. |
| Sincronizacion | La sincronizacion de estado debe ser explicita, observable y consciente de conflictos. |
| Seguridad | Los nodos edge deben aplicar autenticacion, autorizacion y manejo de secretos apropiados para entornos restringidos. |
| Observability | Los workloads edge deben reportar salud, fallo y trace context pese a conectividad intermitente. |
| Ownership de dominio | La logica edge no debe bifurcar comportamiento de dominio fuera del bounded context propietario. |

### Que vale cada veredicto

**Lee la columna `Garantia` antes de fiarte de un visto bueno.** `observed` significa que la evaluacion abrio el repositorio. `declared` significa que el veredicto se decidio comparando un campo de un fichero de declaracion: un satelite que declara un control que no ha construido va a pasar. `unevaluated` significa que hoy ninguna comprobacion decide esa regla: se embarca y no se aplica. Se dicen aqui en vez de dejar que lo descubra quien compra, y un guard hace fallar el build cuando esta tabla y el ruleset embarcado discrepan.

| Regla | Control | Garantia |
|---|---|---|
| EC-SEC-01 | Network Security Profile | `unevaluated` |
| EC-SEC-02 | mTLS Enforcement | `unevaluated` |
| EC-R01 | Mandatory Synchronization Strategy | `declared` |
| EC-R02 | Edge Node Isolation | `declared` |
| EC-R03 | Conflict Resolution Strategy | `declared` |

## Autoridad Requerida

| Artefacto | Rol |
|---|---|
| [ADR-0079: Corpus de Referencia Multi-Topologia](../../../../reference/core/architecture/adrs/core/0079-multi-topology-reference-corpus.md) | Gobierna los manifiestos de topologia y composicion. |
| [ADR-0096: Gobernanza de Arquitectura Edge Computing](../../../../reference/core/architecture/adrs/core/0096-edge-computing-architecture-governance.md) | Gobierna las restricciones arquitectonicas especificas de edge. |
| [Reglas de Arquitectura Edge Computing](./edge-computing.rules.json) | Reglas de compatibilidad ejecutables existentes. |
| [Modelo de Dimensiones de Topologia](../../../../reference/core/architecture/topologies/topology-dimensions.md) | Define reglas de composicion y compatibilidad. |

## Contrato Ejecutable

Los satelites que adopten esta topologia deben declarar un archivo `edge-computing.config.json` en su raiz. Este JSON actua como el contrato ejecutable machine-readable evaluado por el Evolith Governance Engine.

```json
{
  "syncStrategy": "offline-first",
  "edgeIsolation": true,
  "conflictResolution": "last-write-wins"
}
```

EC-R01 a EC-R03 exigen ese contrato, forzando una estrategia de sincronizacion declarada, aislamiento de nodo edge para operacion autonoma y un modo explicito de resolucion de conflictos. El evaluador Native y la [politica OPA](./edge-computing.rego) evaluan estos campos.

### Patrones de Persistencia Offline-First

Un aspecto critico de la topologia Edge Computing es manejar la conectividad intermitente. Para cumplir con `EC-R01` (Estrategia de Sincronizacion Obligatoria) y `EC-R03` (Resolucion de Conflictos), los nodos edge deben implementar patrones de persistencia offline-first:

1.  **Lecturas y Escrituras Local-First:** Usa bases de datos locales (ej. SQLite, IndexedDB) como el data store primario para el workload edge. Esto asegura que la aplicacion permanezca completamente funcional durante particiones de red (`edgeIsolation: true`).
2.  **Sincronizacion en Background:** Utiliza workers en background o service workers para sincronizar los cambios locales con el plano de control central cuando se restaura la conectividad.
3.  **Resolucion de Conflictos:** Declara y maneja explicitamente los conflictos de estado resultantes de modificaciones offline (ej. `last-write-wins`, fusion manual).

## Composicion

`edge-computing` puede combinarse con:

| Topologia | Por Que Puede Componerse |
|---|---|
| `microservices` | Ubica workloads de servicio individual en el edge con sincronizacion gobernada. |
| `distributed-modules` | Extiende fronteras de modulo a ubicaciones edge con contratos de sincronizacion explicitos. |
| `event-driven` | Coordina cambios de estado edge a traves de canales de eventos observables. |
| `serverless` | Despliega unidades de ejecucion administradas en ubicaciones edge con inicializacion acotada. |
| `agentic-ai` | Ejecuta inferencia de agentes IA en el edge con gobernanza offline. |

## Frontera de Negocio

Este perfil es solo tecnico. No define ROI, modelo de costos, gasto de hardware, staffing, timing de entrega, priorizacion ni Funnel 0. Evolith Tracker posee esas preocupaciones de negocio mediante su ACL.

## Presupuestos Operativos

Esta topología declara envelopes arquitectónicos de latencia, cold-start y costo por ejecución en `spec.operationalBudgets` de [`topology.manifest.json`](./topology.manifest.json). Los operadores verifican los satélites contra estos envelopes siguiendo el [Runbook de Presupuestos Operativos](../../../../reference/core/architecture/topologies/execution/operational-budgets-runbook.es.md) compartido.

---
[Volver al Hub de Topologias](../../README.es.md)
