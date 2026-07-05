# SDK API Capability Catalog

> **Status:** Proposed
> **Date:** 2026-06-06

---

## 1. EvolithClient

Main entry point for SDK.

```typescript
class EvolithClient {
  core: CoreService;
  rulesets: RulesetService;
  validate: ValidationService;
  artifacts: ArtifactService;
  sdlc: SDLCService;
  evidence: EvidenceService;
  adr: ADRService;
  drift: DriftDetectionService;
}
```

---

## 2. CoreService

| Method | Input | Output | Description |
|--------|-------|--------|-------------|
| `load(path?)` | `path?: string` | `Promise<CoreMetadata>` | Load Core from path or auto-detect |
| `info()` | none | `CoreMetadata` | Get cached Core metadata |
| `validate()` | none | `ValidationResult` | Validate Core integrity |
| `update()` | none | `Promise<UpdateResult>` | Check for Core updates |
| `search(query)` | `string` | `Promise<SearchResult[]>` | Search Core content |
| `index()` | none | `Promise<CoreIndex>` | Get full Core index |

---

## 3. RulesetService

| Method | Input | Output | Description |
|--------|-------|--------|-------------|
| `list(category?)` | `category?: string` | `Promise<Ruleset[]>` | List all rulesets |
| `get(id)` | `string` | `Promise<Ruleset>` | Get specific ruleset |
| `resolve(satellitePath)` | `string` | `Promise<ResolvedRuleset[]>` | Resolve applicable rulesets |
| `validate(satellitePath, rulesetId?)` | `string, string?` | `Promise<ValidationResult>` | Validate against rulesets |
| `explain(ruleId)` | `string` | `Promise<RuleExplanation>` | Explain a rule's intent |

---

## 4. ValidationService

| Method | Input | Output | Description |
|--------|-------|--------|-------------|
| `project(path?)` | `path?: string` | `Promise<ValidationResult>` | Validate entire project |
| `ruleset(rulesetId, path?)` | `string, string?` | `Promise<ValidationResult>` | Validate specific ruleset |
| `architecture(path?)` | `path?: string` | `Promise<ValidationResult>` | Validate architecture rules |
| `sdlc(path?)` | `path?: string` | `Promise<ValidationResult>` | Validate SDLC rules |
| `all(path?)` | `path?: string` | `Promise<ValidationResult>` | Validate all applicable rules |

---

## 5. ArtifactService

| Method | Input | Output | Description |
|--------|-------|--------|-------------|
| `list()` | none | `Promise<ArtifactTemplate[]>` | List available templates |
| `get(templateId)` | `string` | `Promise<ArtifactTemplate>` | Get specific template |
| `generate(templateId, context)` | `string, ArtifactContext` | `Promise<GeneratedArtifact>` | Generate artifact |
| `validate(artifact)` | `GeneratedArtifact` | `Promise<ValidationResult>` | Validate artifact |
| `schema(templateId)` | `string` | `Promise<JSONSchema>` | Get template schema |

---

## 6. SDLCService

| Method | Input | Output | Description |
|--------|-------|--------|-------------|
| `status(path?)` | `path?: string` | `Promise<SDLCStatus>` | Get SDLC status |
| `currentPhase(path?)` | `path?: string` | `Promise<Phase>` | Get current phase |
| `nextGate(path?)` | `path?: string` | `Promise<PhaseGate>` | Get next gate |
| `validateGate(phase, gate, path?)` | `number, number, string?` | `Promise<GateResult>` | Validate gate |
| `evidence(path?, gate?)` | `string?, number?` | `Promise<Evidence[]>` | Get gate evidence |

---

## 7. ADRService

| Method | Input | Output | Description |
|--------|-------|--------|-------------|
| `list(status?)` | `status?: string` | `Promise<ADR[]>` | List ADRs |
| `get(adrId)` | `string` | `Promise<ADR>` | Get specific ADR |
| `search(query)` | `string` | `Promise<ADR[]>` | Search ADRs |
| `create(context)` | `ADRContext` | `Promise<CreatedADR>` | Create new ADR |
| `supersede(adrId, newAdrId)` | `string, string` | `Promise<void>` | Mark ADR as superseded |
| `dependencies(adrId)` | `string` | `Promise<ADR[]>` | Get ADR dependencies |

---

## 8. EvidenceService

| Method | Input | Output | Description |
|--------|-------|--------|-------------|
| `collect(satellitePath, scope)` | `string, EvidenceScope` | `Promise<Evidence[]>` | Collect evidence |
| `validate(evidence)` | `Evidence[]` | `Promise<ValidationResult>` | Validate evidence |
| `export(format, evidence)` | `string, Evidence[]` | `Promise<string>` | Export evidence |
| `trace(artifactId)` | `string` | `Promise<Trace>` | Build artifact trace |

---

## 9. DriftDetectionService

| Method | Input | Output | Description |
|--------|-------|--------|-------------|
| `detect(path?)` | `path?: string` | `Promise<DriftReport>` | Detect architectural drift |
| `compare(path?, rulesetId)` | `string, string` | `Promise<DriftReport>` | Compare against specific ruleset |
| `report(drift)` | `DriftReport` | `Promise<string>` | Format drift report |

---

## 10. Models

### CoreMetadata
```typescript
interface CoreMetadata {
  version: string;
  effectiveDate: string;
  rulesetCount: number;
  adrCount: number;
  standardCount: number;
  path: string;
}
```

### Ruleset
```typescript
interface Ruleset {
  id: string;
  title: string;
  description: string;
  version: string;
  effectiveDate: string;
  category: 'architecture' | 'sdlc' | 'governance' | 'adr' | 'cross-cutting' | 'acl';
  scope: 'core' | 'satellite';
  rules: Rule[];
  source: string;
}
```

### ValidationResult
```typescript
interface ValidationResult {
  success: boolean;
  operation: string;
  coreVersion: string;
  rulesetVersion: string;
  timestamp: string;
  summary: {
    evaluated: number;
    passed: number;
    failed: number;
    warnings: number;
  };
  findings: Finding[];
  evidence: Evidence[];
  traceability: TraceabilityEntry[];
  metadata: Record<string, any>;
}
```

### ArtifactTemplate
```typescript
interface ArtifactTemplate {
  id: string;
  name: string;
  description: string;
  phase: 1 | 2 | 3 | 4 | 5;
  schema: JSONSchema;
  templatePath: string;
  requiredFields: string[];
  optionalFields: string[];
}
```

### SDLCStatus
```typescript
interface SDLCStatus {
  currentPhase: number;
  currentGate: number;
  gates: GateStatus[];
  lastUpdate: string;
  nextAction: string;
}
```

---

## 11. CLI Commands by Service

| Service | Commands |
|---------|----------|
| CoreService | `smart-cli core info`, `smart-cli core validate`, `smart-cli core update`, `smart-cli core search` |
| RulesetService | `smart-cli ruleset list`, `smart-cli ruleset show`, `smart-cli ruleset validate`, `smart-cli ruleset explain` |
| ValidationService | `smart-cli validate project`, `smart-cli validate architecture`, `smart-cli validate sdlc` |
| ArtifactService | `smart-cli artifact list`, `smart-cli artifact generate`, `smart-cli artifact validate` |
| SDLCService | `smart-cli sdlc status`, `smart-cli gate list`, `smart-cli gate validate` |
| ADRService | `smart-cli adr list`, `smart-cli adr show`, `smart-cli adr create` |
| EvidenceService | `smart-cli evidence collect`, `smart-cli evidence export` |
| DriftDetectionService | `smart-cli architecture drift`, `smart-cli drift report` |

---

## 12. MCP Tools by Service

| Service | Tools |
|---------|-------|
| CoreService | `get_core_info`, `search_core` |
| RulesetService | `list_rulesets`, `get_ruleset`, `resolve_rulesets`, `explain_rule` |
| ValidationService | `validate_project`, `validate_ruleset`, `validate_architecture`, `validate_sdlc` |
| ArtifactService | `list_artifact_templates`, `generate_artifact`, `validate_artifact` |
| SDLCService | `get_sdlc_status`, `validate_phase_gate`, `get_next_gate` |
| ADRService | `list_adrs`, `get_adr`, `search_adrs`, `create_adr` |
| EvidenceService | `collect_evidence`, `export_evidence`, `trace_artifact` |
| DriftDetectionService | `detect_architecture_drift`, `compare_ruleset`, `format_drift_report` |

---
[Back to SDK/CLI Planning Index](./README.md)