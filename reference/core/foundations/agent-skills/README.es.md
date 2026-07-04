# Framework de Habilidades Componibles BMAD

> **Navegación Bilingüe:** [English Version](./README.md)

**Propósito:** Definir, registrar y descubrir habilidades componibles que los agentes BMAD pueden invocar para realizar tareas especializadas en el repositorio Evolith.

---

## 1. ¿Qué Son las Habilidades?

Una **habilidad** es una capacidad autocontenida y componible que un agente puede invocar para realizar una tarea específica. Las habilidades difieren de scripts crudos en que:

- Tienen un **contrato declarado** (entradas, salidas, propietario) en `manifest.json`.
- Son **descubribles** — los agentes pueden listar habilidades disponibles y seleccionar la correcta.
- Son **componibles** — múltiples habilidades pueden encadenarse en un flujo de trabajo.
- Siguen un **patrón consistente** — cada habilidad tiene un archivo de documentación, una entrada en el registro y un script de implementación opcional.

## 2. Estructura de Habilidades

```
.bmad-core/skills/
├── README.md                              # Este archivo
├── README.es.md                           # Versión en inglés
├── manifest.json                          # Registro de todas las habilidades
├── requirements-traceability-mapper.md    # Definición de habilidad (EN)
├── requirements-traceability-mapper.es.md # Definición de habilidad (ES)
├── gap-prioritization-engine.md           # Definición de habilidad (EN)
├── gap-prioritization-engine.es.md        # Definición de habilidad (ES)
├── adr-freshness-monitor.md              # Definición de habilidad (EN)
├── adr-freshness-monitor.es.md           # Definición de habilidad (ES)
├── self-improving-loop.md                # Definición de habilidad (EN)
└── self-improving-loop.es.md             # Definición de habilidad (ES)
```

Los scripts de implementación viven junto a otros scripts del harness:

```
.harness/scripts/skills/
├── requirements-traceability-mapper.mjs
├── gap-prioritization-engine.mjs
├── adr-freshness-monitor.mjs
└── self-improving-loop.mjs
```

## 3. Cómo Definir una Nueva Habilidad

### Paso 1: Crear la documentación de la habilidad

Crear `skills/<skill-name>.md` con:

```markdown
# <Nombre de la Habilidad>

## Propósito
<Párrafo de descripción>

## Contrato
| Campo | Valor |
|-------|-------|
| ID | `<skill-id>` |
| Propietario | `@<agent-role>` |
| Versión | `X.Y.Z` |
| Entradas | <lista de artefactos de entrada> |
| Salidas | <lista de artefactos de salida> |

## Algoritmo
<Descripción paso a paso de lo que hace la habilidad>

## Uso
\`\`\`bash
node .harness/scripts/skills/<skill-name>.mjs [flags]
\`\`\`

## Formato de Salida
<Esquema JSON o ejemplo de la salida>
```

### Paso 2: Crear la contraparte en español

Crear `skills/<skill-name>.es.md` con estructura de encabezados `##` y `###` idéntica.

### Paso 3: Registrar en manifest.json

Agregar una entrada al array `skills` en `manifest.json`:

```json
{
  "id": "<skill-name>",
  "name": "<Nombre legible>",
  "version": "1.0.0",
  "owner": "@<agent-role>",
  "description": "<Descripción corta>",
  "inputs": ["<entrada1>", "<entrada2>"],
  "outputs": ["<salida1>"],
  "file": ".harness/scripts/skills/<skill-name>.mjs",
  "tags": ["<tag1>", "<tag2>"]
}
```

### Paso 4: Implementar el script (opcional)

Si la habilidad tiene implementación, crear `.harness/scripts/skills/<skill-name>.mjs` siguiendo el patrón:

```javascript
#!/usr/bin/env node
const SCRIPT_VERSION = "1.0.0";

import fs from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);

if (args.includes("--help") || args.includes("-h")) {
  console.log(`<Nombre> v${SCRIPT_VERSION}\n\nUso: ...`);
  process.exit(0);
}

// Implementación...
console.log(JSON.stringify(result, null, 2));
process.exit(0);
```

## 4. Cómo los Agentes Consumen Habilidades

Los agentes referencian habilidades de dos maneras:

### 4.1 Vía Frontmatter YAML

Cada archivo de persona de agente declara habilidades disponibles:

```yaml
---
name: Analyst Agent
skills:
  - requirements-traceability-mapper
---
```

### 4.2 Vía Invocación de Script

Los agentes invocan habilidades directamente:

```bash
# Ejecutar una habilidad
node .harness/scripts/skills/requirements-traceability-mapper.mjs

# Con flags
node .harness/scripts/skills/gap-prioritization-engine.mjs --threshold 30
```

## 5. Habilidades Disponibles

| ID | Nombre | Propietario | Descripción |
|----|--------|-------------|-------------|
| `requirements-traceability-mapper` | Mapper de Trazabilidad de Requisitos | @analyst | Mapea épicos/historias a ADRs, reglas y pruebas |
| `gap-prioritization-engine` | Motor de Priorización de Gaps | @po | Calcula prioridad de gaps por impacto × urgencia |
| `adr-freshness-monitor` | Monitor de Freshness de ADRs | @architect | Escanea ADRs por obsolescencia (>180 días) |
| `self-improving-loop` | Bucle de Mejora Continua | @winston | Emite registros de progress audit y enruta hallazgos repetidos hacia gaps, reglas, skills, playbooks, schemas o CI |

## 6. Ciclo de Vida de Habilidades

```
draft → proposed → accepted → active
```

| Etapa | Gate |
|-------|------|
| **draft** | Doc de habilidad + entrada en manifest creadas |
| **proposed** | Script implementado, pasa `--help` |
| **accepted** | Script produce salida correcta, registrado en manifest |
| **active** | Persona de agente referencia la habilidad, usada en flujos |

---

*Véase [README de BMAD Core](../README.es.md) para contexto del repositorio.*
*Véase [manifest.json](./manifest.json) para el registro completo de habilidades.*
