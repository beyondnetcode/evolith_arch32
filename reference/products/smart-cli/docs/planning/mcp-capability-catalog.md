# MCP Capability Catalog

> **Status:** Proposed
> **Date:** 2026-06-06
> **Reference:** SDK/CLI/MCP Target Architecture §4

---

## 1. MCP Server Overview

**Transport:** stdio (JSON-RPC over stdin/stdout)
**Protocol:** MCP 1.0
**Runtime:** Node.js (bundled with CLI)

---

## 2. Resources

### 2.1 Core Resources

| URI | Type | Description |
|-----|------|-------------|
| `evolith://core/info` | Resource | Core metadata (version, ruleset count, ADR count) |
| `evolith://core/capabilities` | Resource | List of supported capabilities |
| `evolith://core/vision` | Resource | Evolith Product Vision Master document |

### 2.2 Ruleset Resources

| URI | Type | Description |
|-----|------|-------------|
| `evolith://rulesets` | ResourceTemplate | List all rulesets with filters |
| `evolith://rulesets/{id}` | Resource | Specific ruleset details |
| `evolith://rulesets/{id}/rules` | Resource | Rules within a ruleset |

### 2.3 ADR Resources

| URI | Type | Description |
|-----|------|-------------|
| `evolith://adrs` | ResourceTemplate | List ADRs with filters |
| `evolith://adrs/{id}` | Resource | Specific ADR content |
| `evolith://adrs/{id}/context` | Resource | ADR context and dependencies |

### 2.4 SDLC Resources

| URI | Type | Description |
|-----|------|-------------|
| `evolith://sdlc/phases` | Resource | All SDLC phases |
| `evolith://sdlc/phases/{n}/gates` | Resource | Gates for a phase |
| `evolith://sdlc/status` | ResourceTemplate | Current SDLC status |

### 2.5 Artifact Resources

| URI | Type | Description |
|-----|------|-------------|
| `evolith://artifacts/templates` | Resource | All artifact templates |
| `evolith://artifacts/templates/{id}` | Resource | Specific template |
| `evolith://artifacts/schemas/{id}` | Resource | JSON Schema for template |

### 2.6 Standards Resources

| URI | Type | Description |
|-----|------|-------------|
| `evolith://standards` | Resource | All standards |
| `evolith://standards/{id}` | Resource | Specific standard |
| `evolith://taxonomy` | Resource | Repository taxonomy |

---

## 3. Tools

### 3.1 Core Tools

#### `get_core_info`
**Purpose:** Get Core metadata
**Input:** None
**Output:** `{ version, rulesetCount, adrCount, standardCount, path }`
**Errors:** CORE_NOT_FOUND

#### `search_core`
**Purpose:** Search Core content
**Input:** `{ query: string, scope?: string }`
**Output:** `SearchResult[]`
**Scope options:** all, adrs, rulesets, standards

### 3.2 Validation Tools

#### `validate_project`
**Purpose:** Validate satellite against all applicable rulesets
**Input:** `{ satellitePath?: string, format?: string }`
**Output:** `ValidationResult`
**Errors:** SATELLITE_NOT_FOUND, VALIDATION_FAILED

#### `validate_ruleset`
**Purpose:** Validate against specific ruleset
**Input:** `{ rulesetId: string, satellitePath?: string }`
**Output:** `ValidationResult`
**Errors:** RULESET_NOT_FOUND, VALIDATION_FAILED

#### `validate_architecture`
**Purpose:** Validate architecture phase rules
**Input:** `{ satellitePath?: string, phase?: F1|F2|F3 }`
**Output:** `ValidationResult`
**Errors:** INVALID_PHASE, VALIDATION_FAILED

#### `validate_sdlc`
**Purpose:** Validate SDLC phase gates
**Input:** `{ satellitePath?: string }`
**Output:** `ValidationResult`
**Errors:** VALIDATION_FAILED

### 3.3 Ruleset Tools

#### `list_rulesets`
**Purpose:** List available rulesets
**Input:** `{ category?: string }`
**Output:** `Ruleset[]`
**Categories:** architecture, sdlc, governance, adr, cross-cutting, acl

#### `get_ruleset`
**Purpose:** Get ruleset details
**Input:** `{ rulesetId: string }`
**Output:** `Ruleset`
**Errors:** RULESET_NOT_FOUND

#### `resolve_rulesets`
**Purpose:** Resolve rulesets for satellite
**Input:** `{ satellitePath: string }`
**Output:** `ResolvedRuleset[]`
**Errors:** SATELLITE_NOT_FOUND

#### `explain_rule`
**Purpose:** Explain rule intent
**Input:** `{ ruleId: string }`
**Output:** `RuleExplanation`
**Errors:** RULE_NOT_FOUND

### 3.4 Architecture Tools

#### `initialize_architecture`
**Purpose:** Initialize architecture for satellite
**Input:** `{ phase: F1|F2|F3, satellitePath?: string, options?: object }`
**Output:** `{ success: boolean, actions: string[] }`
**Errors:** INVALID_PHASE, SATELLITE_NOT_FOUND

#### `detect_architecture_drift`
**Purpose:** Detect architectural drift
**Input:** `{ satellitePath?: string }`
**Output:** `DriftReport`
**Errors:** SATELLITE_NOT_FOUND

#### `inspect_architecture`
**Purpose:** Inspect architecture state
**Input:** `{ satellitePath?: string }`
**Output:** `ArchitectureReport`
**Errors:** SATELLITE_NOT_FOUND

### 3.5 SDLC Tools

#### `get_sdlc_status`
**Purpose:** Get current SDLC status
**Input:** `{ satellitePath?: string }`
**Output:** `SDLCStatus`
**Errors:** SATELLITE_NOT_FOUND

#### `validate_phase_gate`
**Purpose:** Validate a phase gate
**Input:** `{ phase: number, gate: number, satellitePath?: string }`
**Output:** `GateValidationResult`
**Errors:** INVALID_GATE, SATELLITE_NOT_FOUND

#### `get_next_gate`
**Purpose:** Get next required gate
**Input:** `{ satellitePath?: string }`
**Output:** `{ phase: number, gate: number, requirements: string[] }`
**Errors:** SATELLITE_NOT_FOUND

### 3.6 Artifact Tools

#### `list_artifact_templates`
**Purpose:** List artifact templates
**Input:** `{ phase?: number }`
**Output:** `ArtifactTemplate[]`

#### `generate_artifact`
**Purpose:** Generate artifact from template
**Input:** `{ templateId: string, context: object, language?: string }`
**Output:** `{ content: string, path: string }`
**Errors:** TEMPLATE_NOT_FOUND, INVALID_CONTEXT

#### `validate_artifact`
**Purpose:** Validate artifact
**Input:** `{ content: string, templateId: string }`
**Output:** `ValidationResult`
**Errors:** INVALID_ARTIFACT

### 3.7 ADR Tools

#### `list_adrs`
**Purpose:** List ADRs
**Input:** `{ status?: string, runtime?: string }`
**Output:** `ADR[]`
**Statuses:** proposed, accepted, deprecated, superseded

#### `get_adr`
**Purpose:** Get ADR
**Input:** `{ adrId: string }`
**Output:** `ADR`
**Errors:** ADR_NOT_FOUND

#### `create_adr`
**Purpose:** Create new ADR
**Input:** `{ title: string, context: string, decision: string, consequences: string }`
**Output:** `{ adrId: string, path: string }`
**Errors:** INVALID_INPUT

### 3.8 Evidence Tools

#### `collect_evidence`
**Purpose:** Collect compliance evidence
**Input:** `{ satellitePath?: string, scope?: string }`
**Output:** `Evidence[]`
**Errors:** COLLECTION_FAILED

#### `export_evidence`
**Purpose:** Export evidence report
**Input:** `{ format: string, evidence: Evidence[] }`
**Output:** `{ content: string, mimeType: string }`

#### `trace_artifact`
**Purpose:** Build artifact traceability
**Input:** `{ artifactId: string }`
**Output:** `Trace`
**Errors:** ARTIFACT_NOT_FOUND

### 3.9 Report Tools

#### `generate_compliance_report`
**Purpose:** Generate compliance report
**Input:** `{ satellitePath?: string, format?: string }`
**Output:** `Report`
**Errors:** REPORT_FAILED

#### `generate_executive_report`
**Purpose:** Generate DORA+SPACE executive report
**Input:** `{ satellitePath?: string }`
**Output:** `ExecutiveReport`
**Errors:** REPORT_FAILED

#### `explain_violation`
**Purpose:** Explain a rule violation
**Input:** `{ finding: Finding }`
**Output:** `{ explanation: string, remediation: string[], references: string[] }`

---

## 4. Prompts

### 4.1 Discovery Phase

```
prepare_discovery:
  "Help the user prepare for Phase 1 Discovery of the Evolith SDLC.
   Generate a Discovery Canvas, Business Case ROI, and Ballpark Estimation
   using the approved templates from .harness/templates/.
   Ensure all artifacts are bilingual (EN/ES) and validated against schemas.
   The satellite is located at: {satellitePath}"
```

### 4.2 Architecture Review

```
review_architecture:
  "Review the architecture of the provided satellite against
   the F1/F2/F3 ruleset that matches its current phase.
   Inspect the bounded contexts, layer structure, and dependencies.
   Identify any violations of hexagonal architecture rules.
   Suggest specific remediations with rule references.
   Satellite path: {satellitePath}"
```

### 4.3 Ruleset Compliance

```
review_ruleset_compliance:
  "Validate the satellite at {satellitePath} against all applicable rulesets.
   Run 'validate_project' and explain each finding.
   Group findings by severity (MUST/SHOULD/COULD) and category.
   Highlight blocking violations that prevent phase gate progression.
   Provide specific remediation steps for each failed rule."
```

### 4.4 Implementation

```
implement_with_evolith:
  "You are implementing a feature following Evolith governance.
   First, determine the current phase and applicable rulesets.
   Then, consult the relevant ADR for architectural decisions.
   Generate artifacts using approved templates.
   Validate all changes against the rulesets before completing.
   Satellite: {satellitePath}, Feature: {featureDescription}"
```

### 4.5 ADR Creation

```
generate_adr:
  "Guide the user through creating an Architectural Decision Record.
   Consult existing ADRs in the Core to avoid duplication.
   Ensure the new ADR references the decision it supersedes (if any).
   Use the standard ADR template from .harness/templates/.
   Include: Status, Context, Decision, Consequences, Alternatives."
```

### 4.6 Phase Gate Preparation

```
prepare_phase_gate:
  "Help prepare for Phase {phase} Gate {gate}.
   List the required evidence for this gate.
   Check current satellite state against requirements.
   Identify missing artifacts or validations.
   Generate a checklist of actions to pass the gate.
   Satellite: {satellitePath}"
```

---

## 5. Implementation Status

| Capability | Status | Priority |
|-----------|--------|----------|
| **Resources** | | |
| Core info | NOT_IMPLEMENTED | HIGH |
| Rulesets list | NOT_IMPLEMENTED | HIGH |
| ADRs list | NOT_IMPLEMENTED | HIGH |
| SDLC status | NOT_IMPLEMENTED | MEDIUM |
| Artifact templates | NOT_IMPLEMENTED | MEDIUM |
| **Tools** | | |
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

## 6. MCP Protocol Implementation

### 6.1 Required Package

```bash
npm install @modelcontextprotocol/sdk
```

### 6.2 Server Structure

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

## 7. Error Codes

| Code | Name | Description |
|------|------|-------------|
| CORE_NOT_FOUND | Core not found | Evolith Core not at expected path |
| SATELLITE_NOT_FOUND | Satellite not found | Satellite not found at path |
| RULESET_NOT_FOUND | Ruleset not found | Requested ruleset doesn't exist |
| RULE_NOT_FOUND | Rule not found | Requested rule ID doesn't exist |
| ADR_NOT_FOUND | ADR not found | Requested ADR doesn't exist |
| TEMPLATE_NOT_FOUND | Template not found | Artifact template not found |
| ARTIFACT_NOT_FOUND | Artifact not found | Artifact not found |
| INVALID_PHASE | Invalid phase | Phase must be F1, F2, or F3 |
| INVALID_GATE | Invalid gate | Gate number out of range |
| VALIDATION_FAILED | Validation failed | One or more rules failed |
| REPORT_FAILED | Report failed | Error generating report |
| INVALID_INPUT | Invalid input | Invalid tool arguments |
| COLLECTION_FAILED | Collection failed | Error collecting evidence |

---
[Back to SDK/CLI Planning Index](./README.md)