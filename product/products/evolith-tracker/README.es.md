# Evolith Tracker

> **Navegación bilingüe:** [English version](./README.md)

**Clasificación:** Product-Specific Design  
**Producto:** Evolith Tracker  
**Estado:** Construido, en UAT, **no lanzado**. El código vive en el repositorio privado `beyondnetcode/evolith_tracker` (una API en .NET 10, una web en React 19 y un gateway NestJS, con PostgreSQL); sus imágenes son públicas en GHCR y el [compose de UAT](../../infra/docker-compose.uat.yml) de este repositorio las levanta junto al Core. Esta carpeta contiene el diseño que lo precedió — léelo como intención, y donde discrepe del producto, manda el producto.  
**Suite Padre:** [Evolith Product Suite](../../suite/README.es.md)  
**Core Gobernante:** [Evolith Core](../../../reference/core/README.es.md)

> **Estado de implementación (2026-09-20).** El Tracker existe y corre: iniciativas a través de las cinco fases, criterios de gate derivados del tipo, cadenas de aprobación del product owner, evaluación de compuerta de fase con veredicto del Core, evidencia, auditoría — la [portada](../../../README.es.md#la-compuerta-de-fase-en-la-cli-y-en-el-tracker) lleva una captura de su entorno UAT gobernando este mismo repositorio. Lo que **no** es cierto todavía: un lanzamiento, un repositorio público y una llamada de conformidad del repositorio que pase en UAT (el techo de 100 KB del cuerpo del Core la rechazó — GT-715, arreglado en el Core, a la espera de la siguiente promoción). El [Diseño de Interfaces Técnicas de Tracker](./sdlc-tracker-technical-interfaces.es.md) de abajo es anterior a la implementación y sigue marcado como *Diseño Propuesto*; no describe el producto entregado.

---

## 1. Rol del Producto (objetivo)

Evolith Tracker es el producto runtime de gobernanza de Evolith Product Suite.

Implementa Core y SDLC Governance al poseer:

- estado runtime de tenant, producto, proceso y fase;
- Gate Decisions y Phase Transitions canónicas;
- aceptación y linaje de evidencias, aprobaciones y excepciones;
- registros de agent runs y provider connections;
- historial de auditoría y experiencia unificada;
- administración de plugins, adapters y proveedores.

Tracker no redefine las reglas Core ni la gobernanza SDLC — las ejecuta. Su propio manual formula la separación como dos planos: gobernanza de proceso (fases, gates, criterios, aprobaciones, auditoría — siempre activa, sin repositorio) y conformidad técnica de arquitectura (el Core evaluando un repositorio satélite — opcional, por gate, mediante `requiresCoreVerdict`).

> **Frontera de integración (ADR-0074 + ADR-0075).** Tracker accede al Core estrictamente como **cliente externo** de la **Capa de Exposición del Core** (`src/apps/core-api`, **solo REST** bajo `/api/v1` — sin GraphQL y sin SSE — más el gateway MCP) definida en el [ADR-0074](../../../reference/core/architecture/adrs/core/0074-evolith-core-api-exposure-layer.es.md). La lógica de composición/adaptación para web y móvil vive en el **BFF / Application Gateway** del Tracker ([ADR-0075](../../../reference/core/architecture/adrs/nodejs/0075-application-gateway-bff-nestjs.es.md), NestJS). El ADR-0075 motiva ese gateway por la *integración fluida con el ecosistema monorepo Node.js existente*; el Tracker entregado conserva el gateway (`tracker-gateway`, NestJS) y pone el dominio en una API .NET detrás. Sus llamadas al Core son solo REST, como se diseñó, y para la conformidad del repositorio **envía el repositorio inline** (`evaluationInput.files`, armado desde el acceso al repositorio del producto) en vez de pasarle una ruta al Core — el Core sigue sin estado y nunca lee un sistema de ficheros ni la red por cuenta del Tracker. Ver la [Visión de Producto §2.5](../../suite/vision/evolith-product-vision-master.es.md) para el diagrama por capas.

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

- [Diseño de Interfaces Técnicas de Tracker](./sdlc-tracker-technical-interfaces.es.md)
- [Diseño Objetivo de Composición Gobernada](../../suite/architecture/evolith-governed-composition-target-design.es.md)
- [Modelo de Abstracción de Proveedores y Plugins](../../../reference/core/foundations/principles/evolith-provider-abstraction-plugin-model.es.md)
- [Trazabilidad SDLC y Evidence Graph](../../../reference/core/sdlc/traceability-model.es.md)

> Durante la migración, estos archivos permanecen en rutas heredadas. Su clasificación ya es explícita: el diseño de Tracker pertenece aquí; los principios universales permanecen en Core; la semántica SDLC permanece en Governance.

---

## 3.1 Qué Existe Hoy vs. el Objetivo

El Tracker se distribuye desde su propio repositorio privado, no desde este corpus. Lo que este corpus contiene son las costuras (*seams*) del lado de Core que consume, registradas en [gap-tracking](../../../reference/core/control-center/gaps/gap-tracking.es.md) — varias escritas antes de que el Tracker existiera y superadas después (el `workspaceRef` opaco se conserva por compatibilidad; el contexto inline es el camino canónico):

| Costura real entregada hoy | Dónde | Seguimiento | Relación con el diseño objetivo |
|---|---|---|---|
| `workspaceRef` opaco emitido por el BFF de Tracker (campo DTO + resolver) | `apps/core-api/src/presentation/dtos/*.dto.ts`, `src/apps/core-api/src/application/services/workspace-reference-resolver.service.ts`, `src/packages/sdk-client/src/rest/types.ts` | [GT-117](../../../reference/core/control-center/gaps/gap-tracking.es.md) | Permite que Core-API acepte referencias de workspace provistas por Tracker sin acoplarse a él. |
| `POST /api/v1/phases/transition` (en vivo, solo REST) | `src/apps/core-api/src/presentation/controllers/phases.controller.ts` → `PhaseTransitionUseCase` | — | Hoy ejecuta transiciones `from → to`; la propiedad del `PhaseTransition` (§4.4 del diseño de interfaces) es el **objetivo**, aún no aplicado. |
| Value object `GateDecision` (ya nombrado en Core) | `src/packages/core-domain/src/gates/decision/gate-decision.ts` | [GT-316](../../../reference/core/control-center/gaps/gap-tracking.es.md) | Forma distinta al `GateDecision` objetivo (ver nota del diseño de interfaces §4.3) — un nombre ya ocupado en Core. |
| `validateWorkflow(definition)` — valida flujos provistos por Tracker contra invariantes de Core | `src/packages/core-domain/src/application/use-cases/validate-workflow.use-case.ts` | [GT-317](../../../reference/core/control-center/gaps/gap-tracking.es.md) | Costura tenant-agnóstica que Tracker invocará. |
| Capa de caché Redis para consumo de Core-API / MCP / Tracker | `src/apps/core-api` | [GT-249](../../../reference/core/control-center/gaps/gap-tracking.es.md) | Infraestructura compartida preparada para lecturas de Tracker. |
| Validación de integración extremo a extremo Core + Tracker + agentes | e2e de `src/packages/core-domain` | [GT-326](../../../reference/core/control-center/gaps/gap-tracking.es.md) | Costura de integración transversal. |

El [Diseño de Interfaces Técnicas de Tracker](./sdlc-tracker-technical-interfaces.es.md) (endpoints REST bajo `tracker.evolith.io`, las herramientas `evolith criterion evaluate` / `evolith gate assess`, los puertos de proveedores, el Evidence Graph, el Gate Decision Engine) es el diseño desde el que se arrancó el producto, **no una descripción de lo que expone hoy**; la superficie entregada está documentada en el repositorio del propio Tracker.

### Contrato de salida y de error (objetivo)

Se espera que las respuestas REST/MCP de Tracker reutilicen el sobre plano de Core ([ADR-0073](../../../reference/core/architecture/adrs/core/0073-unified-cli-output-contract.es.md)) — `meta.command`, `meta.executedAt`, `meta.durationMs`, `meta.correlationId`, `meta.context`, `meta.schemaVersion` — y RFC 9457 (`application/problem+json`) para errores, como hace Core-API hoy. El diseño de interfaces (§11) señala que ADR-0073 *sigue siendo válido pero requiere una decisión complementaria* para separar la semántica evaluación-versus-decisión antes de la implementación de Tracker.

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

El Tracker **no está lanzado ni es código abierto**: no hay paquete npm y el repositorio fuente es privado. Lo público son sus imágenes de contenedor (`ghcr.io/beyondnetcode/evolith-tracker-{api,gateway,web}`), que el [compose de UAT](../../infra/docker-compose.uat.yml) de este repositorio levanta junto a `core-api`, `mcp` y `agent-runtime` — ese fichero es lo más parecido a una guía de instalación hasta el lanzamiento, y es lo que corre el entorno UAT de la portada. Las costuras del lado de Core que consume se ejercitan con la [Core API](../core-api/README.es.md) en ejecución (`POST /api/v1/evaluate` con un contexto inline, `POST /api/v1/phases/transition`) y los [servicios MCP](../mcp-services/README.es.md).

Los estándares de contribución de este repositorio (clone/dev-setup, comandos de test, convenciones de rama/commit, autoría de doc/schema/ruleset/OPA) viven en el [CONTRIBUTING.md](../../../CONTRIBUTING.md) en la raíz del repo; las reglas propias del Tracker viven con su código.

---

La arquitectura detallada de este producto vive en [`architecture/`](./architecture/README.es.md).

---

[Volver a Diseños Específicos de Productos](../README.es.md)
