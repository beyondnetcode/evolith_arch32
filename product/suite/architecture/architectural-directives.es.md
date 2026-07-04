# Evolith — Directivas Arquitectónicas Maestras y Estrategia de Evolución

> **Estado:** Aprobado
> **Propietario:** Evolith Architecture Board
> **Última revisión:** 2026-05-22

Este documento establece las directivas arquitectónicas no negociables que gobiernan cada producto instanciado desde esta referencia. Define la barra de calidad base, la filosofía de evolución y las restricciones que cualquier decisión arquitectónica debe satisfacer.

---

## 1. Objetivos Globales del Sistema

La plataforma **Evolith** está diseñada para anclar todos los productos corporativos bajo estándares de entrega que aseguren la viabilidad técnica a largo plazo sin sacrificar la simplicidad en etapas tempranas.

---

## 2. Requerimientos Técnicos Maestros y Evolución

Todos los productos instanciados a partir de este blueprint DEBEN alinearse con las siguientes directivas:

### 2.1 Progresión Evolutiva
Los sistemas se inician como un **Monolito Modular** (basado en Nx) para garantizar un rápido tiempo de salida al mercado inicial. Los módulos de dominio están lógicamente aislados mediante límites de librería estrictos desde el primer día, permitiendo la extracción quirúrgica a **Microservicios** sin requerir reescrituras del capa de dominio. Ver los disparadores cuantitativos de extracción en [ADR-0045](../../architecture/adrs/core/0045-microservice-extraction-readiness-criteria.es.md) y el marco de selección en [ADR-0047](../../architecture/adrs/core/0047-architectural-patterns-monolith-soa-microservices.es.md).

**Etapas:**
```text
Monolito Simple -> Monolito Modular -> Módulos Distribuidos -> Microservicios
```

Ninguna etapa se omite. Ninguna etapa es obligatoria más allá de lo que el negocio, el tamaño del equipo y la complejidad operacional demandan objetivamente.

### 2.2 Preparación para Alta Concurrencia
El sistema DEBE soportar ráfagas repentinas y no uniformes de carga de usuarios. Esto se logra mediante:
- Topología de contenedores con auto-escalado ([ADR-0028](../../architecture/adrs/core/0028-self-hosted-hybrid-infrastructure-on-premise.es.md))
- Estrategias de caché de 4 niveles ([ADR-0014](../../architecture/adrs/core/0014-multi-layer-distributed-caching-strategy.es.md))
- Abstracción de Bus de Eventos no bloqueante ([ADR-0015](../../architecture/adrs/core/0015-event-driven-architecture-intra-domain.es.md))

### 2.3 Integridad Transaccional
Cada mutación de estado debe ser estrictamente atómica. Los estados de escritura inconsistentes se previenen mediante controles explícitos de Unidad de Trabajo y, donde se requiere propagación asíncrona, el patrón Transactional Outbox ([ADR-0033](../../architecture/adrs/core/0033-transactional-outbox-pattern.es.md)).

### 2.4 Seguro, Dinámico y Extensible
Los principios de arquitectura Zero-Trust se aplican desde la Fase 1. Los adaptadores de infraestructura están totalmente desacoplados de la lógica de dominio, permitiendo que nuevas herramientas o servicios externos se intercambien en caliente sin impactar los flujos de valor centrales. Los proveedores de identidad, buses de eventos, cachés y motores de almacenamiento son todos inyectables mediante el límite Puerto/Adaptador.

### 2.5 Soberanía del Dominio
La capa de Dominio debe contener cero referencias a SDKs de nube, librerías ORM o frameworks HTTP. El Dominio es el centro estable; la infraestructura es el detalle reemplazable. La violación de esta regla falla automáticamente la validación del Gate de Arquitectura.

---

## 3. Restricciones Gobernantes

| Restricción | Mecanismo de Aplicación | Referencia |
| :--- | :--- | :--- |
| Arquitectura Hexagonal obligatoria | Gate de CI con `eslint-plugin-boundaries` | [ADR-0002](../../architecture/adrs/nodejs/0002-clean-architecture-nestjs.es.md) |
| Sin extracción prematura de microservicios | Regla cuantitativa "2 de 4" aplicada por el Architecture Board | [ADR-0045](../../architecture/adrs/core/0045-microservice-extraction-readiness-criteria.es.md) |
| Schema-per-Context desde el día uno | Los SQL joins cross-schema están arquitectónicamente prohibidos | [ADR-0031](../../architecture/adrs/core/0031-schema-per-context-domain-event-catalog.es.md) |
| Comunicación inter-servicio Contract-First | OpenAPI (público), gRPC/Protobuf (interno), AsyncAPI (asíncrono) | [ADR-0040](../../architecture/adrs/core/0040-multi-runtime-selection-contracts.es.md) |
| Portabilidad de infraestructura | Almacenamiento compatible con S3, selección OSS-first | [ADR-0028](../../architecture/adrs/core/0028-self-hosted-hybrid-infrastructure-on-premise.es.md) |
| Cobertura mínima de pruebas | 70% aplicada en CI; Testcontainers para pruebas de integración | [ADR-0018](../../architecture/adrs/core/0018-testing-pyramid-quality-gates.es.md) |
| Trazado distribuido unificado | OpenTelemetry W3C TraceContext, sin agentes APM propietarios | [ADR-0007](../../architecture/adrs/nodejs/0007-observability-telemetry-loki-opentelemetry.es.md) |
| Estándares de nomenclatura | Lenguaje Ubicuo como fuente de verdad, linting automatizado | [ADR-0056](../../architecture/adrs/core/0056-enterprise-naming-design-conventions.es.md) |

---

## 4. Lectura Suplementaria

- [Roadmap de Estrategia Evolutiva](../strategy/evolutionary-strategy-roadmap.es.md) — Roadmap técnico fase por fase con KPIs medibles
- [Evaluación de Madurez](../../governance/standards/vision/maturity-assessment.es.md) — Evaluación TOGAF ACMM, inmunización de anti-patrones y preparación de patrones
- [Blueprint de Referencia](../../architecture/blueprints/reference-blueprint.es.md) — Modelo arquitectónico C4 completo

---

*Extraído del análisis de alcance original para su aplicación universal.*

---
[Volver al Índice](./README.es.md)