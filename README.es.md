
# Evolith: Framework de Gobernanza Arquitectónica Ejecutable

> **Navegación Bilingüe:** [English](./README.md)

[![Status](https://img.shields.io/badge/Status-Activo-brightgreen?style=for-the-badge)]()
[![Method](https://img.shields.io/badge/Method-Spec--driven_AI--DD-blueviolet?style=for-the-badge)]()
[![License](https://img.shields.io/badge/License-MIT-informational?style=for-the-badge)]()
[![CI](https://img.shields.io/github/actions/workflow/status/beyondnetcode/evolith_arch32/docs.yml?style=for-the-badge&label=CI)](https://github.com/beyondnetcode/evolith_arch32/actions)

<br/>

<a href="./reference/governance/sdlc/assets/master-view.png" title="Visión General del Producto Evolith E2E — clic para ampliar">
  <img src="./reference/governance/sdlc/assets/master-view.png"
       alt="Visión General del Producto Evolith E2E"
       width="780"
       style="border-radius: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.3);" />
</a>

<sub>↑ Visión General del Producto Evolith E2E · MD3 — <i>clic para ampliar</i></sub>

</div>

---

## Menú

- [¿Qué es Evolith?](#qué-es-evolith)
- [¿Por qué Evolith?](#por-qué-evolith)
- [Conceptos Clave](#conceptos-clave)
- [Ecosistema de Productos](#ecosistema-de-productos)
- [Cómo Funciona](#cómo-funciona)
- [Visión de Arquitectura](#visión-de-arquitectura)
- [Componentes Principales](#componentes-principales)
- [Inicio Rápido](#inicio-rápido)
- [Documentación](#documentación)
- [Casos de Uso](#casos-de-uso)
- [Roadmap](#roadmap)
- [Contribución](#contribución)
- [Licencia](#licencia)

---

## ¿Qué es Evolith?

Evolith es un **framework de gobernanza arquitectónica ejecutable**. Codifica cómo se construye el software — a través de múltiples estilos de arquitectura — como reglas verificables, ADRs y compuertas de fase que equipos, plataformas y agentes de IA pueden ejecutar de verdad.

La gobernanza en Evolith no es un documento. Es una capacidad operativa expuesta a través de una CLI, un servidor MCP y una API REST.

---

## ¿Por qué Evolith?

La mayoría de proyectos acumulan ADRs y documentos de arquitectura que nadie lee y nadie aplica. Los sistemas se desvían. Las decisiones se olvidan. La consistencia se rompe en silencio.

Evolith hace que la gobernanza sea **ejecutable**:

- Las reglas se validan automáticamente, no se revisan manualmente.
- Las compuertas de fase bloquean el avance hasta que se cumplen los criterios de calidad.
- Los agentes de IA y los pipelines de CI consumen los mismos artefactos de gobernanza que los humanos.
- Las decisiones de arquitectura son trazables desde el ADR hasta el código en producción.

---

## Conceptos Clave

| Concepto | Qué es |
|---|---|
| **Fases SDLC** | Las cinco etapas de la idea a producción: Discovery → Design → Construction → QA → Delivery |
| **Compuertas** | Puntos de control automatizados que cierran cada fase antes de pasar a la siguiente |
| **Topologías** | Estilos de arquitectura (ej. monolito modular, microservicios, event-driven, agentic-AI) |
| **ADRs** | Architecture Decision Records — el registro autoritativo de decisiones arquitectónicas |
| **Blueprints** | Plantillas de diseño canónicas para cada topología |
| **Rulesets** | Reglas legibles por máquina aplicadas por la CLI y la Core API |
| **Políticas OPA** | Políticas de Open Policy Agent para controles de gobernanza granulares |
| **Artefactos** | Salidas estructuradas en cada fase: specs, schemas, manifests, contratos |
| **Agentes de IA** | Agentes especializados (Winston y otros) que participan en el SDLC como colaboradores de primer nivel |

Detalles completos: [Conceptos Core](./reference/core/README.es.md) · [Topologías](./reference/architecture/topologies/README.es.md)

---

## Ecosistema de Productos

Evolith se distribuye como una suite de productos coordinados sobre una base común.

| Producto                | Rol                                                                                                                          |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| **[Evolith Core](reference/README.es.md)**        | Constitución neutral al proveedor: principios, ADRs, rulesets, topologías y contratos                                        |
| **[Smart CLI](reference/products/smart-cli/README.es.md)**           | Aplicación local — valida código, ejecuta compuertas, gestiona ADRs, sirve MCP                                               |
| **[Core API](reference/products/core-api/README.es.md)**            | Servicio REST para consultas y evaluación de gobernanza de forma remota                                                      |
| **[MCP Services](reference/products/mcp-services/README.es.md)**        | Gobernanza como contexto en vivo para LLMs y agentes de IA (27 tools, 9 resources, 8 prompts)                                |
| **[Agent Runtime](reference/architecture/agent-runtime/README.es.md)**       | Capa de mediación agéntica — orquesta el Core mediante Puertos y Adaptadores; Hermes es uno de los adaptadores reemplazables |
| **[Evolith Tracker](reference/products/evolith-tracker/README.es.md)**     | Gobernanza del ciclo de vida del negocio — fases, propietarios, financiación y ROI                                           |
| **[Rulesets](rulesets/README.es.md)**            | Reglas de aplicación legibles por máquina por topología                                                                      |
| **[Políticas OPA](rulesets/opa/README.es.md)**       | Controles de política granulares integrados en el pipeline                                                                   |
| **[Schemas y Manifests](rulesets/schema/README.es.md)** | Contratos estructurados para artefactos y definiciones de topología                                                          |

---

## Cómo Funciona

```
Desarrollador / Agente de IA / Disparador Externo
        │
        ▼
  Smart CLI  ──────────────────────────────► Servidor MCP
  (aplicación local)                         (contexto para agentes de IA)
        │
        ▼
   Core API  ────────────────────────────►  Evolith Tracker
  (gobernanza remota)                        (ciclo de vida del negocio)
        │
        ▼
  Agent Runtime ───────────────────────────► Hermes (adaptador)
  (mediación agéntica, Puertos y Adaptadores) (.harness · OPA · Tracker · Memoria)
        │
        ▼
  Rulesets · Políticas OPA · ADRs · Blueprints
  (los artefactos de gobernanza compartidos)
```

1. **Smart CLI** valida el código localmente contra los rulesets y ejecuta las compuertas de fase.
2. **Core API** expone la misma gobernanza de forma remota para pipelines de CI y orquestadores.
3. **Servidor MCP** entrega contexto de gobernanza a LLMs y agentes de IA en tiempo real.
4. **Agent Runtime** orquesta las capacidades del Core mediante Puertos y Adaptadores — Hermes es uno de los adaptadores reemplazables.
5. **Evolith Tracker** coordina el lado del negocio — quién es responsable, qué está financiado, qué se entrega cuándo.

Todos los productos comparten los mismos artefactos definidos en **Evolith Core**.

---

## Visión de Arquitectura

Evolith gobierna **8 topologías** en cuatro ejes:

| Eje | Topologías |
|---|---|
| Progresivo | `modular-monolith` · `distributed-modules` · `microservices` |
| Integración | `event-driven` |
| Ejecución | `serverless` · `edge-computing` |
| Datos | `data-mesh` |
| IA | `agentic-ai` |

Cada topología tiene sus propios ADRs, políticas OPA, rulesets de IA y contratos UMS. Los sistemas migran entre topologías a medida que el negocio escala — esto es **Arquitectura Progresiva**.

Referencia completa: [Hub de Arquitectura](./reference/architecture/README.es.md) · [Arquitectura Maestra C4](./reference/architecture/C4-MASTER-ARCHITECTURE.es.md)

---

## Componentes Principales

```
evolith/
├── packages/agent-runtime/  # @evolith/agent-runtime — capa agéntica Puertos y Adaptadores
├── apps/agent-runtime-api/  # Servicio HTTP NestJS que envuelve el runtime (POST /v1/agent/handle)
├── reference/core/          # Constitución de ingeniería y principios
├── reference/architecture/  # Topologías, blueprints, ADRs y docs del agent-runtime
├── reference/governance/    # Fases SDLC, compuertas, estándares y glosario
├── reference/products/      # Smart CLI, Core API, MCP, Tracker, UMS
└── reference/operations/    # SRE, infra, compuertas de calidad
```

Punto de entrada para cada área: [Índice Maestro Global](./reference/navigation/MASTER_INDEX.es.md)

---

## Inicio Rápido

```bash
# Instala Smart CLI
npx @evolith/smart-cli@1.1.4 init

# Valida tu código contra los rulesets de tu topología
smart-cli validate

# Valida una fase específica del SDLC
smart-cli validate --phase qa

# Gestiona Architecture Decision Records
smart-cli adr create
smart-cli adr list

# Sirve la gobernanza como contexto en vivo para agentes de IA
smart-cli mcp serve
```

Smart CLI incluye **20 comandos** y se configura mediante **`evolith.yaml`**. Referencia completa: [Hub de Smart CLI](./reference/products/smart-cli/README.es.md)

---

## Documentación

| Área | Enlace |
|---|---|
| Constitución Core | [Hub de Evolith Core](./reference/core/README.es.md) |
| Arquitectura Maestra | [Arquitectura Maestra C4](./reference/architecture/C4-MASTER-ARCHITECTURE.es.md) |
| Gobernanza SDLC | [Centro de Gobernanza SDLC](./reference/governance/sdlc/README.es.md) |
| Topologías | [Hub de Topologías](./reference/architecture/topologies/README.es.md) |
| Smart CLI | [Hub de Smart CLI](./reference/products/smart-cli/README.es.md) |
| Core API | [Hub de Core API](./reference/products/core-api/README.es.md) |
| MCP Services | [Hub de MCP Services](./reference/products/mcp-services/README.es.md) |
| Agent Runtime | [Hub de Agent Runtime](./reference/architecture/agent-runtime/README.es.md) |
| Evolith Tracker | [Hub de Tracker](./reference/products/evolith-tracker/README.es.md) |
| Operaciones y SRE | [Hub de Operaciones](./reference/operations/README.es.md) |
| Onboarding por rol | [Inicio por Rol](./reference/getting-started/README.es.md) |
| Glosario del ecosistema | [Glosario](./reference/governance/glossary-ecosystem.es.md) |
| Seguimiento de gaps | [Tablero de Gaps](./reference/governance/standards/vision/gap-tracking.md) |
| Todos los artefactos | [Índice Maestro Global](./reference/navigation/MASTER_INDEX.es.md) |

---

## Casos de Uso

**Para equipos de ingeniería**
Aplica decisiones de arquitectura automáticamente. Ejecuta compuertas de fase en CI. Mantén los ADRs vivos y trazables.

**Para equipos de plataforma**
Consulta la gobernanza de forma remota vía Core API. Integra rulesets en pipelines de despliegue. Bloquea artefactos no conformes antes de que lleguen a producción.

**Para desarrollo asistido por IA**
Entrega contexto de gobernanza a LLMs a través de MCP. Permite que los agentes de IA validen sus propias salidas contra los rulesets de arquitectura antes de hacer commit.

**Para productos en crecimiento**
Empieza con un monolito modular. Migra a módulos distribuidos o microservicios cuando el negocio lo exija — Evolith rastrea la transición y aplica consistencia en cada paso.

---

## Roadmap

Consulta el tablero de seguimiento de gaps para prioridades actuales y elementos abiertos:

- [Tablero de Gaps](./reference/governance/standards/vision/gap-tracking.md)
- [Hub de Madurez y Gaps](./reference/governance/standards/vision/README.md)

---

## Contribución

Lee esto antes de abrir un PR:

- [Guía de Contribución](./CONTRIBUTING.es.md)
- [Política de Seguridad](./SECURITY.md)
- [AGENTS.es.md](./AGENTS.es.md) — convenciones para contribuidores agentes de IA
- [Taxonomía del Repositorio](./reference/governance/standards/repository-taxonomy.md) — qué va dónde

---

## Licencia

Publicado bajo la [Licencia MIT](./LICENSE).

---

<div align="center">
  <sub>Evolith — Framework de Gobernanza Arquitectónica Ejecutable | Corpus de Referencia Multi-Topología | Spec-driven AI-DD</sub>
</div>
