# Matriz de Paridad CLI/MCP

> **Estado:** Propuesto
> **Fecha:** 2026-06-06

---

## 1. Descripción General

Esta matriz asegura que CLI y MCP provean funcionalidad consistente a través de la capa SDK compartida.

| Capacidad | SDK | CLI | Herramienta MCP | Recurso MCP | Tracker | Estado |
|-----------|-----|-----|-----------------|-------------|---------|--------|

---

## 2. Operaciones Core

| `smart-cli core info` | `CoreService.info()` | `core info` | - | `evolith://core/info` | FUERA_DE_ALCANCE | PROPUESTO |
| `smart-cli core validate` | `CoreService.validate()` | `core validate` | - | - | FUERA_DE_ALCANCE | PROPUESTO |
| `smart-cli core update` | `CoreService.update()` | `core update` | - | - | FUERA_DE_ALCANCE | PROPUESTO |
| `smart-cli core search` | `CoreService.search()` | `core search` | `search_core` | - | FUERA_DE_ALCANCE | PROPUESTO |

---

## 3. Operaciones de Rulesets

| `smart-cli ruleset list` | `RulesetService.list()` | `ruleset list` | - | `evolith://rulesets` | FUERA_DE_ALCANCE | PROPUESTO |
| `smart-cli ruleset show` | `RulesetService.get()` | `ruleset show` | `get_ruleset` | `evolith://rulesets/{id}` | FUERA_DE_ALCANCE | PROPUESTO |
| `smart-cli ruleset validate` | `RulesetService.validate()` | `ruleset validate` | `validate_ruleset` | - | FUERA_DE_ALCANCE | IMPLEMENTADO |
| `smart-cli ruleset explain` | `RulesetService.explain()` | `ruleset explain` | `explain_rule` | - | FUERA_DE_ALCANCE | PROPUESTO |

---

## 4. Validación de Proyecto

| `smart-cli validate project` | `ValidationService.project()` | `validate project` | `validate_project` | - | FUERA_DE_ALCANCE | IMPLEMENTADO |
| `smart-cli validate architecture` | `ValidationService.architecture()` | `validate architecture` | `validate_architecture` | - | FUERA_DE_ALCANCE | PROPUESTO |
| `smart-cli validate sdlc` | `ValidationService.sdlc()` | `validate sdlc` | `validate_sdlc` | - | FUERA_DE_ALCANCE | PROPUESTO |
| `smart-cli validate all` | `ValidationService.all()` | `validate all` | - | - | FUERA_DE_ALCANCE | PROPUESTO |

---

## 5. Operaciones SDLC

| `smart-cli sdlc status` | `SDLCService.status()` | `sdlc status` | `get_sdlc_status` | `evolith://sdlc/status` | PARCIAL | PROPUESTO |
| `smart-cli sdlc next` | `SDLCService.nextGate()` | `sdlc next` | `get_next_gate` | - | PARCIAL | PROPUESTO |
| `smart-cli gate validate` | `SDLCService.validateGate()` | `gate validate` | `validate_phase_gate` | - | PARCIAL | PROPUESTO |

---

## 6. Operaciones de Artefactos

| `smart-cli artifact list` | `ArtifactService.list()` | `artifact list` | - | `evolith://artifacts/templates` | FUERA_DE_ALCANCE | PROPUESTO |
| `smart-cli artifact generate` | `ArtifactService.generate()` | `artifact generate` | `generate_artifact` | - | FUERA_DE_ALCANCE | PROPUESTO |
| `smart-cli artifact validate` | `ArtifactService.validate()` | `artifact validate` | `validate_artifact` | - | FUERA_DE_ALCANCE | PROPUESTO |

---

## 7. Operaciones de Arquitectura

| `smart-cli architecture initialize` | `ArchitectureService.initialize()` | `architecture initialize` | `initialize_architecture` | - | PARCIAL | PROPUESTO |
| `smart-cli architecture validate` | `ArchitectureService.validate()` | `architecture validate` | `validate_architecture` | - | PARCIAL | PROPUESTO |
| `smart-cli architecture drift` | `DriftDetectionService.detect()` | `architecture drift` | `detect_architecture_drift` | - | PARCIAL | PROPUESTO |

---

## 8. Operaciones ADR

| `smart-cli adr list` | `ADRService.list()` | `adr list` | `list_adrs` | `evolith://adrs` | FUERA_DE_ALCANCE | PROPUESTO |
| `smart-cli adr show` | `ADRService.get()` | `adr show` | `get_adr` | `evolith://adrs/{id}` | FUERA_DE_ALCANCE | PROPUESTO |
| `smart-cli adr create` | `ADRService.create()` | `adr create` | `create_adr` | - | FUERA_DE_ALCANCE | PROPUESTO |

---

## 9. Operaciones de Evidence

| `smart-cli evidence collect` | `EvidenceService.collect()` | `evidence collect` | `collect_evidence` | - | PARCIAL | PROPUESTO |
| `smart-cli evidence export` | `EvidenceService.export()` | `evidence export` | `export_evidence` | - | PARCIAL | PROPUESTO |

---

## 10. Operaciones de Reportes

| `smart-cli report compliance` | `ReportService.compliance()` | `report compliance` | `generate_compliance_report` | - | PARCIAL | PROPUESTO |
| `smart-cli report executive` | `ReportService.executive()` | `report executive` | `generate_executive_report` | - | PARCIAL | PROPUESTO |

---

## 11. Requisitos de Paridad

### 11.1 Misma Lógica, Diferente Interfaz

Cada método del SDK debe ser accesible tanto vía CLI como vía MCP:
- CLI para humanos y scripts
- MCP para agentes de IA e IDEs
- Sin lógica exclusiva en ninguna interfaz

### 11.2 Resultados Consistentes

Cuando la misma operación se invoca vía CLI y MCP:
- Mismas reglas de validación aplican
- Mismos hallazgos retornados
- Mismos códigos de error
- Mismas fuentes trazables

### 11.3 Diferencias Justificadas

Las diferencias entre CLI y MCP se justifican por:

| Diferencia | Justificación |
|------------|---------------|
| Modo interactivo en CLI | Humanos necesitan prompts, IA usa datos estructurados |
| Salida coloreada en CLI | Optimización para terminal, MCP retorna datos estructurados |
| File watching en CLI | Feedback en tiempo real para humanos, MCP usa eventos |
| Operaciones batch en CLI | Scripts y pipelines CI/CD |

### 11.4 Fuera de Alcance para Core

Estas capacidades pertenecen a Evolith Tracker, no al Core SDK/CLI/MCP:

| Capacidad | Razón |
|-----------|-------|
| Flujos de aprobación | Feature SaaS, no gobernanza |
| Gestión de usuarios | Feature SaaS |
| Dashboards multi-tenant | Feature SaaS |
| Integración de facturación | Feature SaaS |
| Monitoreo SLA | Feature SaaS |

---

## 12. Lista de Verificación de Implementación

Para cada capacidad, verificar:
- [ ] Método SDK existe y está probado
- [ ] Comando CLI implementado y documentado
- [ ] Herramienta MCP definida e implementada
- [ ] CLI y MCP producen resultados idénticos
- [ ] Códigos de error son consistentes
- [ ] Trazabilidad mantenida a fuente Core

---

[Volver al Índice de Planificación SDK/CLI](./README.md)
