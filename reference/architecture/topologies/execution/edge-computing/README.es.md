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
| Observabilidad | Los workloads edge deben reportar salud, fallo y trace context pese a conectividad intermitente. |
| Ownership de dominio | La logica edge no debe bifurcar comportamiento de dominio fuera del bounded context propietario. |

## Composicion

`edge-computing` puede combinarse con `microservices`, `distributed-modules`, `event-driven`, `serverless` y `agentic-ai` cuando las reglas de localidad y sincronizacion son explicitas.

## Frontera de Negocio

Este perfil draft es solo tecnico. No define ROI, modelo de costos, gasto de hardware, staffing, timing de entrega, priorizacion ni Funnel 0. Evolith Tracker posee esas preocupaciones de negocio mediante su ACL.

---
[Volver al Hub de Topologias](../../README.es.md)
