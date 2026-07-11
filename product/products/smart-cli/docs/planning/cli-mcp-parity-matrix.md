# CLI/MCP Parity Matrix

> **Status:** Proposed
> **Date:** 2026-06-06

---

## 1. Overview

This matrix ensures CLI and MCP provide consistent functionality through the shared SDK layer.

| Capability | SDK | CLI | MCP Tool | MCP Resource | Tracker | Status |
|-----------|-----|-----|----------|--------------|---------|--------|

---

## 2. Core Operations

| `evolith-cli core info` | `CoreService.info()` | `core info` | - | `evolith://core/info` | OUT_OF_SCOPE | PROPOSED |
| `evolith-cli core validate` | `CoreService.validate()` | `core validate` | - | - | OUT_OF_SCOPE | PROPOSED |
| `evolith-cli core update` | `CoreService.update()` | `core update` | - | - | OUT_OF_SCOPE | PROPOSED |
| `evolith-cli core search` | `CoreService.search()` | `core search` | `search_core` | - | OUT_OF_SCOPE | PROPOSED |

---

## 3. Ruleset Operations

| `evolith-cli ruleset list` | `RulesetService.list()` | `ruleset list` | - | `evolith://rulesets` | OUT_OF_SCOPE | PROPOSED |
| `evolith-cli ruleset show` | `RulesetService.get()` | `ruleset show` | `get_ruleset` | `evolith://rulesets/{id}` | OUT_OF_SCOPE | PROPOSED |
| `evolith-cli ruleset validate` | `RulesetService.validate()` | `ruleset validate` | `validate_ruleset` | - | OUT_OF_SCOPE | IMPLEMENTED |
| `evolith-cli ruleset explain` | `RulesetService.explain()` | `ruleset explain` | `explain_rule` | - | OUT_OF_SCOPE | PROPOSED |

---

## 4. Project Validation

| `evolith-cli validate project` | `ValidationService.project()` | `validate project` | `validate_project` | - | OUT_OF_SCOPE | IMPLEMENTED |
| `evolith-cli validate architecture` | `ValidationService.architecture()` | `validate architecture` | `validate_architecture` | - | OUT_OF_SCOPE | PROPOSED |
| `evolith-cli validate sdlc` | `ValidationService.sdlc()` | `validate sdlc` | `validate_sdlc` | - | OUT_OF_SCOPE | PROPOSED |
| `evolith-cli validate all` | `ValidationService.all()` | `validate all` | - | - | OUT_OF_SCOPE | PROPOSED |

---

## 5. SDLC Operations

| `evolith-cli sdlc status` | `SDLCService.status()` | `sdlc status` | `get_sdlc_status` | `evolith://sdlc/status` | PARTIAL | PROPOSED |
| `evolith-cli sdlc next` | `SDLCService.nextGate()` | `sdlc next` | `get_next_gate` | - | PARTIAL | PROPOSED |
| `evolith-cli gate validate` | `SDLCService.validateGate()` | `gate validate` | `validate_phase_gate` | - | PARTIAL | PROPOSED |

---

## 6. Artifact Operations

| `evolith-cli artifact list` | `ArtifactService.list()` | `artifact list` | - | `evolith://artifacts/templates` | OUT_OF_SCOPE | PROPOSED |
| `evolith-cli artifact generate` | `ArtifactService.generate()` | `artifact generate` | `generate_artifact` | - | OUT_OF_SCOPE | PROPOSED |
| `evolith-cli artifact validate` | `ArtifactService.validate()` | `artifact validate` | `validate_artifact` | - | OUT_OF_SCOPE | PROPOSED |

---

## 7. Architecture Operations

| `evolith-cli architecture initialize` | `ArchitectureService.initialize()` | `architecture initialize` | `initialize_architecture` | - | PARTIAL | PROPOSED |
| `evolith-cli architecture validate` | `ArchitectureService.validate()` | `architecture validate` | `validate_architecture` | - | PARTIAL | PROPOSED |
| `evolith-cli architecture drift` | `DriftDetectionService.detect()` | `architecture drift` | `detect_architecture_drift` | - | PARTIAL | PROPOSED |

---

## 8. ADR Operations

| `evolith-cli adr list` | `ADRService.list()` | `adr list` | `list_adrs` | `evolith://adrs` | OUT_OF_SCOPE | PROPOSED |
| `evolith-cli adr show` | `ADRService.get()` | `adr show` | `get_adr` | `evolith://adrs/{id}` | OUT_OF_SCOPE | PROPOSED |
| `evolith-cli adr create` | `ADRService.create()` | `adr create` | `create_adr` | - | OUT_OF_SCOPE | PROPOSED |

---

## 9. Evidence Operations

| `evolith-cli evidence collect` | `EvidenceService.collect()` | `evidence collect` | `collect_evidence` | - | PARTIAL | PROPOSED |
| `evolith-cli evidence export` | `EvidenceService.export()` | `evidence export` | `export_evidence` | - | PARTIAL | PROPOSED |

---

## 10. Report Operations

| `evolith-cli report compliance` | `ReportService.compliance()` | `report compliance` | `generate_compliance_report` | - | PARTIAL | PROPOSED |
| `evolith-cli report executive` | `ReportService.executive()` | `report executive` | `generate_executive_report` | - | PARTIAL | PROPOSED |

---

## 11. Parity Requirements

### 11.1 Same Logic, Different Interface

Every SDK method must be accessible via both CLI and MCP:
- CLI for humans and scripts
- MCP for AI agents and IDEs
- No exclusive logic in either interface

### 11.2 Consistent Results

When the same operation is called via CLI and MCP:
- Same validation rules apply
- Same findings returned
- Same error codes
- Same traceable sources

### 11.3 Justified Differences

Differences between CLI and MCP are justified by:

| Difference | Justification |
|------------|---------------|
| Interactive mode in CLI | Humans need prompts, AI uses structured inputs |
| Colored output in CLI | Terminal optimization, MCP returns structured data |
| File watching in CLI | Real-time feedback for humans, MCP uses events |
| Batch operations in CLI | Scripts and CI/CD pipelines |

### 11.4 Out of Scope for Core

These capabilities belong to Evolith Tracker, not Core SDK/CLI/MCP:

| Capability | Reason |
|------------|--------|
| Approval workflows | SaaS feature, not governance |
| User management | SaaS feature |
| Multi-tenant dashboards | SaaS feature |
| Billing integration | SaaS feature |
| SLA monitoring | SaaS feature |

---

## 12. Implementation Checklist

For each capability, verify:
- [ ] SDK method exists and is tested
- [ ] CLI command implemented and documented
- [ ] MCP tool defined and implemented
- [ ] CLI and MCP produce identical results
- [ ] Error codes are consistent
- [ ] Traceability maintained to Core source

---
[Back to SDK/CLI Planning Index](./README.md)