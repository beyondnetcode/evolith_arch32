# Evolith CLI

> Hub de producto de **`@beyondnet/evolith-cli`** — el punto de entrada por línea de comandos al ecosistema Evolith: gobernanza, validación de estándares, andamiaje de arquitectura, gestión del ciclo de vida SDLC e integración con agentes de IA (MCP).

| | |
|---|---|
| **Estado** | Activo |
| **Paquete** | `@beyondnet/evolith-cli` |
| **Versión** | `1.1.4` |
| **Binario** | `evolith-cli` |
| **Fuente de verdad** | [`src/sdk/cli/README.md`](../../../src/sdk/cli/README.md) (autoritativo, 1200+ líneas) |
| **Inventario de superficie** | [`product-inventory.md`](./product-inventory.md) (generado — no editar a mano) |

Esta página es un **hub**: te orienta y te dirige a la documentación profunda autoritativa. Para las opciones exhaustivas de cada comando, remítete siempre al [README de código](../../../src/sdk/cli/README.md) y al [Inventario de Superficie de Producto](./product-inventory.md) generado.

> **Manual de uso — [Usando la CLI](../../../reference/core/interfaces/using-the-cli.md).** Guía legible y orientada a tareas de cada comando, subcomando, opción y combinación, con ejemplos reales. Parte del [hub de How-To de interfaces](../../../reference/core/interfaces/README.md) (CLI · MCP · REST) con catálogos por fase SDLC y playbooks.

## Qué hace

- **Gobernanza** — gestión de ADRs, seguimiento de estándares, instalación de agentes BMAD.
- **Validación** — cumplimiento del repositorio contra rulesets, topologías, ADRs y gates SDLC de Evolith (motor componible, GT-312).
- **Arquitectura** — andamiaje y detección de deriva a lo largo del eje progresivo de madurez.
- **Ciclo de vida SDLC** — gates de fase, transiciones, artefactos de handoff y métricas DORA.
- **Integración con IA** — un servidor MCP listo para producción (stdio + HTTP) para Cursor, Claude Desktop y agentes propios.

## Instalación

```bash
npm install -g @beyondnet/evolith-cli
# o: pnpm add -g @beyondnet/evolith-cli
# o: yarn global add @beyondnet/evolith-cli
```

O descarga un binario desde [GitHub Releases](https://github.com/beyondnetcode/evolith_arch32/releases) y añádelo a tu PATH.

```bash
evolith-cli --version
# evolith-cli version 1.1.4
```

## Inicio rápido

```bash
# 1. Genera un proyecto de demostración para explorar la CLI
evolith-cli fixtures --type demo

# 2. Inicializa un repositorio real (crea evolith.yaml)
evolith-cli init

# 3. Genera la documentación base
evolith-cli docs

# 4. Valida el cumplimiento
evolith-cli validate

# 5. Conecta un agente de IA
evolith-mcp
```

## Referencia de comandos

La CLI registra **21 comandos de nivel superior** (el inventario generado cuenta subcomandos por separado, de ahí una cifra mayor). Una línea concisa por cada uno — para las opciones y ejemplos completos, sigue el enlace al [README de código](../../../src/sdk/cli/README.md).

| Comando | Propósito |
|---|---|
| `init` | Inicializa un repositorio satélite (crea `evolith.yaml` y la estructura del proyecto). |
| `init-wizard` | Asistente interactivo para la inicialización guiada del proyecto (alternativa a `init`). |
| `docs` | Genera la documentación base (`README.md`, `AGENTS.md`, `MASTER_INDEX.md`, `evolith.yaml`). |
| `validate` | Valida el cumplimiento del repositorio contra rulesets, topologías, ADRs y fases SDLC (la validación de arquitectura se ejecuta vía `validate --topology`). |
| `adr` | Gestiona Architecture Decision Records (create, list, get, update, matrix). |
| `standards` | Gestiona estándares de gobernanza (init, list, get, validate, export). |
| `agents` | Instala, lista y elimina agentes BMAD de Evolith. |
| `scaffold` | Genera un satélite a lo largo del eje de madurez progresivo (fase 1 modular-monolith → 2 distributed-modules → 3 microservicios). |
| `drift` | Detecta la deriva de arquitectura respecto a la topología declarada; registra historial y tendencias. |
| `gate` | Evalúa los gates de fase SDLC y emite artefactos `GateEvidence` (ADR-0073). |
| `phase` | Propone una transición entre fases SDLC (emite un artefacto de propuesta). |
| `sdlc` | Orquesta artefactos y ciclo de vida SDLC (`handoff`, `generate`, `gate-status`). |
| `profile` | Gestiona perfiles de CLI con nombre (valores por defecto por entorno). |
| `fixtures` | Genera archivos de fixtures reproducibles para demos, pruebas y onboarding. |
| `api` | Explora e inspecciona la superficie de la API de Evolith (herramientas MCP, recursos, esquemas, comandos). |
| `mcp` | Ejecuta el servidor MCP para integración con agentes de IA (stdio o HTTP). |
| `alias` | Gestiona alias abreviados para comandos de la CLI. |
| `history` | Visualiza y gestiona el historial de ejecución de comandos. |
| `completion` | Genera e instala scripts de autocompletado de shell (bash, zsh, fish). |
| `update` | Comprueba y aplica actualizaciones de la CLI. |
| `upgrade` | Actualiza un repositorio satélite a la siguiente topología del eje progresivo o versión de gobernanza. |

## Modos de validación (motor componible — GT-312)

La validación es componible, no rígida — puedes entrar desde cualquier combinación de inputs y el motor resuelve el alcance óptimo.

| Modo | Ejemplo | Valida |
|---|---|---|
| SDLC | `evolith-cli validate --phase discovery` | Fase → gate → artefactos → esquemas → rulesets → ADRs → criterios de bloqueo |
| Arquitectura | `evolith-cli validate --topology modular-monolith` | Reglas de topología, límites hexagonales, aislamiento de dominio, multi-tenencia |
| Ruleset | `evolith-cli validate --ruleset evidence` | Un ruleset específico (motor native u OPA) |
| ADR | `evolith-cli validate --adr adr-0002` | Reglas arquitectónicas específicas de un ADR |
| Ad-hoc | `evolith-cli validate --file src/domain/user.ts` | Un único archivo o componente |
| Componible | `evolith-cli validate --topology microservices --ruleset evidence` | Varios puntos de entrada combinados |

**Claves de fase SDLC** (los valores de `--phase` aceptados por la CLI y la API de `@beyondnet/evolith-sdk-client`): `discovery`, `design`, `construction`, `qa`, `release`. Mapean a las fases de gobernanza f1–f5 — *Conception & Discovery*, *Design & Architecture*, *Construction*, *Validation & QA*, *Delivery & Operations* — ver [Fases y gates](#fases-y-gates-sdlc) más abajo. Las claves heredadas `f1`–`f5` están **obsoletas** como valores de `--phase`; usa las claves canónicas anteriores.

```bash
# Comprobación básica de cumplimiento
evolith-cli validate

# Salida JSON para CI (envelope ADR-0073)
evolith-cli validate --format json --output report.json

# Evaluación de fase SDLC (pipeline GT-281)
evolith-cli validate --phase discovery

# Motor OPA contra un ruleset específico
evolith-cli validate --engine opa --ruleset acl
```

## Topologías soportadas

Cualquier comando que acepte `--topology` referencia los **8 ids canónicos de topología** por su dimensión:

| Topología (id) | Dimensión |
|---|---|
| `modular-monolith` | eje-progresivo |
| `distributed-modules` | eje-progresivo |
| `microservices` | eje-progresivo |
| `serverless` | ejecución |
| `edge-computing` | ejecución |
| `event-driven` | integración |
| `data-mesh` | datos |
| `agentic-ai` | ia |

El **eje progresivo** (`modular-monolith → distributed-modules → microservices`) es una progresión lineal de madurez. Las demás dimensiones (ejecución, integración, datos, ia) son complementarias y se eligen según las necesidades del proyecto. Los flags heredados `F1/F2/F3` mapean al eje progresivo pero están **obsoletos** — usa los ids canónicos.

## Fases y gates SDLC

F1–F5 son **niveles de madurez** en el eje progresivo de arquitectura, no fases SDLC. El ciclo de vida SDLC es un modelo independiente:

| Fase de gobernanza | Nombre corto | Clave CLI `--phase` | Gate |
|---|---|---|---|
| Conception & Discovery | Discovery | `discovery` | Business Sign-Off |
| Design & Architecture | Architecture | `design` | Design Baseline Approved |
| Construction | Build | `construction` | Successful Build |
| Validation & QA | Validation | `qa` | RC Stamped |
| Delivery & Operations | Delivery | `release` | Production Live |

La fase final del SDLC es **Delivery & Operations**. Evalúa gates y emite evidencia con `evolith-cli gate evaluate --phase <clave>`; propón transiciones con `evolith-cli phase advance`.

## Servidor MCP (integración con agentes de IA)

La CLI puede arrancar el servidor MCP con `evolith-mcp`, que expone la superficie completa de Evolith a los agentes de IA. Internamente este comando imprime una advertencia de deprecación y delega de forma perezosa (lazy) en el **paquete independiente `@beyondnet/evolith-mcp`** (una dependencia de la CLI). `evolith-cli mcp` será removido en una futura versión mayor — migra a `npx @beyondnet/evolith-mcp serve` (o el binario `evolith-mcp serve`). Consulta el [producto MCP Services](../mcp-services/README.md) para la superficie autoritativa.

| Superficie | Cantidad |
|---|---|
| Herramientas | 27 |
| Recursos | 9 |
| Prompts | 8 |
| Transportes | `stdio` (JSON-RPC 2.0) · Streamable HTTP (clave API, fail-closed) |

El conjunto exacto de herramientas/recursos/prompts se enumera en el [Inventario de Superficie de Producto](./product-inventory.md) generado y se puede explorar en vivo con `evolith-cli api --list --category tools`. Trátalos como la autoridad en lugar de cualquier lista mantenida a mano.

```bash
# Transporte stdio (por defecto — Cursor, Claude Desktop)
evolith-mcp

# Transporte HTTP con autenticación por clave API (remoto / contenedorizado)
evolith-mcp --transport http --port 3000 --api-key <secret>
```

**Cursor** (`~/.cursor/mcp.json`) / **Claude Desktop** (`~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "evolith": {
      "command": "evolith-cli",
      "args": ["mcp", "serve"]
    }
  }
}
```

## Configuración

Evolith usa **`evolith.yaml`** en `.evolith/` o en la raíz del repositorio:

```yaml
coreRef:
  version: "1.0.0"
  path: "../../evolith"

governance:
  version: "1.0"
  adrRegistry:
    - id: "ADR-0001"
      status: "accepted"

product:
  name: "my-project"
  type: "library"
  runtime: "typescript"
  topology: "modular-monolith"
```

Los valores por defecto opcionales que consume `validate` (topología, fase, rulesets, engine) también viven en `evolith.yaml` — `evolith-cli validate` sin flags los lee. Usa una clave de fase canónica (`discovery`…`release`) y un id de topología canónico.

## Dónde encaja en Evolith

Evolith CLI forma parte de la **suite Evolith**, construida sobre **Evolith Core** (`src/packages/core`, `core-domain`, `infra-providers`, `sdk-client`, `mcp-tools`). Productos hermanos: **Evolith Tracker**, **Core API** (`src/apps/core-api`), **Evolith MCP Services** y el modelo de referencia **UMS Reference**.

## Documentación

- [README de código](../../../src/sdk/cli/README.md) — autoritativo, referencia completa por comando y ejemplos.
- [Inventario de Superficie de Producto](./product-inventory.md) — recuentos generados de herramientas/recursos/prompts/comandos.
- [Guía de demostración](../../../src/sdk/cli/docs/SMART-CLI-DEMO.md) — recorrido de extremo a extremo.
- [Integración MCP](../../../src/sdk/cli/docs/MCP-INTEGRATION.md) — detalles del protocolo MCP.
- [Protocolo de Handoff](../../../src/sdk/cli/docs/HANDOFF-PROTOCOL.md) — especificación del artefacto de handoff SDLC.

## Documentación Adicional

El material más profundo vive en [`docs/`](./docs/):

| Documento | Contenido |
| :--- | :--- |
| [Visión](./docs/VISION.es.md) | Visión y posicionamiento del producto |
| [Integración MCP](./docs/MCP-INTEGRATION.es.md) | Cómo la CLI expone y consume MCP |
| [Protocolo de Handoff](./docs/HANDOFF-PROTOCOL.es.md) | Contrato de handoff entre agentes |
| [Modelos de Datos](./docs/data-models.es.md) | Estructuras de datos canónicas |
| [Demo](./docs/SMART-CLI-DEMO.es.md) | Recorrido de una sesión completa |

## Soporte

- [Issue Tracker](https://github.com/beyondnetcode/evolith_arch32/issues)
- [Discussions](https://github.com/beyondnetcode/evolith_arch32/discussions)
