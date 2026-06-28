# Evolith Tracker

> **Navegación bilingüe:** [English version](./README.md)

**Clasificación:** Product-Specific Design  
**Producto:** Evolith Tracker  
**Estado:** Conceptual / en fase de diseño — **aún no implementado**. Hoy no existe código fuente de Evolith Tracker ni un repositorio `evolith_tracker` en este corpus; esta carpeta contiene únicamente el diseño objetivo.  
**Suite Padre:** [Evolith Product Suite](../../product-suite/README.es.md)  
**Core Gobernante:** [Evolith Core](../../core/README.es.md)

> **Estado de implementación.** Todo lo descrito a continuación define el rol y el diseño objetivo *previsto*, no comportamiento entregado. El diseño de interfaces autoritativo ([Diseño de Interfaces Técnicas de Tracker](./sdlc-tracker-technical-interfaces.es.md)) está marcado explícitamente como *Diseño Propuesto — Pendiente de Revisión del Architecture Board* y *no autoriza cambios de código*. Lee cada afirmación en presente como "poseerá / está diseñado para poseer".

---

## 1. Rol del Producto (objetivo)

Evolith Tracker está diseñado para ser el producto runtime de gobernanza de Evolith Product Suite.

Según su diseño, implementará Core y SDLC Governance al poseer:

- estado runtime de tenant, producto, proceso y fase;
- Gate Decisions y Phase Transitions canónicas;
- aceptación y linaje de evidencias, aprobaciones y excepciones;
- registros de agent runs y provider connections;
- historial de auditoría y experiencia unificada;
- administración de plugins, adapters y proveedores.

Por diseño, Tracker no redefine las reglas Core ni la gobernanza SDLC — las ejecuta.

> **Frontera de integración (ADR-0074 + ADR-0075).** Tracker accede al Core estrictamente como **cliente externo** de la **Capa de Exposición del Core** (`apps/core-api` REST/GraphQL, más MCP) definida en el [ADR-0074](../../architecture/adrs/core/0074-evolith-core-api-exposure-layer.es.md). La lógica de composición/adaptación para web y móvil vive en el **BFF / Application Gateway** del Tracker ([ADR-0075](../../architecture/adrs/nodejs/0075-application-gateway-bff-nestjs.es.md), NestJS) **dentro del repositorio `evolith_tracker`** — no en Core. Ver la [Visión de Producto §2.5](../../product-suite/vision/evolith-product-vision-master.es.md) para el diagrama por capas.

---

## 2. Áreas de Diseño del Producto

| Área | Responsabilidad |
|---|---|
| **Visión y Alcance** | Outcomes, personas, límites y roadmap específicos de Tracker |
| **Arquitectura** | Contenedores, bounded contexts, servicios, dependencias y despliegue |
| **Modelo de Dominio** | Agregados como Process, Gate Decision, Evidence Graph, Approval, Exception y Provider Connection |
| **Interfaces** | REST, MCP gateway, eventos, acciones UI y contratos del producto |
| **UX** | Workspaces de tenant, producto, fase, gate, evidencia, proveedores y auditoría |
| **Seguridad** | Integración UMS, consumo del grafo de autorización, límites tenant y secretos |
| **Integraciones** | Uso de puertos neutrales, plugins, adapters y ACLs |
| **ADRs** | Decisiones arquitectónicas específicas del producto |

---

## 3. Baseline Actual de Diseño

- [Diseño de Interfaces Técnicas de Tracker](../../governance/standards/vision/sdlc-tracker-technical-interfaces.es.md)
- [Diseño Objetivo de Composición Gobernada](../../governance/standards/vision/evolith-governed-composition-target-design.es.md)
- [Modelo de Abstracción de Proveedores y Plugins](../../governance/standards/vision/evolith-provider-abstraction-plugin-model.es.md)
- [Trazabilidad SDLC y Evidence Graph](../../governance/sdlc/traceability-model.es.md)

> Durante la migración, estos archivos permanecen en rutas heredadas. Su clasificación ya es explícita: el diseño de Tracker pertenece aquí; los principios universales permanecen en Core; la semántica SDLC permanece en Governance.

---

## 4. Límites No Negociables

1. Tracker consume definiciones Core; no las redefine autoritativamente.
2. Tracker posee el estado canónico de gobernanza runtime.
3. CLI, MCP, CI, agentes y proveedores producen evaluaciones o evidencias, no la autoridad final del gate.
4. Toda capacidad externa entra mediante contratos neutrales.
5. Los proveedores por defecto son reemplazables por política del tenant.
6. Los schemas específicos permanecen detrás de ACLs.
7. La evidencia y las decisiones históricas permanecen legibles después de reemplazar proveedores.
8. Los ADRs de producto no se convierten en ADRs Core sin promoción del Architecture Board.

---

## 5. Estructura Canónica Planificada

```text
reference/products/evolith-tracker/
├── README.es.md
├── vision/
├── functional/
├── architecture/
├── domain-model/
├── interfaces/
├── ux/
├── security/
├── integrations/
├── deployment/
└── adrs/
```

La migración debe preservar paridad bilingüe y compatibilidad con enlaces heredados.

---

[Volver a Diseños Específicos de Productos](../README.es.md)
