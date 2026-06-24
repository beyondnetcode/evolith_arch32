# Motor de Orquestación de Agentes BMAD

> **Navegación Bilingüe:** [English Version](./README.md)

**Propósito:** Ejecuta flujos de trabajo BMAD de extremo a extremo, coordinando agentes a través de secuenciación de pasos con dependencias, con seguimiento de estado y validación de traspasos.

## Resumen

El motor de orquestación automatiza la ejecución de flujos de trabajo multi-agente BMAD. Analiza definiciones de flujos de trabajo, gestiona transiciones de estado de pasos, despacha trabajo a agentes y aplica contratos de traspaso entre pasos.

## Arquitectura

```
┌─────────────────────────────────────────────────────────────┐
│                    orchestrate.mjs                          │
│                    (Punto de Entrada)                       │
└─────────────────────┬───────────────────────────────────────┘
                      │
       ┌──────────────┼──────────────┬──────────────┐
       ▼              ▼              ▼              ▼
┌──────────┐  ┌──────────────┐  ┌──────────┐  ┌──────────────┐
│ Workflow │  │    State     │  │   Step   │  │  Artifact    │
│  Parser  │  │   Machine    │  │ Executor │  │  Registry    │
└──────────┘  └──────────────┘  └──────────┘  └──────────────┘
       │              │              │              │
       └──────────────┴──────────────┴──────────────┘
                      │
                      ▼
              ┌──────────────┐
              │   Handoff    │
              │   Enforcer   │
              └──────────────┘
```

## Componentes

| Componente | Archivo | Propósito |
|------------|---------|-----------|
| **Analizador de Flujo** | `workflow-parser.mjs` | Lee flujos YAML, valida grafo de dependencias (sin ciclos) |
| **Máquina de Estados** | `state-machine.mjs` | Gestiona estados de pasos con persistencia atómica |
| **Ejecutor de Pasos** | `step-executor.mjs` | Despacha a agentes o scripts CI |
| **Registro de Artefactos** | `artifact-registry.mjs` | Rastrea entregables con hash de archivos |
| **Validador de Traspasos** | `handoff-enforcer.mjs` | Valida salidas antes del siguiente paso |

## Máquina de Estados

Los pasos progresan a través de estados:

```
pending → ready → running → completed
                   ↓         ↓
                 failed    blocked
                   ↓
                 ready (reintento)
```

| Estado | Descripción |
|--------|-------------|
| `pending` | Estado inicial, dependencias aún no cumplidas |
| `ready` | Todas las dependencias completadas, listo para ejecutar |
| `running` | Ejecutándose actualmente |
| `completed` | Terminado exitosamente |
| `failed` | Ejecución fallida (se puede reintentar) |
| `blocked` | No se puede proceder (se puede reintentar) |

## Uso

### Ejecución Seca (analizar y mostrar plan)

```bash
node .bmad-core/engine/orchestrate.mjs governance-gap --dry-run
```

### Ejecutar Flujo de Trabajo

```bash
node .bmad-core/engine/orchestrate.mjs governance-gap
```

### Verificar Estado de Instancia

```bash
node .bmad-core/engine/orchestrate.mjs --status <instance-id>
```

### Listar Todas las Instancias

```bash
node .bmad-core/engine/orchestrate.mjs --list
```

### Generar Reporte de Traspaso

```bash
node .bmad-core/engine/orchestrate.mjs --report <instance-id>
```

## Formato YAML de Flujo de Trabajo

```yaml
name: Nombre del Flujo
description: Qué hace este flujo
version: 1.0.0

steps:
  - id: step-id
    agent: analyst|pm|architect|sm|dev|qa|devops|docs
    action: >
      Descripción de lo que el agente debe hacer.
    deliverable: "ruta/salida.md"
    dependsOn: [id-paso-anterior]
    validationScripts:
      - ci/01-validate-docs.mjs
    schemaRef: ruta/a/schema.json
```

## Tipos de Agentes

| Agente | Rol |
|--------|-----|
| `analyst` | Análisis de requisitos y especificación funcional |
| `pm` | Requisitos de producto y definición UX |
| `architect` | Arquitectura técnica y patrones de diseño |
| `sm` | Desglose de tareas y planificación de sprints |
| `dev` | Implementación y desarrollo de código |
| `qa` | Aseguramiento de calidad y validación |
| `devops` | Operaciones, CI/CD y registro de evidencia |
| `docs` | Documentación y paridad bilingüe |

## Persistencia de Estado

Todo el estado se persiste atómicamente en `.bmad-core/state/`:

- `workflow-instances.json` — Instancias activas con estados de pasos
- `artifact-manifest.json` — Registro de todos los artefactos con hashes

## Idempotencia

El motor es idempotente:
- Re-ejecutar un paso completado es una operación nula
- Las transiciones de estado se validan (transiciones inválidas lanzan errores)
- El registro de artefactos se deduplica por ruta

## Manejo de Errores

- El análisis de flujos valida estructura y grafo de dependencias (sin ciclos)
- Las transiciones de estado se validan contra transiciones permitidas
- La validación de traspasos verifica dependencias y entregables antes de ejecutar
- Los pasos fallidos se pueden reintentar transitando de vuelta a `ready`
