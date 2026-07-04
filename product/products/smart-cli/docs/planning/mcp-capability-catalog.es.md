# Catálogo de Capacidades MCP

> **Estado:** Propuesto
> **Fecha:** 2026-06-06
> **Referencia:** SDK/CLI/MCP Target Architecture §4

---

## 1. Descripción General del Servidor MCP

**Transporte:** stdio (JSON-RPC sobre stdin/stdout)
**Protocolo:** MCP 1.0
**Runtime:** Node.js (empaquetado con CLI)

---

## 2. Recursos

### 2.1 Recursos Core

| URI | Tipo | Descripción |
|-----|------|-------------|
| `evolith://core/info` | Recurso | Metadatos del Core (versión, cantidad de rulesets, cantidad de ADRs) |
| `evolith://core/capabilities` | Recurso | Lista de capacidades soportadas |
| `evolith://core/vision` | Recurso | Documento Master de la Visión de Producto Evolith |

### 2.2 Recursos de Rulesets

| URI | Tipo | Descripción |
|-----|------|-------------|
| `evolith://rulesets` | ResourceTemplate | Listar todos los rulesets con filtros |
| `evolith://rulesets/{id}` | Recurso | Detalles de un ruleset específico |
| `evolith://rulesets/{id}/rules` | Recurso | Reglas dentro de un ruleset |

### 2.3 Recursos ADR

| URI | Tipo | Descripción |
|-----|------|-------------|
| `evolith://adrs` | ResourceTemplate | Listar ADRs con filtros |
| `evolith://adrs/{id}` | Recurso | Contenido de un ADR específico |
| `evolith://adrs/{id}/context` | Recurso | Contexto y dependencias del ADR |

### 2.4 Recursos SDLC

| URI | Tipo | Descripción |
|-----|------|-------------|
| `evolith://sdlc/phases` | Recurso | Todas las fases del SDLC |
| `evolith://sdlc/phases/{n}/gates` | Recurso | Gates de una fase |
| `evolith://sdlc/status` | ResourceTemplate | Estado actual del SDLC |

### 2.5 Recursos de Artefactos

| URI | Tipo | Descripción |
|-----|------|-------------|
| `evolith://artifacts/templates` | Recurso | Todos los templates de artefactos |
| `evolith://artifacts/templates/{id}` | Recurso | Template específico |
| `evolith://artifacts/schemas/{id}` | Recurso | JSON Schema del template |

### 2.6 Recursos de Estándares

| URI | Tipo | Descripción |
|-----|------|-------------|
| `evolith://standards` | Recurso | Todos los estándares |
| `evolith://standards/{id}` | Recurso | Estándar específico |
| `evolith://taxonomy` | Recurso | Taxonomía del repositorio |

---

## 3. Herramientas

### 3.1 Herramientas Core

#### `get_core_info`
**Propósito:** Obtener metadatos del Core
**Entrada:** Ninguna
**Salida:** `{ version, rulesetCount, adrCount, standardCount, path }`
**Errores:** CORE_NOT_FOUND

#### `search_core`
**Propósito:** Buscar contenido del Core
**Entrada:** `{ query: string, scope?: string }`
**Salida:** `SearchResult[]`
**Opciones de scope:** all, adrs, rulesets, standards

### 3.2 Herramientas de Validación

#### `validate_project`
**Propósito:** Validar satellite contra todos los rulesets aplicables
**Entrada:** `{ satellitePath?: string, format?: string }`
**Salida:** `ValidationResult`
**Errores:** SATELLITE_NOT_FOUND, VALIDATION_FAILED

#### `validate_ruleset`
**Propósito:** Validar contra un ruleset específico
**Entrada:** `{ rulesetId: string, satellitePath?: string }`
**Salida:** `ValidationResult`
**Errores:** RULESET_NOT_FOUND, VALIDATION_FAILED

#### `validate_architecture`
**Propósito:** Validar reglas de fase de arquitectura
**Entrada:** `{ satellitePath?: string, phase?: F1|F2|F3 }`
**Salida:** `ValidationResult`
**Errores:** INVALID_PHASE, VALIDATION_FAILED

#### `validate_sdlc`
**Propósito:** Validar gates de fase SDLC
**Entrada:** `{ satellitePath?: string }`
**Salida:** `ValidationResult`
**Errores:** VALIDATION_FAILED

### 3.3 Herramientas de Rulesets

#### `list_rulesets`
**Propósito:** Listar rulesets disponibles
**Entrada:** `{ category?: string }`
**Salida:** `Ruleset[]`
**Categorías:** architecture, sdlc, governance, adr, cross-cutting, acl

#### `get_ruleset`
**Propósito:** Obtener detalles de un ruleset
**Entrada:** `{ rulesetId: string }`
**Salida:** `Ruleset`
**Errores:** RULESET_NOT_FOUND

#### `resolve_rulesets`
**Propósito:** Resolver rulesets para un satellite
**Entrada:** `{ satellitePath: string }`
**Salida:** `ResolvedRuleset[]`
**Errores:** SATELLITE_NOT_FOUND

#### `explain_rule`
**Propósito:** Explicar la intención de una regla
**Entrada:** `{ ruleId: string }`
**Salida:** `RuleExplanation`
**Errores:** RULE_NOT_FOUND

### 3.4 Herramientas de Arquitectura

#### `initialize_architecture`
**Propósito:** Inicializar arquitectura para un satellite
**Entrada:** `{ phase: F1|F2|F3, satellitePath?: string, options?: object }`
**Salida:** `{ success: boolean, actions: string[] }`
**Errores:** INVALID_PHASE, SATELLITE_NOT_FOUND

#### `detect_architecture_drift`
**Propósito:** Detectar desviación arquitectónica
**Entrada:** `{ satellitePath?: string }`
**Salida:** `DriftReport`
**Errores:** SATELLITE_NOT_FOUND

#### `inspect_architecture`
**Propósito:** Inspeccionar el estado de la arquitectura
**Entrada:** `{ satellitePath?: string }`
**Salida:** `ArchitectureReport`
**Errores:** SATELLITE_NOT_FOUND

### 3.5 Herramientas SDLC

#### `get_sdlc_status`
**Propósito:** Obtener el estado actual del SDLC
**Entrada:** `{ satellitePath?: string }`
**Salida:** `SDLCStatus`
**Errores:** SATELLITE_NOT_FOUND

#### `validate_phase_gate`
**Propósito:** Validar un gate de fase
**Entrada:** `{ phase: number, gate: number, satellitePath?: string }`
**Salida:** `GateValidationResult`
**Errores:** INVALID_GATE, SATELLITE_NOT_FOUND

#### `get_next_gate`
**Propósito:** Obtener el siguiente gate requerido
**Entrada:** `{ satellitePath?: string }`
**Salida:** `{ phase: number, gate: number, requirements: string[] }`
**Errores:** SATELLITE_NOT_FOUND

### 3.6 Herramientas de Artefactos

#### `list_artifact_templates`
**Propósito:** Listar templates de artefactos
**Entrada:** `{ phase?: number }`
**Salida:** `ArtifactTemplate[]`

#### `generate_artifact`
**Propósito:** Generar artefacto a partir de un template
**Entrada:** `{ templateId: string, context: object, language?: string }`
**Salida:** `{ content: string, path: string }`
**Errores:** TEMPLATE_NOT_FOUND, INVALID_CONTEXT

#### `validate_artifact`
**Propósito:** Validar artefacto
**Entrada:** `{ content: string, templateId: string }`
**Salida:** `ValidationResult`
**Errores:** INVALID_ARTIFACT

### 3.7 Herramientas ADR

#### `list_adrs`
**Propósito:** Listar ADRs
**Entrada:** `{ status?: string, runtime?: string }`
**Salida:** `ADR[]`
**Estados:** proposed, accepted, deprecated, superseded

#### `get_adr`
**Propósito:** Obtener ADR
**Entrada:** `{ adrId: string }`
**Salida:** `ADR`
**Errores:** ADR_NOT_FOUND

#### `create_adr`
**Propósito:** Crear nuevo ADR
**Entrada:** `{ title: string, context: string, decision: string, consequences: string }`
**Salida:** `{ adrId: string, path: string }`
**Errores:** INVALID_INPUT

### 3.8 Herramientas de Evidence

#### `collect_evidence`
**Propósito:** Recolectar evidencia de cumplimiento
**Entrada:** `{ satellitePath?: string, scope?: string }`
**Salida:** `Evidence[]`
**Errores:** COLLECTION_FAILED

#### `export_evidence`
**Propósito:** Exportar reporte de evidencia
**Entrada:** `{ format: string, evidence: Evidence[] }`
**Salida:** `{ content: string, mimeType: string }`

#### `trace_artifact`
**Propósito:** Construir trazabilidad de artefacto
**Entrada:** `{ artifactId: string }`
**Salida:** `Trace`
**Errores:** ARTIFACT_NOT_FOUND

### 3.9 Herramientas de Reportes

#### `generate_compliance_report`
**Propósito:** Generar reporte de cumplimiento
**Entrada:** `{ satellitePath?: string, format?: string }`
**Salida:** `Report`
**Errores:** REPORT_FAILED

#### `generate_executive_report`
**Propósito:** Generar reporte ejecutivo DORA+SPACE
**Entrada:** `{ satellitePath?: string }`
**Salida:** `ExecutiveReport`
**Errores:** REPORT_FAILED

#### `explain_violation`
**Propósito:** Explicar una violación de regla
**Entrada:** `{ finding: Finding }`
**Salida:** `{ explanation: string, remediation: string[], references: string[] }`

---

## 4. Prompts

### 4.1 Fase de Discovery

```
prepare_discovery:
  "Ayudar al usuario a prepararse para la Fase 1 Discovery del SDLC de Evolith.
   Generar un Discovery Canvas, ROI de Business Case y Ballpark Estimation
   usando los templates aprobados de .harness/templates/.
   Asegurar que todos los artefactos sean bilingües (EN/ES) y estén validados contra esquemas.
   El satellite se encuentra en: {satellitePath}"
```

### 4.2 Revisión de Arquitectura

```
review_architecture:
  "Revisar la arquitectura del satellite proporcionado contra
   el ruleset F1/F2/F3 que coincida con su fase actual.
   Inspeccionar los bounded contexts, la estructura de capas y las dependencias.
   Identificar cualquier violación de las reglas de arquitectura hexagonal.
   Sugerir remediaciones específicas con referencias a reglas.
   Ruta del satellite: {satellitePath}"
```

### 4.3 Cumplimiento de Rulesets

```
review_ruleset_compliance:
  "Validar el satellite en {satellitePath} contra todos los rulesets aplicables.
   Ejecutar 'validate_project' y explicar cada hallazgo.
   Agrupar hallazgos por severidad (MUST/SHOULD/COULD) y categoría.
   Resaltar violaciones bloqueantes que impiden el avance de fase gate.
   Proporcionar pasos de remediación específicos para cada regla fallida."
```

### 4.4 Implementación

```
implement_with_evolith:
  "Estás implementando una funcionalidad siguiendo la governance de Evolith.
   Primero, determinar la fase actual y los rulesets aplicables.
   Luego, consultar el ADR relevante para decisiones arquitectónicas.
   Generar artefactos usando los templates aprobados.
   Validar todos los cambios contra los rulesets antes de completar.
   Satellite: {satellitePath}, Funcionalidad: {featureDescription}"
```

### 4.5 Creación de ADR

```
generate_adr:
  "Guiar al usuario en la creación de un Architectural Decision Record.
   Consultar ADRs existentes en el Core para evitar duplicación.
   Asegurar que el nuevo ADR referencie la decisión que reemplaza (si existe).
   Usar el template estándar de ADR de .harness/templates/.
   Incluir: Status, Context, Decision, Consequences, Alternatives."
```

### 4.6 Preparación de Phase Gate

```
prepare_phase_gate:
  "Ayudar a prepararse para la Fase {phase} Gate {gate}.
   Listar la evidencia requerida para este gate.
   Verificar el estado actual del satellite contra los requisitos.
   Identificar artefactos o validaciones faltantes.
   Generar una lista de verificación de acciones para pasar el gate.
   Satellite: {satellitePath}"
```

---

## 5. Estado de Implementación

| Capacidad | Estado | Prioridad |
|-----------|--------|----------|
| **Recursos** | | |
| Core info | NOT_IMPLEMENTED | HIGH |
| Rulesets list | NOT_IMPLEMENTED | HIGH |
| ADRs list | NOT_IMPLEMENTED | HIGH |
| SDLC status | NOT_IMPLEMENTED | MEDIUM |
| Artifact templates | NOT_IMPLEMENTED | MEDIUM |
| **Herramientas** | | |
| validate_project | PARTIALLY_IMPLEMENTED | HIGH |
| validate_ruleset | NOT_IMPLEMENTED | HIGH |
| validate_architecture | NOT_IMPLEMENTED | HIGH |
| list_rulesets | NOT_IMPLEMENTED | HIGH |
| get_ruleset | NOT_IMPLEMENTED | HIGH |
| resolve_rulesets | NOT_IMPLEMENTED | HIGH |
| detect_architecture_drift | NOT_IMPLEMENTED | HIGH |
| get_sdlc_status | NOT_IMPLEMENTED | MEDIUM |
| list_artifact_templates | NOT_IMPLEMENTED | MEDIUM |
| generate_artifact | NOT_IMPLEMENTED | MEDIUM |
| list_adrs | NOT_IMPLEMENTED | MEDIUM |
| create_adr | NOT_IMPLEMENTED | MEDIUM |
| collect_evidence | NOT_IMPLEMENTED | MEDIUM |
| **Prompts** | | |
| prepare_discovery | NOT_IMPLEMENTED | MEDIUM |
| review_architecture | NOT_IMPLEMENTED | HIGH |
| implement_with_evolith | NOT_IMPLEMENTED | HIGH |
| generate_adr | NOT_IMPLEMENTED | MEDIUM |

---

## 6. Implementación del Protocolo MCP

### 6.1 Paquete Requerido

```bash
npm install @modelcontextprotocol/sdk
```

### 6.2 Estructura del Servidor

```typescript
import { Server } from '@modelcontextprotocol/sdk/server';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio';

const server = new Server({
  name: 'evolith-mcp',
  version: '1.0.0',
}, {
  capabilities: ['tools', 'resources', 'prompts'],
});

// Register handlers
server.setRequestHandler('tools/list', handleToolsList);
server.setRequestHandler('tools/call', handleToolsCall);
server.setRequestHandler('resources/list', handleResourcesList);
server.setRequestHandler('resources/read', handleResourcesRead);
server.setRequestHandler('prompts/list', handlePromptsList);

// Start server
const transport = new StdioServerTransport();
server.connect(transport);
```

---

## 7. Códigos de Error

| Código | Nombre | Descripción |
|--------|--------|-------------|
| CORE_NOT_FOUND | Core no encontrado | Evolith Core no está en la ruta esperada |
| SATELLITE_NOT_FOUND | Satellite no encontrado | Satellite no encontrado en la ruta |
| RULESET_NOT_FOUND | Ruleset no encontrado | El ruleset solicitado no existe |
| RULE_NOT_FOUND | Regla no encontrada | El ID de regla solicitado no existe |
| ADR_NOT_FOUND | ADR no encontrado | El ADR solicitado no existe |
| TEMPLATE_NOT_FOUND | Template no encontrado | Template de artefacto no encontrado |
| ARTIFACT_NOT_FOUND | Artefacto no encontrado | Artefacto no encontrado |
| INVALID_PHASE | Fase inválida | La fase debe ser F1, F2 o F3 |
| INVALID_GATE | Gate inválido | Número de gate fuera de rango |
| VALIDATION_FAILED | Validación fallida | Una o más reglas fallaron |
| REPORT_FAILED | Reporte fallido | Error al generar el reporte |
| INVALID_INPUT | Entrada inválida | Argumentos de herramienta inválidos |
| COLLECTION_FAILED | Recolección fallida | Error al recolectar evidencia |

---
[Volver al Índice de Planificación SDK/CLI](./README.md)
