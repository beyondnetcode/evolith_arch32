# ADR-0095: Gobernanza de Arquitectura Serverless

**Estado:** Accepted  
**Fecha:** 2026-06-20  
**Tags:** `architecture`, `execution`, `topology`

## Contexto

Las plataformas serverless introducen fronteras runtime administradas donde la plataforma posee el aprovisionamiento, escalamiento y ciclo de vida de infraestructura. Sin gobernanza explicita, los productos satelite corren riesgo de lock-in con proveedor, costos de ejecucion ilimitados, logica de handler con estado y fronteras de propiedad de dominio omitidas. Evolith necesita un contrato arquitectonico consistente para ejecucion serverless que preserve el aislamiento de dominio, la neutralidad de proveedor y la observabilidad operativa.

## Decision

Adoptamos la topologia de ejecucion **Serverless** con los siguientes principios rectores:

1. **Ejecucion sin Estado**: Los handlers no deben asumir estado local persistente. Todo estado duradero pertenece al contexto acotado propietario, no al runtime del handler.
2. **Contratos Explicitos**: Cada handler serverless debe declarar sus entradas, salidas, eventos y dependencias externas mediante contratos versionados.
3. **Interfaces Neutrales al Proveedor**: Las reglas arquitectonicas Core no deben hacer referencia a proveedores serverless especificos. La seleccion de proveedor pertenece a los perfiles de producto o plataforma.
4. **Paquetes de Despliegue Acotados**: Los artefactos de despliegue deben declarar un tamano maximo y un tiempo de inicializacion acotado para prevenir degradacion por cold-start.
5. **Mandato de Observabilidad**: Cada handler debe emitir evidencia trazable y senales de fallo consumibles por el plano de observabilidad compartido de Evolith.

Todos los satelites que adopten esta topologia DEBEN proporcionar `serverless.config.json` declarando las restricciones de `stateless`, `package.maxSizeMb` y `coldStart`.

## Consecuencias

- **Positivo:** Habilita escalamiento de ejecucion administrado sin sacrificar propiedad de dominio. Preserva preparacion para extraccion a otras topologias. Previene lock-in de proveedor a nivel de arquitectura.
- **Negativo:** Agrega sobrecarga de configuracion para adoptantes serverless. Las restricciones de cold-start y tamano de paquete pueden no ajustarse a todos los workloads.
- **Cumplimiento:** Gobernado mediante SV-R01 a SV-R04 en las reglas de arquitectura ejecutables y aplicado por el evaluador Native y la politica OPA.

> **Firma del Agente:** Architect Agent
