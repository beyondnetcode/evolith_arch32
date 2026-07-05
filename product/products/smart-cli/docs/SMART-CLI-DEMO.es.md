# Evolith Smart CLI — Demo y Guía Completa

> **Navegación Bilingüe:** [English Version](./SMART-CLI-DEMO.md)

**Versión:** 0.0.3-beta
**Paquete:** `@evolith/smart-cli`
**Repositorio:** [evolith_arch32](https://github.com/beyondnetcode/evolith_arch32)

---

## Tabla de Contenidos

1. [Introducción](#1-introducción)
2. [Inicio Rápido](#2-inicio-rápido)
3. [Instalación](#3-instalación)
4. [Configuración de evolith.yaml](#4-configuración-de-evolithyaml)
5. [Referencia de Comandos](#5-referencia-de-comandos)
6. [Flujo SDLC — Fase 0 a Fase 5](#6-flujo-sdlc--fase-0-a-fase-5)
7. [Guías por Tipo de Producto](#7-guías-por-tipo-de-producto)
8. [Servidor MCP e Integración con Agentes IA](#8-servidor-mcp-e-integración-con-agentes-ia)
9. [Validación de Arquitectura — F1/F2/F3](#9-validación-de-arquitectura--f1f2f3)
10. [Buenas Prácticas y Flujos de Trabajo Comunes](#10-buenas-prácticas-y-flujos-de-trabajo-comunes)
11. [Solución de Problemas y Preguntas Frecuentes](#11-solución-de-problemas-y-preguntas-frecuentes)

---

## 1. Introducción

### ¿Qué es Evolith Smart CLI?

Evolith Smart CLI es la interfaz de línea de comandos para el sistema de gobernanza de arquitectura Evolith. Permite a los equipos:

- **Inicializar** repositorios satélite con asistentes interactivos guiados
- **Validar** repositorios contra conjuntos de reglas de gobernanza legibles por máquina
- **Gestionar** el ciclo de vida completo del SDLC a través de puertas de fase con seguimiento de evidencia
- **Detectar** desviación arquitectónica a través de los niveles F1 (monolito modular), F2 (módulos distribuidos) y F3 (microservicios)
- **Integrar** con agentes IA mediante MCP (Model Context Protocol) para contexto de gobernanza en tiempo real

### Tres Modos de Operación

| Modo | Caso de Uso | Ejemplo |
|------|-------------|---------|
| **Interactivo** | Estación de trabajo del desarrollador, configuración guiada | `evolith init` |
| **Batch (CI/CD)** | Pipelines automatizados, salida JSON | `evolith validate --format json` |
| **MCP (IA)** | Integración con agentes IA, contexto en tiempo real | `evolith mcp serve` |

### Descripción General de la Arquitectura

```
┌─────────────────────────────────────────────────────────┐
│                    Evolith Core                         │
│  (Reference Corpus — Constitution, ADRs, Rulesets)      │
└──────────────────────┬──────────────────────────────────┘
                       │
                       │ pinned version
                       ▼
┌─────────────────────────────────────────────────────────┐
│                 Evolith Smart CLI                       │
│  ┌─────────┐ ┌──────────┐ ┌──────────┐ ┌────────────┐  │
│  │  Init   │ │ Validate │ │  SDLC    │ │   Drift    │  │
│  │ Command │ │ Command  │ │ Commands │ │  Command   │  │
│  └─────────┘ └──────────┘ └──────────┘ └────────────┘  │
│  ┌─────────┐ ┌──────────┐ ┌──────────┐ ┌────────────┐  │
│  │  Agents │ │   ADR    │ │   MCP    │ │  History   │  │
│  │ Command │ │ Command  │ │  Server  │ │  Command   │  │
│  └─────────┘ └──────────┘ └──────────┘ └────────────┘  │
└──────────────────────┬──────────────────────────────────┘
                       │
                       │ stdio / HTTP
                       ▼
┌─────────────────────────────────────────────────────────┐
│              AI Agents (Cursor, Claude)                 │
│         MCP Tools: validate, architecture, etc.         │
└─────────────────────────────────────────────────────────┘
```

---

## 2. Inicio Rápido

### Configuración en 5 Minutos: De Cero a Satélite Validado

```bash
# Step 1: Install the CLI
npm install -g @evolith/smart-cli@beta

# Step 2: Initialize a new satellite repository
mkdir my-project && cd my-project
evolith init

# Step 3: Validate against governance rules
evolith validate --format summary

# Step 4: Install AI agent rules
evolith agents install standard

# Step 5: Check your SDLC phase status
evolith sdlc gate-status
```

**Salida esperada después de la validación:**
```
┌   Evolith SDK - Validación de Estándares
│
◇  Analizando repositorio...
│
│  Status: passed
│  Rules checked: 12
│  Issues: 0
│
│  ✓ All governance rules satisfied
```

---

## 3. Instalación

### Vía npm (Recomendado)

```bash
npm install -g @evolith/smart-cli@beta
```

### Verificar Instalación

```bash
evolith --help
evolith mcp version
```

### Autocompletado de Shell

```bash
# Bash
evolith completion --install --shell bash

# Zsh
evolith completion --install --shell zsh

# Fish
evolith completion --install --shell fish
```

### Variables de Entorno

| Variable | Descripción | Valor por Defecto |
|----------|-------------|-------------------|
| `EVOLITH_CORE_PATH` | Ruta al repositorio Evolith Core | Directorio actual |
| `EVOLITH_CONFIG_PATH` | Ruta a evolith.yaml | Directorio actual |
| `EVOLITH_LOG_LEVEL` | Nivel de registro (DEBUG, INFO, WARN, ERROR) | INFO |
| `EVOLITH_API_KEY` | Clave API para modo MCP HTTP | (ninguna) |

---

## 4. Configuración de evolith.yaml

El archivo `evolith.yaml` es el contrato del satélite con Evolith Core. Declara el runtime, la arquitectura, la fase SDLC y la configuración de gobernanza.

### Configuración Mínima

```yaml
coreRef:
  version: "1.0.0"
  path: "../evolith"
governance:
  version: "1.0"
product:
  name: "my-project"
  type: "library"
```

### Configuración Completa

```yaml
coreRef:
  version: "1.0.0"
  path: "../evolith"
governance:
  version: "1.0"
product:
  name: "my-service"
  type: "service"
  runtime: "nodejs"
  architecture: "hexagonal"
  monorepo: "nx"
sdlc:
  currentPhase: 0
  targetPhase: 5
boundedContexts:
  - name: "orders"
    type: "domain"
  - name: "billing"
    type: "domain"
  - name: "shipping"
    type: "domain"
observability:
  logging: "structured"
  metrics: "dora"
  tracing: "distributed"
```

### Generar Configuración

```bash
# Create evolith.yaml interactively
evolith docs

# Create with minimal template
evolith docs --template minimal

# Force overwrite existing files
evolith docs --force
```

---

## 5. Referencia de Comandos

### evolith init

**Descripción:** Inicializa un repositorio satélite con un asistente interactivo guiado.

**Uso:**
```bash
evolith init [options]
```

**Opciones:**
| Opción | Descripción |
|--------|-------------|
| `--dry-run` | Muestra lo que se crearía sin escribir archivos |
| `--config <path>` | Ruta al archivo de configuración |
| `--runtime <id>` | Pre-seleccionar runtime (nodejs, dotnet, python, etc.) |
| `--monorepo <id>` | Pre-seleccionar estrategia de monorepo (none, nx, turborepo) |
| `--arch <type>` | Pre-seleccionar arquitectura (clean, hexagonal, ddd, layered) |
| `--db <type>` | Pre-seleccionar base de datos (postgresql, mongodb, sqlite, none) |

**Ejemplos:**

```bash
# Interactive mode (default)
evolith init

# Batch mode with pre-selected options
evolith init --runtime nodejs --arch hexagonal --monorepo none --db postgresql

# Dry run to preview changes
evolith init --dry-run
```

---

### evolith validate

**Descripción:** Valida un repositorio satélite contra los conjuntos de reglas de gobernanza de Evolith.

**Uso:**
```bash
evolith validate [options]
```

**Opciones:**
| Opción | Descripción |
|--------|-------------|
| `--format <type>` | Formato de salida: json, summary, table, markdown (predeterminado: markdown) |
| `--output <path>` | Escribe el informe en un archivo |
| `--satellite <path>` | Ruta al repositorio satélite (predeterminado: cwd) |
| `--core <path>` | Ruta a Evolith Core |
| `--ruleset <id>` | Valida solo un conjunto de reglas específico |
| `--architecture` | Incluye validación de arquitectura |
| `--arch-level <level>` | Nivel de arquitectura: F1, F2, F3, ALL |

**Ejemplos:**

```bash
# Quick validation with summary
evolith validate --format summary

# Full JSON report for CI/CD
evolith validate --format json --output report.json

# Validate specific satellite
evolith validate --satellite /path/to/satellite --format json

# Validate with architecture checks (F1 modular monolith)
evolith validate --architecture --arch-level F1

# Validate specific ruleset
evolith validate --ruleset acl
```

**Ejemplo de Salida JSON:**
```json
{
  "status": "passed",
  "rulesChecked": 12,
  "issues": [],
  "coreRef": "1.0.0",
  "timestamp": "2026-06-07T12:00:00.000Z"
}
```

---

### evolith sdlc

**Descripción:** Comandos de gestión de fases SDLC.

**Subcomandos:**

#### evolith sdlc handoff

Transiciona artefactos entre fases SDLC.

```bash
evolith sdlc handoff [options]
```

| Opción | Descripción |
|--------|-------------|
| `--from <phase>` | Fase origen (phase-0 hasta phase-4) |
| `--to <phase>` | Fase destino (phase-1 hasta phase-5) |
| `--artifacts` | Genera manifiesto de artefactos |
| `--validate` | Valida antes de la transición |
| `--force` | Omite advertencias de validación |

**Ejemplos:**
```bash
# Interactive handoff
evolith sdlc handoff

# Batch handoff from phase-0 to phase-1
evolith sdlc handoff --from phase-0 --to phase-1

# Handoff with artifact manifest
evolith sdlc handoff --from phase-1 --to phase-2 --artifacts
```

#### evolith sdlc gate-status

Muestra el estado actual de validación de la puerta de fase SDLC.

```bash
evolith sdlc gate-status
```

#### evolith sdlc generate

Genera andamiaje de código basado en artefactos SDLC.

```bash
evolith sdlc generate domain --from ddd-model.md
```

---

### evolith agents

**Descripción:** Gestiona conjuntos de reglas de agentes Evolith para integración con IA.

**Subcomandos:**

```bash
# Install an agent ruleset
evolith agents install <name> [options]

# List installed agents
evolith agents list

# Validate an agent ruleset
evolith agents validate <name>

# Upgrade an agent
evolith agents upgrade <name>

# Remove an agent
evolith agents remove <name>
```

**Opciones:**
| Opción | Descripción |
|--------|-------------|
| `--template <type>` | Plantilla: standard, minimal, enterprise |
| `--dir <path>` | Directorio donde instalar |
| `--dry-run` | Muestra lo que se instalaría |

**Ejemplos:**
```bash
# Install standard agent
evolith agents install standard

# Install enterprise agent to specific directory
evolith agents install enterprise --dir /path/to/project

# List all installed agents
evolith agents list

# Validate agent ruleset
evolith agents validate standard
```

---

### evolith adr

**Descripción:** Gestiona Registros de Decisiones de Arquitectura (ADR).

**Subcomandos:**

```bash
# Create a new ADR
evolith adr create --title "Use PostgreSQL for persistence" --status proposed

# List all ADRs
evolith adr list

# Get ADR details
evolith adr get --id 001

# Update ADR status
evolith adr update --id 001 --status accepted --reason "Team consensus"

# Generate ADR matrix
evolith adr matrix
```

**Opciones:**
| Opción | Descripción |
|--------|-------------|
| `--title <text>` | Título del ADR |
| `--status <status>` | Estado: proposed, accepted, deprecated, superseded |
| `--id <number>` | Número del ADR |
| `--reason <text>` | Motivo del cambio de estado |
| `--context <text>` | Contexto y declaración del problema |
| `--decision <text>` | Descripción de la decisión |
| `--consequences <text>` | Consecuencias de la decisión |

---

### evolith drift

**Descripción:** Detecta y rastrea la desviación arquitectónica.

**Uso:**
```bash
evolith drift [options]
```

**Opciones:**
| Opción | Descripción |
|--------|-------------|
| `--path <dir>` | Ruta al repositorio (predeterminado: cwd) |
| `--level <level>` | Nivel de arquitectura: F1, F2, F3 |
| `--json` | Salida como JSON |
| `--history` | Muestra historial de desviación |
| `--trend` | Muestra análisis de tendencia de desviación |

**Ejemplos:**
```bash
# Quick drift check
evolith drift

# JSON output for CI/CD
evolith drift --json

# View drift history
evolith drift --history

# Trend analysis
evolith drift --trend

# Check drift at F2 level
evolith drift --level F2 --json
```

---

### evolith history

**Descripción:** Visualiza y gestiona el historial de ejecución de comandos.

**Subcomandos:**

```bash
# List command history
evolith history list

# Get specific entry
evolith history get --id <id>

# Search history
evolith history search --query "validate"

# Show statistics
evolith history stats

# Clear history
evolith history clear

# Replay a command
evolith history replay --id <id>
```

---

### evolith standards

**Descripción:** Gestiona estándares y convenciones de ingeniería.

**Subcomandos:**

```bash
# Initialize standards
evolith standards init

# List standards
evolith standards list

# Get specific standard
evolith standards get --id <id>

# Validate against standards
evolith standards validate

# Export standards
evolith standards export --format json
```

---

### evolith docs

**Descripción:** Genera la documentación base.

**Uso:**
```bash
evolith docs [options]
```

**Opciones:**
| Opción | Descripción |
|--------|-------------|
| `--dry-run` | Muestra lo que se crearía |
| `--force` | Sobrescribe archivos existentes |
| `--template <type>` | Plantilla: default, minimal |

**Ejemplos:**
```bash
# Scaffold all documentation
evolith docs

# Dry run
evolith docs --dry-run

# Minimal template
evolith docs --template minimal

# Force overwrite
evolith docs --force
```

---

### evolith mcp

**Descripción:** Inicia el servidor MCP de Evolith para integración con agentes IA.

**Uso:**
```bash
evolith mcp serve [options]
evolith mcp version
```

**Opciones:**
| Opción | Descripción |
|--------|-------------|
| `--transport <type>` | Transporte: stdio (predeterminado), http |
| `--port <number>` | Puerto del servidor HTTP (predeterminado: 3000) |
| `--api-key <key>` | Clave API para autenticación |

**Ejemplos:**
```bash
# Start MCP server over stdio (for Cursor, Claude Desktop)
evolith mcp serve

# Start MCP server over HTTP
evolith mcp serve --transport http --port 3000

# Start with API key authentication
evolith mcp serve --transport http --port 3000 --api-key my-secret-key

# Check version
evolith mcp version
```

---

### evolith architecture scaffold

**Descripción:** Genera andamiaje de arquitectura usando la estrategia de espacio de trabajo Nx.

**Uso:**
```bash
evolith architecture scaffold [options]
```

**Opciones:**
| Opción | Descripción |
|--------|-------------|
| `--frontend <type>` | Framework frontend: react, angular, vue |
| `--orm <type>` | ORM: typeorm, prisma, none |

---

### evolith completion

**Descripción:** Instala scripts de autocompletado de shell.

**Uso:**
```bash
evolith completion [options]
```

**Opciones:**
| Opción | Descripción |
|--------|-------------|
| `--install` | Instala el script de autocompletado |
| `--shell <type>` | Shell: bash, zsh, fish |

---

## 6. Flujo SDLC — Fase 0 a Fase 5

Evolith define 5 fases SDLC con validación de puertas entre cada transición.

### Descripción General de Puertas de Fase

```
Phase 0          Phase 1          Phase 2          Phase 3          Phase 4          Phase 5
Discovery ─────► Specification ──► Design ────────► Construction ──► QA ────────────► Release
                 [Gate 1]         [Gate 2]         [Gate 3]         [Gate 4]         [Gate 5]
```

### Fase 0: Discovery

**Objetivo:** Definir el alcance del proyecto, priorización MoSCoW y decisiones iniciales de arquitectura.

**Comandos CLI:**
```bash
# Initialize the project
evolith init

# Scaffold documentation
evolith docs

# Install AI agent
evolith agents install standard

# Create MoSCoW analysis (via MCP)
# evolith-moscow-create with items

# Validate initial setup
evolith validate --format summary
```

**Artefactos de Evidencia:**
- `evolith.yaml` — Configuración del proyecto
- `README.md` — Descripción general del proyecto
- `AGENTS.md` — Configuración de agentes
- `MASTER_INDEX.md` — Índice de documentación

**Requisitos de la Puerta 1:**
- [ ] evolith.yaml existe y es válido
- [ ] Versión de referencia Core fijada
- [ ] Nombre y tipo de producto declarados
- [ ] Documentación generada

---

### Fase 1: Specification

**Objetivo:** Definir requisitos, crear ADRs, establecer estándares.

**Comandos CLI:**
```bash
# Transition from Phase 0 to Phase 1
evolith sdlc handoff --from phase-0 --to phase-1

# Create ADRs
evolith adr create --title "Use hexagonal architecture" --status proposed
evolith adr create --title "PostgreSQL as primary database" --status proposed

# Initialize standards
evolith standards init

# Validate
evolith validate --format summary
```

**Artefactos de Evidencia:**
- ADRs en `reference/core/architecture/adrs/`
- Estándares en `reference/core/sdlc/standards/`
- Documento de requisitos

**Requisitos de la Puerta 2:**
- [ ] Al menos 3 ADRs creados
- [ ] Estándares inicializados
- [ ] Requisitos documentados
- [ ] Puerta de Fase 0 superada

---

### Fase 2: Design

**Objetivo:** Diseñar Bounded Contexts, definir contratos, mapear arquitectura.

**Comandos CLI:**
```bash
# Transition to Phase 2
evolith sdlc handoff --from phase-1 --to phase-2

# Validate ACL rules
evolith validate --ruleset acl

# Scaffold architecture (if using Nx)
evolith architecture scaffold --frontend react --orm prisma

# Architecture validation (F1)
evolith validate --architecture --arch-level F1
```

**Artefactos de Evidencia:**
- Mapa de Bounded Contexts
- Definiciones de contratos
- Diagrama de arquitectura
- Modelo DDD (si aplica)

**Requisitos de la Puerta 3:**
- [ ] Bounded Contexts definidos
- [ ] Contratos entre contextos especificados
- [ ] Arquitectura validada a nivel F1
- [ ] Sin violaciones ACL bloqueantes

---

### Fase 3: Construction

**Objetivo:** Implementar funcionalidades, escribir pruebas, mantener la integridad de la arquitectura.

**Comandos CLI:**
```bash
# Transition to Phase 3
evolith sdlc handoff --from phase-2 --to phase-3

# Validate architecture (F1 - modular independence)
evolith validate --architecture --arch-level F1

# Check for drift
evolith drift --level F1

# View gate status
evolith sdlc gate-status
```

**Artefactos de Evidencia:**
- Código fuente
- Pruebas unitarias
- Pruebas de integración
- Compilación exitosa

**Requisitos de la Puerta 4:**
- [ ] Todas las funcionalidades implementadas según el diseño de la Fase 2
- [ ] Cobertura de pruebas unitarias alcanza el umbral
- [ ] Arquitectura validada a nivel F1
- [ ] No se detectó desviación arquitectónica

---

### Fase 4: QA

**Objetivo:** Aseguramiento de calidad, pruebas de rendimiento, revisión de seguridad.

**Comandos CLI:**
```bash
# Transition to Phase 4
evolith sdlc handoff --from phase-3 --to phase-4

# Validate architecture (F2 - contract boundaries)
evolith validate --architecture --arch-level F2

# Check drift at F2 level
evolith drift --level F2 --json

# View drift trend
evolith drift --trend
```

**Artefactos de Evidencia:**
- Resultados de pruebas QA
- Benchmarks de rendimiento
- Informe de revisión de seguridad
- Validación de arquitectura F2

**Requisitos de la Puerta 5:**
- [ ] Todas las pruebas QA superadas
- [ ] Umbrales de rendimiento alcanzados
- [ ] Revisión de seguridad completada
- [ ] Arquitectura validada a nivel F2

---

### Fase 5: Release

**Objetivo:** Despliegue en producción, configuración de monitoreo, finalización de documentación.

**Comandos CLI:**
```bash
# Transition to Phase 5
evolith sdlc handoff --from phase-4 --to phase-5

# Validate architecture (F3 - extraction readiness)
evolith validate --architecture --arch-level F3

# Final drift check
evolith drift --level F3 --trend

# View full history
evolith history stats
```

**Artefactos de Evidencia:**
- Despliegue en producción
- Paneles de monitoreo
- Runbook
- Documentación final

**Requisitos de la Puerta 6:**
- [ ] Despliegue en producción exitoso
- [ ] Monitoreo activo
- [ ] Runbook documentado
- [ ] Arquitectura validada a nivel F3 (si aplica)

---

## 7. Guías por Tipo de Producto

### Library

**Ideal para:** Utilidades compartidas, SDKs, paquetes sin runtime.

```bash
# Initialize
evolith init --runtime nodejs --arch clean --monorepo none

# evolith.yaml
product:
  name: "my-sdk"
  type: "library"
  runtime: "nodejs"
  architecture: "clean"
  monorepo: "none"

# Validate
evolith validate --format summary
```

**Estructura:**
```
my-sdk/
├── evolith.yaml
├── src/
│   ├── index.ts
│   └── core/
├── test/
├── README.md
└── AGENTS.md
```

---

### Service (Single)

**Ideal para:** APIs, microservicios, aplicaciones independientes.

```bash
# Initialize
evolith init --runtime nodejs --arch hexagonal --monorepo none --db postgresql

# evolith.yaml
product:
  name: "user-service"
  type: "service"
  runtime: "nodejs"
  architecture: "hexagonal"
  monorepo: "none"

# Scaffold (if applicable)
evolith architecture scaffold --orm prisma

# Validate
evolith validate --architecture --arch-level F1
```

**Estructura:**
```
user-service/
├── evolith.yaml
├── src/
│   ├── domain/
│   ├── application/
│   ├── infrastructure/
│   └── presentation/
├── test/
├── Dockerfile
├── README.md
└── AGENTS.md
```

---

### Modular Monolith (Nx)

**Ideal para:** Aplicaciones complejas con múltiples Bounded Contexts.

```bash
# Initialize
evolith init --runtime nodejs --arch ddd --monorepo nx --db postgresql

# evolith.yaml
product:
  name: "ecommerce-platform"
  type: "monolith"
  runtime: "nodejs"
  architecture: "ddd"
  monorepo: "nx"

boundedContexts:
  - name: "orders"
    type: "domain"
  - name: "billing"
    type: "domain"
  - name: "catalog"
    type: "domain"

# Scaffold Nx workspace
evolith architecture scaffold --frontend react --orm prisma

# Validate F1
evolith validate --architecture --arch-level F1
```

**Estructura:**
```
ecommerce-platform/
├── evolith.yaml
├── nx.json
├── apps/
│   └── web/
├── libs/
│   ├── orders/
│   │   ├── domain/
│   │   ├── application/
│   │   └── infrastructure/
│   ├── billing/
│   └── catalog/
├── Dockerfile
├── README.md
└── AGENTS.md
```

---

### Distributed (F3 Microservices)

**Ideal para:** Sistemas a gran escala que requieren despliegue independiente.

```bash
# Start as modular monolith
evolith init --runtime nodejs --arch ddd --monorepo nx

# After maturation, validate extraction readiness
evolith validate --architecture --arch-level F3

# Check drift at F3
evolith drift --level F3 --trend

# Each extracted service becomes its own satellite
# with its own evolith.yaml
```

**Proceso de Extracción:**
1. Validar preparación F3: `evolith validate --architecture --arch-level F3`
2. Asegurar que cada Bounded Context tenga:
   - `evolith.yaml` independiente
   - `Dockerfile` propio
   - Pipeline CI/CD independiente
   - Pruebas de contrato con otros contextos
3. Extraer a repositorios separados
4. Cada nuevo repositorio pasa por las Fases 0-5 independientemente

---

## 8. Servidor MCP e Integración con Agentes IA

### Iniciar el Servidor MCP

```bash
# stdio mode (for Cursor, Claude Desktop)
evolith mcp serve

# HTTP mode (for web-based integrations)
evolith mcp serve --transport http --port 3000

# With API key authentication
evolith mcp serve --transport http --port 3000 --api-key my-secret-key
```

### Configuración de Cursor AI

Agregar a `.cursor/mcp.json` en tu proyecto:

```json
{
  "mcpServers": {
    "evolith": {
      "command": "evolith",
      "args": ["mcp", "serve"]
    }
  }
}
```

### Configuración de Claude Desktop

Agregar a `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "evolith": {
      "command": "evolith",
      "args": ["mcp", "serve"]
    }
  }
}
```

### Herramientas MCP Disponibles

| Herramienta | Descripción | Ejemplo de Uso |
|-------------|-------------|----------------|
| `evolith-validate` | Validar repositorio contra reglas de gobernanza | Preguntar a IA: "Valida mi repositorio" |
| `evolith-agent-install` | Instalar un conjunto de reglas de agente | Preguntar a IA: "Instala el agente estándar" |
| `evolith-agent-list` | Listar agentes instalados | Preguntar a IA: "¿Qué agentes están instalados?" |
| `evolith-agent-validate` | Validar conjunto de reglas de agente | Preguntar a IA: "Valida el agente estándar" |
| `evolith-agent-upgrade` | Actualizar un agente | Preguntar a IA: "Actualiza el agente estándar" |
| `evolith-agent-remove` | Eliminar un agente | Preguntar a IA: "Elimina el agente enterprise" |
| `evolith-architecture-validate` | Validar arquitectura (F1/F2/F3) | Preguntar a IA: "Verifica mi arquitectura a nivel F1" |
| `evolith-sdlc-handoff` | Generar manifiesto de transición SDLC | Preguntar a IA: "Crea transición de fase-0 a fase-1" |
| `evolith-sdlc-status` | Mostrar estado de puerta de fase SDLC | Preguntar a IA: "¿Cuál es mi fase SDLC actual?" |
| `evolith-config-get` | Obtener valor de configuración | Preguntar a IA: "¿Cuál es mi versión de coreRef?" |
| `evolith-config-set` | Establecer valor de configuración | Preguntar a IA: "Establece el tipo de producto a service" |
| `evolith-metrics` | Obtener métricas del servidor MCP | Preguntar a IA: "Muestra las métricas del servidor" |
| `evolith-moscow-create` | Crear análisis MoSCoW | Preguntar a IA: "Crea MoSCoW para fase-0" |
| `evolith-moscow-load` | Cargar análisis MoSCoW | Preguntar a IA: "Carga mi análisis MoSCoW" |
| `evolith-moscow-update` | Actualizar elemento MoSCoW | Preguntar a IA: "Actualiza este elemento a Must Have" |
| `evolith-moscow-remove` | Eliminar elemento MoSCoW | Preguntar a IA: "Elimina este elemento" |
| `evolith-moscow-list` | Listar análisis MoSCoW | Preguntar a IA: "Lista todos los análisis MoSCoW" |
| `evolith-moscow-validate` | Validar análisis MoSCoW | Preguntar a IA: "Valida mi MoSCoW" |
| `evolith-moscow-report` | Generar informe MoSCoW | Preguntar a IA: "Genera un informe MoSCoW" |

### Recursos MCP Disponibles

| URI de Recurso | Descripción |
|----------------|-------------|
| `evolith://rulesets` | Todos los conjuntos de reglas de gobernanza |
| `evolith://phase-gates` | Definiciones de puertas de fase SDLC |
| `evolith://agents` | Plantillas de agentes disponibles |
| `evolith://governance-version` | Versión de gobernanza |
| `evolith://core-version` | Versión de referencia Core |
| `evolith://repository-config` | Configuración actual del repositorio |
| `evolith://moscow-analysis` | Análisis MoSCoW |
| `evolith://acl-rules` | Reglas de capa anti-corrupción |

### Prompts MCP Disponibles

| Prompt | Descripción |
|--------|-------------|
| `evolith/validate-repository` | Guía para validación de repositorio |
| `evolith/agent-onboarding` | Guía para instalación de agentes |
| `evolith/architecture-review` | Guía para revisión de arquitectura |
| `evolith/phase-gate-check` | Guía para validación de puerta de fase |
| `evolith/sdlc-handoff` | Guía para transición SDLC |
| `evolith/ruleset-analysis` | Guía para análisis de conjuntos de reglas |
| `evolith/moscow-prioritization` | Guía para priorización MoSCoW |

---

## 9. Validación de Arquitectura — F1/F2/F3

### F1: Monolito Modular

**Valida:** Independencia modular, límites de capas, estructura del espacio de trabajo.

```bash
# Validate at F1 level
evolith validate --architecture --arch-level F1

# Check drift at F1
evolith drift --level F1
```

**Reglas Verificadas:**
- F1-01: Espacio de trabajo monorepo detectado (SHOULD)
- F1-02: Múltiples Bounded Contexts presentes (SHOULD)
- Violaciones de capa: domain → infrastructure (MUST, bloqueante)
- Inversión de dependencias: ORM/framework en capa domain (MUST, bloqueante)

### F2: Módulos Distribuidos

**Valida:** Límites de contratos, dependencias circulares, aislamiento de contextos.

```bash
# Validate at F2 level
evolith validate --architecture --arch-level F2

# Check drift at F2
evolith drift --level F2 --json
```

**Reglas Verificadas:**
- F2-01: Sin dependencias circulares entre módulos (MUST, bloqueante)
- Acoplamiento de contextos: importaciones directas entre contextos (MUST, bloqueante)
- Límites de contratos respetados
- Métricas de acoplamiento dentro de los umbrales

### F3: Microservicios

**Valida:** Preparación para extracción, containerización, despliegue independiente.

```bash
# Validate at F3 level
evolith validate --architecture --arch-level F3

# Check drift at F3
evolith drift --level F3 --trend
```

**Reglas Verificadas:**
- F3-01: Tipo de producto declarado para preparación de extracción (SHOULD)
- F3-02: Dockerfile presente para containerización (SHOULD)
- Desplegabilidad independiente
- Patrón de base de datos por servicio

### Modo de Análisis Profundo

La validación de arquitectura admite análisis estático profundo que va más allá de las verificaciones superficiales:

```bash
# Via CLI (deep mode enabled through validate command)
evolith validate --architecture --arch-level F1

# Via MCP tool
# evolith-architecture-validate with deep=true
```

**El Análisis Profundo Detecta:**
- Violaciones del grafo de importaciones entre capas
- Métricas de acoplamiento de Bounded Contexts
- Problemas de inversión de dependencias (ORM, frameworks web en domain)
- Acoplamiento afferent/efferent por contexto
- Métricas de inestabilidad

---

## 10. Buenas Prácticas y Flujos de Trabajo Comunes

### Flujo de Trabajo Diario del Desarrollador

```bash
# Morning: Check status
evolith sdlc gate-status

# Before commit: Validate
evolith validate --format summary

# Fix issues, then commit
git add . && git commit -m "fix: resolve governance violations"
```

### Revisión Semanal de Arquitectura

```bash
# Review ADRs
evolith adr matrix

# Check drift trends
evolith drift --trend

# View command history stats
evolith history stats
```

### Integración con Pipeline CI/CD

```yaml
# GitHub Actions example
name: Evolith Validation
on: [push, pull_request]
jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm install -g @evolith/smart-cli@beta
      - name: Validate governance
        run: evolith validate --format json --output report.json
      - name: Check architecture
        run: evolith validate --architecture --arch-level F1 --format json
      - name: Check drift
        run: evolith drift --json --output drift-report.json
      - name: Upload reports
        uses: actions/upload-artifact@v4
        with:
          name: evolith-reports
          path: "*.json"
```

### Hook Pre-commit

```bash
#!/bin/bash
# .husky/pre-commit
evolith validate --format summary --satellite . || exit 1
```

### Aplicación de Paridad Bilingüe

```bash
# Check bilingual coverage
node .harness/scripts/bilingual-coverage.mjs

# Check structural parity
node .harness/scripts/ci/04-check-bilingual-parity.mjs

# Validate all documentation
node .harness/scripts/ci/01-validate-docs.mjs
```

---

## 11. Solución de Problemas y Preguntas Frecuentes

### Errores Comunes

| Error | Causa | Solución |
|-------|-------|----------|
| `evolith.yaml not found` | No existe archivo de configuración | Ejecutar `evolith init` o `evolith docs` |
| `Core reference not found` | Ruta Core inválida | Actualizar `coreRef.path` en evolith.yaml |
| `Phase transition failed` | Faltan artefactos de evidencia | Ejecutar `evolith sdlc gate-status` para ver requisitos |
| `Architecture validation failed` | Violaciones de capa detectadas | Ejecutar `evolith drift` para identificar violaciones |
| `MCP server already running` | Puerto en uso | Usar puerto diferente: `--port 3001` |
| `Agent install failed` | Plantilla no encontrada | Usar `evolith agents list` para ver plantillas disponibles |

### Códigos de Salida

| Código | Significado |
|--------|-------------|
| 0 | Éxito |
| 1 | Validación fallida / Error |
| 124 | Timeout |

### Referencia de Variables de Entorno

| Variable | Descripción | Valor por Defecto |
|----------|-------------|-------------------|
| `EVOLITH_CORE_PATH` | Ruta a Evolith Core | Directorio actual |
| `EVOLITH_CONFIG_PATH` | Ruta a evolith.yaml | Directorio actual |
| `EVOLITH_LOG_LEVEL` | Nivel de registro | INFO |
| `EVOLITH_API_KEY` | Clave API MCP HTTP | (ninguna) |
| `PORT` | Puerto del servidor HTTP | 3000 |

### Preguntas Frecuentes

**P: ¿Puedo usar Evolith con proyectos existentes?**
R: Sí. Ejecuta `evolith init` en el directorio de tu proyecto existente para generar la configuración `evolith.yaml`.

**P: ¿Cómo actualizo cuando Evolith Core se actualiza?**
R: Ejecuta `evolith upgrade --dry-run` para previsualizar cambios, luego `evolith upgrade` para aplicar.

**P: ¿Puedo omitir una puerta de fase?**
R: Las puertas de fase son aplicadas por el CLI. Usa `--force` en `sdlc handoff` para omitir advertencias de validación, pero no es recomendado.

**P: ¿Cómo integro con mi CI/CD?**
R: Usa `--format json` y `--output report.json` para salida legible por máquina. Consulta los ejemplos de integración CI/CD arriba.

**P: ¿Cuál es la diferencia entre F1, F2 y F3?**
R: F1 valida la estructura de monolito modular. F2 valida los límites de módulos distribuidos. F3 valida la preparación para extracción de microservicios. Cada nivel se construye sobre el anterior.

**P: ¿Puedo usar Evolith sin agentes IA?**
R: Sí. El CLI funciona de forma independiente. El servidor MCP es opcional para integración con IA.

---

*Este documento forma parte del corpus de referencia de Evolith. Para la visión completa, consulta [Evolith Product Vision Master](../../../product-suite/vision/evolith-product-vision-master.es.md).*

---
[Volver al Índice de Documentación CLI](../README.es.md)
