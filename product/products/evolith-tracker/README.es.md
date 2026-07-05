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

> **Frontera de integración (ADR-0074 + ADR-0075).** Tracker accede al Core estrictamente como **cliente externo** de la **Capa de Exposición del Core** (`apps/core-api`, **solo REST** bajo `/api/v1` — sin GraphQL y sin SSE — más el gateway MCP) definida en el [ADR-0074](../../architecture/adrs/core/0074-evolith-core-api-exposure-layer.es.md). La lógica de composición/adaptación para web y móvil vive en el **BFF / Application Gateway** del Tracker ([ADR-0075](../../architecture/adrs/nodejs/0075-application-gateway-bff-nestjs.es.md), NestJS). El ADR-0075 motiva ese gateway por la *integración fluida con el ecosistema monorepo Node.js existente*; el futuro código de Tracker (nombre de trabajo `evolith_tracker`) aún no existe en este corpus, por lo que la ubicación de su repositorio es intención de diseño, no un hecho entregado. Ver la [Visión de Producto §2.5](../../product-suite/vision/evolith-product-vision-master.es.md) para el diagrama por capas.

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

## 3.1 Qué Existe Hoy vs. el Objetivo

No existe ninguna aplicación de Tracker ni un repositorio `evolith_tracker` en este corpus. Los únicos puntos de contacto de código **real y entregado** que preparan a Tracker son costuras (*seams*) del lado de Core, registradas en [gap-tracking](../../governance/standards/vision/gap-tracking.es.md):

| Costura real entregada hoy | Dónde | Seguimiento | Relación con el diseño objetivo |
|---|---|---|---|
| `workspaceRef` opaco emitido por el BFF de Tracker (campo DTO + resolver) | `apps/core-api/src/presentation/dtos/*.dto.ts`, `apps/core-api/src/application/services/workspace-reference-resolver.service.ts`, `packages/sdk-client/src/rest/types.ts` | [GT-117](../../governance/standards/vision/gap-tracking.es.md) | Permite que Core-API acepte referencias de workspace provistas por Tracker sin acoplarse a él. |
| `POST /api/v1/phases/transition` (en vivo, solo REST) | `apps/core-api/src/presentation/controllers/phases.controller.ts` → `PhaseTransitionUseCase` | — | Hoy ejecuta transiciones `from → to`; la propiedad del `PhaseTransition` (§4.4 del diseño de interfaces) es el **objetivo**, aún no aplicado. |
| Value object `GateDecision` (ya nombrado en Core) | `packages/core-domain/src/gates/decision/gate-decision.ts` | [GT-316](../../governance/standards/vision/gap-tracking.es.md) | Forma distinta al `GateDecision` objetivo (ver nota del diseño de interfaces §4.3) — un nombre ya ocupado en Core. |
| `validateWorkflow(definition)` — valida flujos provistos por Tracker contra invariantes de Core | `packages/core-domain/src/application/use-cases/validate-workflow.use-case.ts` | [GT-317](../../governance/standards/vision/gap-tracking.es.md) | Costura tenant-agnóstica que Tracker invocará. |
| Capa de caché Redis para consumo de Core-API / MCP / Tracker | `apps/core-api` | [GT-249](../../governance/standards/vision/gap-tracking.es.md) | Infraestructura compartida preparada para lecturas de Tracker. |
| Validación de integración extremo a extremo Core + Tracker + agentes | e2e de `packages/core-domain` | [GT-326](../../governance/standards/vision/gap-tracking.es.md) | Costura de integración transversal. |

Todo lo descrito en el [Diseño de Interfaces Técnicas de Tracker](./sdlc-tracker-technical-interfaces.es.md) (endpoints REST bajo `tracker.evolith.io`, las herramientas `evolith criterion evaluate` / `evolith gate assess`, los puertos de proveedores, el Evidence Graph, el Gate Decision Engine) es **diseño objetivo** **sin implementación**.

### Contrato de salida y de error (objetivo)

Se espera que las respuestas REST/MCP de Tracker reutilicen el sobre plano de Core ([ADR-0073](../../architecture/adrs/core/0073-unified-cli-output-contract.es.md)) — `meta.command`, `meta.executedAt`, `meta.durationMs`, `meta.correlationId`, `meta.context`, `meta.schemaVersion` — y RFC 9457 (`application/problem+json`) para errores, como hace Core-API hoy. El diseño de interfaces (§11) señala que ADR-0073 *sigue siendo válido pero requiere una decisión complementaria* para separar la semántica evaluación-versus-decisión antes de la implementación de Tracker.

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
product/products/evolith-tracker/
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

## 6. Instalación, Ejecución y Contribución

**Aún no existe ningún artefacto de Tracker instalable o ejecutable** — no hay paquete, binario, imagen de contenedor, variables de entorno ni comandos. La guía de instalación / prerrequisitos / ejecución local / troubleshooting se redactará junto con el primer incremento de implementación, una vez que el [Checklist de Aprobación Pre-Código](./sdlc-tracker-technical-interfaces.es.md#12-checklist-previo-a-código) sea aprobado por el Architecture Board. Para ejercitar las **costuras del lado de Core que Tracker consumirá hoy**, usa la [Core API](../core-api/README.es.md) en ejecución (`POST /api/v1/phases/transition`, los endpoints de validación) y los [servicios MCP](../mcp-services/README.es.md).

Los estándares de contribución de este repositorio (clone/dev-setup, comandos de test, convenciones de rama/commit, autoría de doc/schema/ruleset/OPA) viven en el [CONTRIBUTING.md](../../../CONTRIBUTING.md) en la raíz del repo; las reglas de contribución específicas de Tracker se añadirán cuando exista el código.

---

[Volver a Diseños Específicos de Productos](../README.es.md)
