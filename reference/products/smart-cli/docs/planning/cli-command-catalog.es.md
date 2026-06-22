# CLI Command Catalog

> **Estado:** Propuesto
> **Fecha:** 2026-06-06
> **Referencia:** SDK/CLI/MCP Target Architecture §3

---

## 1. Sintaxis de Comandos

Todos los comandos siguen: `smart-cli <domain> <action> [options]`

### Opciones Globales (todos los comandos)

| Opción | Descripción | Por Defecto |
|--------|-------------|-------------|
| `--core <path>` | Ruta a Evolith Core | auto-detect |
| `--satellite <path>` | Ruta al satellite | cwd |
| `--format <format>` | Formato de salida (json/yaml/text) | text |
| `--output <path>` | Escribir salida a un archivo | stdout |
| `--verbose` | Habilitar salida detallada | false |
| `--quiet` | Suprimir salida no esencial | false |
| `--dry-run` | Simular sin realizar cambios | false |
| `--help` | Mostrar ayuda del comando | - |

---

## 2. Comandos Generales

### `smart-cli version`
**Propósito:** Mostrar versión del CLI y compatibilidad con Core
```bash
smart-cli version
# Output: @smart-cli/cli v1.1.0 | Core v1.0.0 | SDK v1.0.0
```

### `smart-cli help [command]`
**Propósito:** Mostrar ayuda del CLI o de un comando específico
```bash
smart-cli help validate
```

### `smart-cli doctor`
**Propósito:** Verificar salud y configuración del CLI
```bash
smart-cli doctor
# Checks: Node version, Core presence, config validity, network
```

### `smart-cli info`
**Propósito:** Mostrar capacidades del CLI y Core configurado
```bash
smart-cli info
```

---

## 3. Comandos Core

### `smart-cli core info`
**Propósito:** Mostrar metadatos de Core
```bash
smart-cli core info [--core <path>]
```

### `smart-cli core validate`
**Propósito:** Validar integridad de Core
```bash
smart-cli core validate [--core <path>]
```

### `smart-cli core update`
**Propósito:** Buscar y aplicar actualizaciones de Core
```bash
smart-cli core update [--core <path>] [--force]
```

### `smart-cli core search <query>`
**Propósito:** Buscar contenido de Core
```bash
smart-cli core search "hexagonal architecture"
```

### `smart-cli core index`
**Propósito:** Mostrar índice completo de Core
```bash
smart-cli core index [--format json]
```

---

## 4. Comandos de Rulesets

### `smart-cli ruleset list`
**Propósito:** Listar todos los rulesets disponibles
```bash
smart-cli ruleset list [--category <category>]
# Categories: architecture, sdlc, governance, adr, cross-cutting, acl
```

### `smart-cli ruleset show <rulesetId>`
**Propósito:** Mostrar detalles de un ruleset
```bash
smart-cli ruleset show adr-0002
smart-cli ruleset show inheritance
```

### `smart-cli ruleset validate`
**Propósito:** Validar satellite contra rulesets
```bash
smart-cli ruleset validate [--satellite <path>] [--ruleset <id>]
```

### `smart-cli ruleset explain <ruleId>`
**Propósito:** Explicar la intención y validación de una regla
```bash
smart-cli ruleset explain HXA-01
```

### `smart-cli ruleset dependencies <rulesetId>`
**Propósito:** Mostrar dependencias de un ruleset
```bash
smart-cli ruleset dependencies adr-0002
```

---

## 5. Comandos de Validación

### `smart-cli validate project`
**Propósito:** Validar proyecto satellite completo
```bash
smart-cli validate project [--satellite <path>] [--format json]
```
**Usa:** Todos los rulesets aplicables

### `smart-cli validate architecture`
**Propósito:** Validar reglas de arquitectura (F1/F2/F3)
```bash
smart-cli validate architecture [--satellite <path>]
```
**Usa:** f1-modular-monolith, f2-distributed-modules, f3-microservices

### `smart-cli validate sdlc`
**Propósito:** Validar reglas SDLC
```bash
smart-cli validate sdlc [--satellite <path>]
```
**Usa:** phase-gates, quality-thresholds

### `smart-cli validate all`
**Propósito:** Validar contra todos los rulesets
```bash
smart-cli validate all [--satellite <path>]
```

---

## 6. Comandos de Artefactos

### `smart-cli artifact list`
**Propósito:** Listar plantillas de artefactos disponibles
```bash
smart-cli artifact list [--phase <1-5>]
```

### `smart-cli artifact show <templateId>`
**Propósito:** Mostrar detalles de una plantilla de artefacto
```bash
smart-cli artifact show functional-story
```

### `smart-cli artifact generate`
**Propósito:** Generar artefacto desde plantilla
```bash
smart-cli artifact generate <templateId> [--context <json>] [--output <path>]
```

### `smart-cli artifact validate <file>`
**Propósito:** Validar artefacto contra esquema
```bash
smart-cli artifact validate ./docs/user-story.md
```

### `smart-cli artifact trace <artifactId>`
**Propósito:** Mostrar trazabilidad de artefacto
```bash
smart-cli artifact trace US-001
```

---

## 7. Comandos SDLC

### `smart-cli sdlc status`
**Propósito:** Mostrar estado actual de SDLC
```bash
smart-cli sdlc status [--satellite <path>]
```

### `smart-cli sdlc next`
**Propósito:** Mostrar siguiente acción en SDLC
```bash
smart-cli sdlc next [--satellite <path>]
```

### `smart-cli sdlc report`
**Propósito:** Generar reporte SDLC
```bash
smart-cli sdlc report [--satellite <path>] [--format json] [--output <path>]
```

---

## 8. Comandos de Gates

### `smart-cli gate list`
**Propósito:** Listar todos los phase gates
```bash
smart-cli gate list [--phase <1-5>]
```

### `smart-cli gate status <phase> <gate>`
**Propósito:** Mostrar estado de un gate
```bash
smart-cli gate status 3 2  # Phase 3, Gate 2 (Successful Build)
```

### `smart-cli gate validate <phase> <gate>`
**Propósito:** Validar requisitos de un gate
```bash
smart-cli gate validate 3 2 [--satellite <path>]
```

### `smart-cli gate evidence <phase> <gate>`
**Propósito:** Mostrar evidencia de un gate
```bash
smart-cli gate evidence 3 2 [--satellite <path>]
```

---

## 9. Comandos ADR

### `smart-cli adr list`
**Propósito:** Listar ADRs
```bash
smart-cli adr list [--status <status>] [--runtime <runtime>]
# Status: proposed, accepted, deprecated, superseded
# Runtime: core, nodejs, dotnet
```

### `smart-cli adr show <adrId>`
**Propósito:** Mostrar detalles de un ADR
```bash
smart-cli adr show ADR-0002
```

### `smart-cli adr search <query>`
**Propósito:** Buscar ADRs
```bash
smart-cli adr search "hexagonal"
```

### `smart-cli adr create`
**Propósito:** Crear nuevo ADR (interactivo)
```bash
smart-cli adr create [--context <json>]
```

### `smart-cli adr validate <file>`
**Propósito:** Validar ADR contra esquema
```bash
smart-cli adr validate ./docs/adr/my-decision.md
```

### `smart-cli adr dependencies <adrId>`
**Propósito:** Mostrar dependencias de ADR
```bash
smart-cli adr dependencies ADR-0018
```

---

## 10. Comandos de Agentes

### `smart-cli agent list`
**Propósito:** Listar agentes disponibles
```bash
smart-cli agent list
```

### `smart-cli agent show <agentId>`
**Propósito:** Mostrar capacidades de un agente
```bash
smart-cli agent show @architect
```

### `smart-cli agent install [--agents <names>]`
**Propósito:** Instalar agentes en satellite
```bash
smart-cli agent install --agents @po,@architect --satellite <path>
```

### `smart-cli agent validate`
**Propósito:** Validar configuración de agentes
```bash
smart-cli agent validate [--satellite <path>]
```

---

## 11. Comandos de Arquitectura

### `smart-cli architecture list`
**Propósito:** Listar fases de arquitectura
```bash
smart-cli architecture list
```

### `smart-cli architecture show <phase>`
**Propósito:** Mostrar detalles de una fase
```bash
smart-cli architecture show F1
```

### `smart-cli architecture initialize`
**Propósito:** Inicializar arquitectura para satellite
```bash
smart-cli architecture initialize F1 [--satellite <path>]
```

### `smart-cli architecture validate`
**Propósito:** Validar contra reglas de la fase actual
```bash
smart-cli architecture validate [--satellite <path>]
```

### `smart-cli architecture drift`
**Propósito:** Detectar desviación arquitectónica
```bash
smart-cli architecture drift [--satellite <path>]
```

### `smart-cli architecture report`
**Propósito:** Generar reporte de arquitectura
```bash
smart-cli architecture report [--satellite <path>] [--format json]
```

---

## 12. Comandos de Scaffold

### `smart-cli scaffold project`
**Propósito:** Scaffold de nuevo proyecto satellite
```bash
smart-cli scaffold project --name <name> --type <type> [--phase F1|F2|F3]
```

### `smart-cli scaffold domain`
**Propósito:** Scaffold de nuevo dominio
```bash
smart-cli scaffold domain --name <name> --bounded-context <context>
```

### `smart-cli scaffold workspace`
**Propósito:** Scaffold de workspace Nx
```bash
smart-cli scaffold workspace --frontend <react|angular> --orm <prisma|typeorm>
```

---

## 13. Comandos de Evidence

### `smart-cli evidence list`
**Propósito:** Listar evidencia recolectada
```bash
smart-cli evidence list [--scope <scope>]
```

### `smart-cli evidence collect`
**Propósito:** Recolectar evidencia para cumplimiento
```bash
smart-cli evidence collect [--satellite <path>] [--scope <scope>]
```

### `smart-cli evidence validate`
**Propósito:** Validar completitud de la evidencia
```bash
smart-cli evidence validate [--satellite <path>]
```

### `smart-cli evidence export`
**Propósito:** Exportar reporte de evidencia
```bash
smart-cli evidence export --format <sarif|json|markdown> --output <path>
```

---

## 14. Comandos de Reportes

### `smart-cli report compliance`
**Propósito:** Generar reporte de cumplimiento
```bash
smart-cli report compliance [--satellite <path>] [--format json]
```

### `smart-cli report coverage`
**Propósito:** Generar reporte de cobertura
```bash
smart-cli report coverage [--satellite <path>]
```

### `smart-cli report drift`
**Propósito:** Generar reporte de desviación
```bash
smart-cli report drift [--satellite <path>]
```

### `smart-cli report executive`
**Propósito:** Generar resumen ejecutivo (DORA+SPACE)
```bash
smart-cli report executive [--satellite <path>] [--format json]
```

---

## 15. Estado de Implementación

| Comando | Estado | Prioridad |
|---------|--------|-----------|
| `version` | IMPLEMENTED | - |
| `help` | IMPLEMENTED | - |
| `doctor` | NOT_IMPLEMENTED | MEDIUM |
| `info` | NOT_IMPLEMENTED | LOW |
| `core info` | IMPLEMENTED | - |
| `core validate` | IMPLEMENTED | - |
| `core update` | NOT_IMPLEMENTED | MEDIUM |
| `core search` | NOT_IMPLEMENTED | LOW |
| `core index` | NOT_IMPLEMENTED | LOW |
| `ruleset list` | IMPLEMENTED | - |
| `ruleset show` | IMPLEMENTED | - |
| `ruleset validate` | IMPLEMENTED | - |
| `ruleset explain` | NOT_IMPLEMENTED | HIGH |
| `validate project` | IMPLEMENTED | - |
| `validate architecture` | NOT_IMPLEMENTED | HIGH |
| `validate sdlc` | NOT_IMPLEMENTED | HIGH |
| `artifact list` | NOT_IMPLEMENTED | MEDIUM |
| `artifact generate` | NOT_IMPLEMENTED | MEDIUM |
| `artifact validate` | NOT_IMPLEMENTED | MEDIUM |
| `sdlc status` | NOT_IMPLEMENTED | MEDIUM |
| `sdlc next` | NOT_IMPLEMENTED | MEDIUM |
| `gate list` | NOT_IMPLEMENTED | MEDIUM |
| `gate status` | NOT_IMPLEMENTED | MEDIUM |
| `gate validate` | NOT_IMPLEMENTED | HIGH |
| `adr list` | NOT_IMPLEMENTED | MEDIUM |
| `adr show` | NOT_IMPLEMENTED | MEDIUM |
| `adr create` | NOT_IMPLEMENTED | MEDIUM |
| `agent install` | STUB | HIGH |
| `architecture initialize` | PARTIALLY_IMPLEMENTED | HIGH |
| `architecture validate` | NOT_IMPLEMENTED | HIGH |
| `architecture drift` | NOT_IMPLEMENTED | HIGH |
| `scaffold project` | PARTIALLY_IMPLEMENTED | HIGH |
| `evidence collect` | NOT_IMPLEMENTED | MEDIUM |
| `report compliance` | NOT_IMPLEMENTED | MEDIUM |

---
[Volver al Índice de Planificación SDK/CLI](./README.md)
