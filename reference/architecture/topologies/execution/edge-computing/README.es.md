# Perfil Topologico Edge Computing

> **Navegacion Bilingue:** [English Version](./README.md)

**Estado:** Draft  
**Dimension:** `execution`  
**ID de Topologia:** `edge-computing`  
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

## Contrato Ejecutable

Los satelites que adopten esta topologia deben declarar un archivo `edge-computing.config.json` en su raiz. Este JSON actua como el contrato ejecutable machine-readable evaluado por el Evolith Governance Engine.

### Patrones de Persistencia Offline-First

Un aspecto critico de la topologia Edge Computing es manejar la conectividad intermitente. Para cumplir con `EC-R01` (Estrategia de Sincronizacion Obligatoria) y `EC-R03` (Resolucion de Conflictos), los nodos edge deben implementar patrones de persistencia offline-first:

1.  **Lecturas y Escrituras Local-First:** Usa bases de datos locales (ej. SQLite, IndexedDB) como el data store primario para el workload edge. Esto asegura que la aplicacion permanezca completamente funcional durante particiones de red (`edgeIsolation: true`).
2.  **Sincronizacion en Background:** Utiliza workers en background o service workers para sincronizar los cambios locales con el plano de control central cuando se restaura la conectividad.
3.  **Resolucion de Conflictos:** Declara y maneja explicitamente los conflictos de estado resultantes de modificaciones offline (ej. `last-write-wins`, fusion manual).

## Composicion

`edge-computing` puede combinarse con `microservices`, `distributed-modules`, `event-driven`, `serverless` y `agentic-ai` cuando las reglas de localidad y sincronizacion son explicitas.

## Frontera de Negocio

Este perfil draft es solo tecnico. No define ROI, modelo de costos, gasto de hardware, staffing, timing de entrega, priorizacion ni Funnel 0. Evolith Tracker posee esas preocupaciones de negocio mediante su ACL.

---
[Volver al Hub de Topologias](../../README.es.md)
