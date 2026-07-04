# Catálogo de Capacidades de la API del SDK

> **Estado:** Propuesto
> **Fecha:** 2026-06-06

---

## 1. EvolithClient

Punto de entrada principal del SDK.

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

| Método | Entrada | Salida | Descripción |
|--------|---------|--------|-------------|
| `load(path?)` | `path?: string` | `Promise<CoreMetadata>` | Carga el Core desde una ruta o lo detecta automáticamente |
| `info()` | ninguna | `CoreMetadata` | Obtiene metadatos del Core en caché |
| `validate()` | ninguna | `ValidationResult` | Valida la integridad del Core |
| `update()` | ninguna | `Promise<UpdateResult>` | Verifica actualizaciones del Core |
| `search(query)` | `string` | `Promise<SearchResult[]>` | Busca contenido en el Core |
| `index()` | ninguna | `Promise<CoreIndex>` | Obtiene el índice completo del Core |

---

## 3. RulesetService

| Método | Entrada | Salida | Descripción |
|--------|---------|--------|-------------|
| `list(category?)` | `category?: string` | `Promise<Ruleset[]>` | Lista todos los rulesets |
| `get(id)` | `string` | `Promise<Ruleset>` | Obtiene un ruleset específico |
| `resolve(satellitePath)` | `string` | `Promise<ResolvedRuleset[]>` | Resuelve los rulesets aplicables |
| `validate(satellitePath, rulesetId?)` | `string, string?` | `Promise<ValidationResult>` | Valida contra rulesets |
| `explain(ruleId)` | `string` | `Promise<RuleExplanation>` | Explica la intención de una regla |

---

## 4. ValidationService

| Método | Entrada | Salida | Descripción |
|--------|---------|--------|-------------|
| `project(path?)` | `path?: string` | `Promise<ValidationResult>` | Valida el proyecto completo |
| `ruleset(rulesetId, path?)` | `string, string?` | `Promise<ValidationResult>` | Valida un ruleset específico |
| `architecture(path?)` | `path?: string` | `Promise<ValidationResult>` | Valida reglas de arquitectura |
| `sdlc(path?)` | `path?: string` | `Promise<ValidationResult>` | Valida reglas SDLC |
| `all(path?)` | `path?: string` | `Promise<ValidationResult>` | Valida todas las reglas aplicables |

---

## 5. ArtifactService

| Método | Entrada | Salida | Descripción |
|--------|---------|--------|-------------|
| `list()` | ninguna | `Promise<ArtifactTemplate[]>` | Lista las plantillas disponibles |
| `get(templateId)` | `string` | `Promise<ArtifactTemplate>` | Obtiene una plantilla específica |
| `generate(templateId, context)` | `string, ArtifactContext` | `Promise<GeneratedArtifact>` | Genera un artefacto |
| `validate(artifact)` | `GeneratedArtifact` | `Promise<ValidationResult>` | Valida un artefacto |
| `schema(templateId)` | `string` | `Promise<JSONSchema>` | Obtiene el esquema de la plantilla |

---

## 6. SDLCService

| Método | Entrada | Salida | Descripción |
|--------|---------|--------|-------------|
| `status(path?)` | `path?: string` | `Promise<SDLCStatus>` | Obtiene el estado SDLC |
| `currentPhase(path?)` | `path?: string` | `Promise<Phase>` | Obtiene la fase actual |
| `nextGate(path?)` | `path?: string` | `Promise<PhaseGate>` | Obtiene el siguiente gate |
| `validateGate(phase, gate, path?)` | `number, number, string?` | `Promise<GateResult>` | Valida un gate |
| `evidence(path?, gate?)` | `string?, number?` | `Promise<Evidence[]>` | Obtiene evidencia de un gate |

---

## 7. ADRService

| Método | Entrada | Salida | Descripción |
|--------|---------|--------|-------------|
| `list(status?)` | `status?: string` | `Promise<ADR[]>` | Lista ADRs |
| `get(adrId)` | `string` | `Promise<ADR>` | Obtiene un ADR específico |
| `search(query)` | `string` | `Promise<ADR[]>` | Busca ADRs |
| `create(context)` | `ADRContext` | `Promise<CreatedADR>` | Crea un nuevo ADR |
| `supersede(adrId, newAdrId)` | `string, string` | `Promise<void>` | Marca un ADR como reemplazado |
| `dependencies(adrId)` | `string` | `Promise<ADR[]>` | Obtiene dependencias de un ADR |

---

## 8. EvidenceService

| Método | Entrada | Salida | Descripción |
|--------|---------|--------|-------------|
| `collect(satellitePath, scope)` | `string, EvidenceScope` | `Promise<Evidence[]>` | Recolecta evidencia |
| `validate(evidence)` | `Evidence[]` | `Promise<ValidationResult>` | Valida evidencia |
| `export(format, evidence)` | `string, Evidence[]` | `Promise<string>` | Exporta evidencia |
| `trace(artifactId)` | `string` | `Promise<Trace>` | Construye trazabilidad de artefacto |

---

## 9. DriftDetectionService

| Método | Entrada | Salida | Descripción |
|--------|---------|--------|-------------|
| `detect(path?)` | `path?: string` | `Promise<DriftReport>` | Detecta desviación arquitectónica |
| `compare(path?, rulesetId)` | `string, string` | `Promise<DriftReport>` | Compara contra un ruleset específico |
| `report(drift)` | `DriftReport` | `Promise<string>` | Formatea el reporte de desviación |

---

## 10. Modelos

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

## 11. Comandos CLI por Servicio

| Servicio | Comandos |
|----------|----------|
| CoreService | `smart-cli core info`, `smart-cli core validate`, `smart-cli core update`, `smart-cli core search` |
| RulesetService | `smart-cli ruleset list`, `smart-cli ruleset show`, `smart-cli ruleset validate`, `smart-cli ruleset explain` |
| ValidationService | `smart-cli validate project`, `smart-cli validate architecture`, `smart-cli validate sdlc` |
| ArtifactService | `smart-cli artifact list`, `smart-cli artifact generate`, `smart-cli artifact validate` |
| SDLCService | `smart-cli sdlc status`, `smart-cli gate list`, `smart-cli gate validate` |
| ADRService | `smart-cli adr list`, `smart-cli adr show`, `smart-cli adr create` |
| EvidenceService | `smart-cli evidence collect`, `smart-cli evidence export` |
| DriftDetectionService | `smart-cli architecture drift`, `smart-cli drift report` |

---

## 12. Herramientas MCP por Servicio

| Servicio | Herramientas |
|----------|--------------|
| CoreService | `get_core_info`, `search_core` |
| RulesetService | `list_rulesets`, `get_ruleset`, `resolve_rulesets`, `explain_rule` |
| ValidationService | `validate_project`, `validate_ruleset`, `validate_architecture`, `validate_sdlc` |
| ArtifactService | `list_artifact_templates`, `generate_artifact`, `validate_artifact` |
| SDLCService | `get_sdlc_status`, `validate_phase_gate`, `get_next_gate` |
| ADRService | `list_adrs`, `get_adr`, `search_adrs`, `create_adr` |
| EvidenceService | `collect_evidence`, `export_evidence`, `trace_artifact` |
| DriftDetectionService | `detect_architecture_drift`, `compare_ruleset`, `format_drift_report` |

---
[Volver al Índice de Planificación SDK/CLI](./README.md)
