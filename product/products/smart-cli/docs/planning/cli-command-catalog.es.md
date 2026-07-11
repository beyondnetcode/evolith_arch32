# CLI Command Catalog

> **Estado:** Propuesto
> **Fecha:** 2026-06-06
> **Referencia:** SDK/CLI/MCP Target Architecture §3

---

## 1. Sintaxis de Comandos

Todos los comandos siguen: `evolith-cli <domain> <action> [options]`

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

### `evolith-cli version`
**Propósito:** Mostrar versión del CLI y compatibilidad con Core
```bash
evolith-cli version
# Output: @smart-cli/cli v1.1.0 | Core v1.0.0 | SDK v1.0.0
```

### `evolith-cli help [command]`
**Propósito:** Mostrar ayuda del CLI o de un comando específico
```bash
evolith-cli help validate
```

### `evolith-cli doctor`
**Propósito:** Verificar salud y configuración del CLI
```bash
evolith-cli doctor
# Checks: Node version, Core presence, config validity, network
```

### `evolith-cli info`
**Propósito:** Mostrar capacidades del CLI y Core configurado
```bash
evolith-cli info
```

---

## 3. Comandos Core

### `evolith-cli core info`
**Propósito:** Mostrar metadatos de Core
```bash
evolith-cli core info [--core <path>]
```

### `evolith-cli core validate`
**Propósito:** Validar integridad de Core
```bash
evolith-cli core validate [--core <path>]
```

### `evolith-cli core update`
**Propósito:** Buscar y aplicar actualizaciones de Core
```bash
evolith-cli core update [--core <path>] [--force]
```

### `evolith-cli core search <query>`
**Propósito:** Buscar contenido de Core
```bash
evolith-cli core search "hexagonal architecture"
```

### `evolith-cli core index`
**Propósito:** Mostrar índice completo de Core
```bash
evolith-cli core index [--format json]
```

---

## 4. Comandos de Rulesets

### `evolith-cli ruleset list`
**Propósito:** Listar todos los rulesets disponibles
```bash
evolith-cli ruleset list [--category <category>]
# Categories: architecture, sdlc, governance, adr, cross-cutting, acl
```

### `evolith-cli ruleset show <rulesetId>`
**Propósito:** Mostrar detalles de un ruleset
```bash
evolith-cli ruleset show adr-0002
evolith-cli ruleset show inheritance
```

### `evolith-cli ruleset validate`
**Propósito:** Validar satellite contra rulesets
```bash
evolith-cli ruleset validate [--satellite <path>] [--ruleset <id>]
```

### `evolith-cli ruleset explain <ruleId>`
**Propósito:** Explicar la intención y validación de una regla
```bash
evolith-cli ruleset explain HXA-01
```

### `evolith-cli ruleset dependencies <rulesetId>`
**Propósito:** Mostrar dependencias de un ruleset
```bash
evolith-cli ruleset dependencies adr-0002
```

---

## 5. Comandos de Validación

### `evolith-cli validate project`
**Propósito:** Validar proyecto satellite completo
```bash
evolith-cli validate project [--satellite <path>] [--format json]
```
**Usa:** Todos los rulesets aplicables

### `evolith-cli validate architecture`
**Propósito:** Validar reglas de arquitectura (F1/F2/F3)
```bash
evolith-cli validate architecture [--satellite <path>]
```
**Usa:** f1-modular-monolith, f2-distributed-modules, f3-microservicios

### `evolith-cli validate sdlc`
**Propósito:** Validar reglas SDLC
```bash
evolith-cli validate sdlc [--satellite <path>]
```
**Usa:** phase-gates, quality-thresholds

### `evolith-cli validate all`
**Propósito:** Validar contra todos los rulesets
```bash
evolith-cli validate all [--satellite <path>]
```

---

## 6. Comandos de Artefactos

### `evolith-cli artifact list`
**Propósito:** Listar plantillas de artefactos disponibles
```bash
evolith-cli artifact list [--phase <1-5>]
```

### `evolith-cli artifact show <templateId>`
**Propósito:** Mostrar detalles de una plantilla de artefacto
```bash
evolith-cli artifact show functional-story
```

### `evolith-cli artifact generate`
**Propósito:** Generar artefacto desde plantilla
```bash
evolith-cli artifact generate <templateId> [--context <json>] [--output <path>]
```

### `evolith-cli artifact validate <file>`
**Propósito:** Validar artefacto contra esquema
```bash
evolith-cli artifact validate ./docs/user-story.md
```

### `evolith-cli artifact trace <artifactId>`
**Propósito:** Mostrar trazabilidad de artefacto
```bash
evolith-cli artifact trace US-001
```

---

## 7. Comandos SDLC

### `evolith-cli sdlc status`
**Propósito:** Mostrar estado actual de SDLC
```bash
evolith-cli sdlc status [--satellite <path>]
```

### `evolith-cli sdlc next`
**Propósito:** Mostrar siguiente acción en SDLC
```bash
evolith-cli sdlc next [--satellite <path>]
```

### `evolith-cli sdlc report`
**Propósito:** Generar reporte SDLC
```bash
evolith-cli sdlc report [--satellite <path>] [--format json] [--output <path>]
```

---

## 8. Comandos de Gates

### `evolith-cli gate list`
**Propósito:** Listar todos los phase gates
```bash
evolith-cli gate list [--phase <1-5>]
```

### `evolith-cli gate status <phase> <gate>`
**Propósito:** Mostrar estado de un gate
```bash
evolith-cli gate status 3 2  # Phase 3, Gate 2 (Successful Build)
```

### `evolith-cli gate validate <phase> <gate>`
**Propósito:** Validar requisitos de un gate
```bash
evolith-cli gate validate 3 2 [--satellite <path>]
```

### `evolith-cli gate evidence <phase> <gate>`
**Propósito:** Mostrar evidencia de un gate
```bash
evolith-cli gate evidence 3 2 [--satellite <path>]
```

---

## 9. Comandos ADR

### `evolith-cli adr list`
**Propósito:** Listar ADRs
```bash
evolith-cli adr list [--status <status>] [--runtime <runtime>]
# Status: proposed, accepted, deprecated, superseded
# Runtime: core, nodejs, dotnet
```

### `evolith-cli adr show <adrId>`
**Propósito:** Mostrar detalles de un ADR
```bash
evolith-cli adr show ADR-0002
```

### `evolith-cli adr search <query>`
**Propósito:** Buscar ADRs
```bash
evolith-cli adr search "hexagonal"
```

### `evolith-cli adr create`
**Propósito:** Crear nuevo ADR (interactivo)
```bash
evolith-cli adr create [--context <json>]
```

### `evolith-cli adr validate <file>`
**Propósito:** Validar ADR contra esquema
```bash
evolith-cli adr validate ./docs/adr/my-decision.md
```

### `evolith-cli adr dependencies <adrId>`
**Propósito:** Mostrar dependencias de ADR
```bash
evolith-cli adr dependencies ADR-0018
```

---

## 10. Comandos de Agentes

### `evolith-cli agent list`
**Propósito:** Listar agentes disponibles
```bash
evolith-cli agent list
```

### `evolith-cli agent show <agentId>`
**Propósito:** Mostrar capacidades de un agente
```bash
evolith-cli agent show @architect
```

### `evolith-cli agent install [--agents <names>]`
**Propósito:** Instalar agentes en satellite
```bash
evolith-cli agent install --agents @po,@architect --satellite <path>
```

### `evolith-cli agent validate`
**Propósito:** Validar configuración de agentes
```bash
evolith-cli agent validate [--satellite <path>]
```

---

## 11. Comandos de Arquitectura

### `evolith-cli architecture list`
**Propósito:** Listar fases de arquitectura
```bash
evolith-cli architecture list
```

### `evolith-cli architecture show <phase>`
**Propósito:** Mostrar detalles de una fase
```bash
evolith-cli architecture show F1
```

### `evolith-cli architecture initialize`
**Propósito:** Inicializar arquitectura para satellite
```bash
evolith-cli architecture initialize F1 [--satellite <path>]
```

### `evolith-cli architecture validate`
**Propósito:** Validar contra reglas de la fase actual
```bash
evolith-cli architecture validate [--satellite <path>]
```

### `evolith-cli architecture drift`
**Propósito:** Detectar desviación arquitectónica
```bash
evolith-cli architecture drift [--satellite <path>]
```

### `evolith-cli architecture report`
**Propósito:** Generar reporte de arquitectura
```bash
evolith-cli architecture report [--satellite <path>] [--format json]
```

---

## 12. Comandos de Scaffold

### `evolith-cli scaffold project`
**Propósito:** Scaffold de nuevo proyecto satellite
```bash
evolith-cli scaffold project --name <name> --type <type> [--phase F1|F2|F3]
```

### `evolith-cli scaffold domain`
**Propósito:** Scaffold de nuevo dominio
```bash
evolith-cli scaffold domain --name <name> --bounded-context <context>
```

### `evolith-cli scaffold workspace`
**Propósito:** Scaffold de workspace Nx
```bash
evolith-cli scaffold workspace --frontend <react|angular> --orm <prisma|typeorm>
```

---

## 13. Comandos de Evidence

### `evolith-cli evidence list`
**Propósito:** Listar evidencia recolectada
```bash
evolith-cli evidence list [--scope <scope>]
```

### `evolith-cli evidence collect`
**Propósito:** Recolectar evidencia para cumplimiento
```bash
evolith-cli evidence collect [--satellite <path>] [--scope <scope>]
```

### `evolith-cli evidence validate`
**Propósito:** Validar completitud de la evidencia
```bash
evolith-cli evidence validate [--satellite <path>]
```

### `evolith-cli evidence export`
**Propósito:** Exportar reporte de evidencia
```bash
evolith-cli evidence export --format <sarif|json|markdown> --output <path>
```

---

## 14. Comandos de Reportes

### `evolith-cli report compliance`
**Propósito:** Generar reporte de cumplimiento
```bash
evolith-cli report compliance [--satellite <path>] [--format json]
```

### `evolith-cli report coverage`
**Propósito:** Generar reporte de cobertura
```bash
evolith-cli report coverage [--satellite <path>]
```

### `evolith-cli report drift`
**Propósito:** Generar reporte de desviación
```bash
evolith-cli report drift [--satellite <path>]
```

### `evolith-cli report executive`
**Propósito:** Generar resumen ejecutivo (DORA+SPACE)
```bash
evolith-cli report executive [--satellite <path>] [--format json]
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
