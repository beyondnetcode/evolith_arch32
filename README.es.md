<div align="center">

# Evolith: Framework de Gobernanza Arquitectónica Ejecutable

> **Navegación Bilingüe:** [English](./README.md)

[![Status](https://img.shields.io/badge/Status-Activo-brightgreen?style=for-the-badge)]()
[![Method](https://img.shields.io/badge/Method-Spec--driven_AI--DD-blueviolet?style=for-the-badge)]()
[![License](https://img.shields.io/badge/License-MIT-informational?style=for-the-badge)]()
[![CI](https://img.shields.io/github/actions/workflow/status/beyondnetcode/evolith_arch32/docs.yml?style=for-the-badge&label=CI)](https://github.com/beyondnetcode/evolith_arch32/actions)
[![Coverage](https://img.shields.io/badge/Docs-100%25-brightgreen?style=for-the-badge)](./COVERAGE_REPORT.md)

<br/>

<a href="./reference/governance/sdlc/assets/master-view.png" title="Visión General del Producto Evolith E2E — clic para ampliar">
  <img src="./reference/governance/sdlc/assets/master-view.png"
       alt="Visión General del Producto Evolith E2E"
       width="780"
       style="border-radius: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.3);" />
</a>

<sub>↑ Visión General del Producto Evolith E2E · MD3 — <i>clic para ampliar</i></sub>

<br/>

**Evolith es un framework de gobernanza arquitectónica ejecutable, no un corpus de documentación.** Codifica *cómo* se construye el software — a lo largo de ocho topologías de arquitectura — como rulesets verificables, ADRs y compuertas de fase que los equipos, las plataformas de entrega y los agentes de IA pueden ejecutar. La misma gobernanza llega a tu flujo de trabajo mediante tres interfaces: una **CLI**, un **servidor MCP** y una **API REST Core**.

> _**Arquitectura Progresiva:** la capacidad del framework para escalar un sistema mutando entre topologías según lo exige el ciclo de vida del negocio — previniendo el sobre-diseño y preservando la coherencia arquitectónica mediante ejecución automática._

</div>

---

## Qué es Evolith

Evolith convierte la gobernanza arquitectónica en una capacidad operativa. Los ADRs, rulesets, políticas, contratos e instrucciones de IA no son documentos pasivos — son artefactos autoritativos expuestos a través de canales de ejecución obligatorios, para que los equipos validen, consulten, generen y apliquen una arquitectura elegida *antes* de que el código llegue a producción.

Evolith Core define el **Qué** y el **Cómo** técnicos y permanece neutral respecto al proveedor y al runtime: sin acoplamiento a un lenguaje, nube, runtime o base de datos. El cuándo del negocio, la propiedad, la financiación y el ROI — el **Cuándo** y el **Quién** — viven fuera de Core y los gobierna Evolith Tracker.

## El ecosistema Evolith

Evolith Core es la base. La Suite entrega y demuestra esa base como productos en funcionamiento.

| Componente | Rol | En una línea | Hub |
| --- | --- | --- | --- |
| **Evolith Core** | Base | Constitución de ingeniería neutral al proveedor: principios, ADRs, rulesets, topologías y contratos que cada producto hereda. | [Hub de Core](./reference/core/README.es.md) |
| **Evolith Tracker** | Suite · Activo | Gobierna el ciclo de vida del negocio (Cuándo/Quién) y orquesta Core mediante su ACL y el Funnel 0. | [Hub de Tracker](./reference/products/evolith-tracker/README.es.md) |
| **Smart CLI** | Suite · Activo (v1.1.4) | Aplicación local: valida código, gestiona ADRs, ejecuta compuertas y fases contra tu topología. | [Hub de Smart CLI](./reference/products/smart-cli/README.es.md) |
| **Core API** | Suite · Activo (v0.0.1) | Servicio REST (versionado por URI `/api/v1`) para que los sistemas de orquestación consulten y evalúen la gobernanza de forma remota. | [Hub de Core API](./reference/products/core-api/README.es.md) |
| **Evolith MCP Services** | Suite · Activo | Gobernanza como contexto en vivo para LLMs y agentes — 27 tools, 9 resources, 8 prompts. Se distribuye dentro de `@evolith/smart-cli`. | [Hub de MCP Services](./reference/products/mcp-services/README.es.md) |
| **UMS Reference** | Suite · Modelo de referencia | El satélite UMS de código abierto es la referencia aplicada oficial que demuestra Core en la práctica. | [Hub de UMS Reference](./reference/products/ums-reference/README.es.md) |

Nuevo glosario de todo el ecosistema: **[Glosario del Ecosistema](./reference/governance/glossary-ecosystem.es.md)** (términos canónicos de fases, compuertas, topologías y productos).

## Conceptos clave

Dos ejes independientes — manténlos diferenciados.

- **Fases del SDLC** gobiernan el camino de la idea a producción. Las cinco fases de gobernanza son **Conception & Discovery**, **Design & Architecture**, **Construction**, **Validation & QA** y **Delivery & Operations**, cada una cerrada por una compuerta (Business Sign-Off, Design Baseline Approved, Successful Build, RC Stamped, Production Live). La CLI y la Core API direccionan estas fases con las claves operativas `discovery`, `design`, `construction`, `qa`, `release`.
- **Topologías** agrupan estilos de arquitectura. **F1–F5** son *niveles de madurez* en el eje progresivo (modular-monolith → distributed-modules → microservices, y luego madurez operativa) — **no** son fases del SDLC.

Evolith gobierna **8 topologías**, cada una un bounded context aislado con sus propios ADRs, políticas OPA, rulesets de IA y contratos UMS:

| Eje | Topologías |
| --- | --- |
| Progresivo | `modular-monolith` · `distributed-modules` · `microservices` |
| Integración | `event-driven` |
| Ejecución | `serverless` · `edge-computing` |
| Datos | `data-mesh` |
| IA | `agentic-ai` |

Descripciones y artefactos completos: **[Hub de Topologías](./reference/architecture/topologies/README.es.md)**.

## Inicio rápido

Instala el tooling oficial y valida un repositorio contra los rulesets de su topología.

```bash
# Inicializa un nuevo repositorio satélite
npx @evolith/smart-cli@1.1.4 init

# Valida el código contra los rulesets de la topología elegida
smart-cli validate

# Valida una fase específica del SDLC (claves: discovery | design | construction | qa | release)
smart-cli validate --phase qa

# Gestiona Architecture Decision Records
smart-cli adr create
smart-cli adr list

# Sirve la gobernanza como contexto en vivo para agentes de IA (MCP)
smart-cli mcp serve
```

Smart CLI incluye **20 comandos** (`adr`, `agents`, `alias`, `api`, `architecture`, `completion`, `docs`, `drift`, `fixtures`, `gate`, `history`, `init`, `mcp`, `phase`, `profile`, `sdlc`, `standards`, `update`, `upgrade`, `validate`) y se configura mediante **`evolith.yaml`**. Referencia completa: **[Hub de Smart CLI](./reference/products/smart-cli/README.es.md)**.

## Mapa de navegación

Esta tabla es la ruta más rápida al documento correcto. Cuando ya sepas qué artefacto necesitas, abre el [Índice Maestro Global](./reference/navigation/MASTER_INDEX.es.md).

| Quiero… | Ir a | Superficie |
| --- | --- | --- |
| Entender la constitución neutral al proveedor (principios, ADRs de Core, contratos) | [Hub de Evolith Core](./reference/core/README.es.md) | Hub de dominio |
| Gobernar el ciclo de vida (fases, compuertas, artefactos, trazabilidad) | [Centro de Gobernanza SDLC](./reference/governance/sdlc/README.es.md) | Hub de gobernanza |
| Usar o diseñar un producto de la Suite (Tracker, Smart CLI, Core API, MCP, UMS) | [Diseños de Producto](./reference/products/README.es.md) · [Product Suite](./reference/product-suite/README.es.md) | Hubs de producto |
| Elegir un estilo de arquitectura o topología | [Hub de Arquitectura](./reference/architecture/README.es.md) · [Topologías](./reference/architecture/topologies/README.es.md) | Hubs de arquitectura |
| Consultar estándares, taxonomías y el glosario del ecosistema | [Estándares y Gobernanza](./reference/governance/README.es.md) · [Glosario](./reference/governance/glossary-ecosystem.es.md) | Hub de gobernanza |
| Desplegar, ejecutar y operar (SRE, infra, compuertas de calidad) | [Hub de Operaciones](./reference/operations/README.es.md) | Hub de operaciones |
| Onboarding por rol (arquitecto, dev, QA/SRE, PM, agente de IA) | [Inicio por Rol](./reference/getting-started/README.es.md) | Onboarding |
| Revisar la salud de la suite (madurez, gaps, auditorías, evidencia) | [Tablero de Gaps](./reference/governance/standards/vision/gap-tracking.es.md) · [Hub de Madurez y Gaps](./reference/governance/standards/vision/README.es.md) | Hub de reportes |
| Configurar agentes de IA y el flujo asistido | [AGENTS.es.md](./AGENTS.es.md) | Reglas de agentes |
| Localizar cualquier artefacto directamente | [Índice Maestro Global](./reference/navigation/MASTER_INDEX.es.md) | Índice de navegación |

## Contribución

Antes de contribuir, lee la [Guía de Contribución](./CONTRIBUTING.es.md), la [Política de Seguridad](./SECURITY.es.md) y [AGENTS.es.md](./AGENTS.es.md) para las convenciones de agentes. Consulta la [Taxonomía del Repositorio](./reference/governance/standards/repository-taxonomy.md) para saber qué va dónde.

## Licencia

Publicado bajo la [Licencia MIT](./LICENSE).

---

<div align="center">
  <sub>Evolith — Framework de Gobernanza Arquitectónica Ejecutable | Corpus de Referencia Multi-Topología | Spec-driven AI-DD</sub>
</div>