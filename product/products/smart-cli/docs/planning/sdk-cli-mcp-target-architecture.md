# SDK/CLI/MCP Target Architecture

> **Status:** Proposed
> **Date:** 2026-06-06
> **Reference:** Evolith Product Vision Master §2.3

---

## 1. Design Principles

### 1.1 Evolith Core as Single Source of Truth

All SDK, CLI, and MCP operations derive from Evolith Core artifacts:
- Rulesets in `rulesets/`
- ADRs in `reference/core/architecture/adrs/`
- Standards in `reference/core/sdlc/standards/`
- Schemas in `src/rulesets/schema/`
- Templates in `.harness/templates/`

No component creates its own truth. Every rule, artifact, and standard must be traceable to its source in Evolith Core.

### 1.2 SDK as Single Logic Layer

```
┌─────────────────────────────────────────────────────────┐
│                    Evolith Core                          │
│         (rulesets, ADRs, standards, schemas)             │
└─────────────────────┬───────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────┐
│                    Evolith SDK                           │
│  CoreProvider │ RulesetRegistry │ Validator │ Executor  │
└────────┬────────────────┬──────────────────┬────────────┘
         │                │                  │
         ▼                ▼                  ▼
┌─────────────┐   ┌─────────────┐   ┌─────────────┐
│    CLI      │   │  MCP Server │   │  CI/CD      │
│ (Commands)  │   │   (Tools)   │   │ (Actions)   │
└─────────────┘   └─────────────┘   └─────────────┘
```

### 1.3 Separation of Concerns

| Layer | Responsibility |
|-------|----------------|
| **SDK** | Business logic, rule resolution, validation, execution |
| **CLI** | Human interaction, scripts, pipeline integration |
| **MCP** | AI agent consumption, IDE integration, tool execution |
| **Tracker** | Approval workflows, audit trails, SaaS features (OUT OF SCOPE for Core) |
| **ACLs** | External system integration (OUT OF SCOPE for SDK) |

### 1.4 Interface Segregation

- CLI exposes terminal-optimized commands with colored output
- MCP exposes JSON-RPC tools with structured inputs/outputs
- SDK provides both synchronous and async interfaces
- No capability is exclusive to one interface unless justified by interaction type

---

## 2. SDK Architecture

### 2.1 Package Structure

```
@beyondnet/evolith-sdk (future)
├── @beyondnet/evolith-sdk-core        # Core loading, rule resolution, validation
├── @beyondnet/evolith-sdk-artifacts   # Artifact generation and validation
├── @beyondnet/evolith-sdk-sdlc        # Phase gates, evidence collection
└── @beyondnet/evolith-sdk-mcp         # MCP protocol adapters

@beyondnet/evolith-cli (current)
└── Implements CLI commands using @beyondnet/evolith-sdk-core
```

**Note:** Currently, SDK and CLI are combined in `src/sdk/cli/`. Future refactoring should extract SDK into separate packages.

### 2.2 Core Services

#### CoreLoader
- Loads Evolith Core from filesystem or remote URL
- Caches Core metadata for performance
- Validates Core integrity (version, structure)

#### RulesetRegistry
- Discovers all rulesets in Core
- Provides metadata (version, effective date, category)
- Supports filtering by category, severity, phase

#### RulesetResolver
- Resolves which rules apply to a given satellite
- Handles inheritance chain (Core → Satellite)
- Manages version compatibility

#### RulesetValidator
- Executes validation against a satellite's state
- Returns structured findings with severity and blocking status
- Supports incremental validation (changed files only)

#### ArtifactService
- Generates artifacts from templates (PRD, User Story, ADR, etc.)
- Validates artifacts against JSON schemas
- Supports bilingual generation (EN/ES)

#### SDLCService
- Manages phase transitions
- Collects and validates phase gate evidence
- Reports SDLC status

#### EvidenceService
- Collects evidence for compliance reporting
- Aggregates findings across rulesets
- Generates traceable evidence chains

#### DriftDetectionService
- Compares satellite state against Core rulesets
- Identifies architectural drift
- Reports drift severity and impacted components

### 2.3 SDK Interface

```typescript
interface EvolithClient {
  core: CoreService;
  rulesets: RulesetService;
  validate: ValidationService;
  artifacts: ArtifactService;
  sdlc: SDLCService;
  evidence: EvidenceService;
}

interface CoreService {
  load(path?: string): Promise<CoreMetadata>;
  info(): CoreMetadata;
  validate(): ValidationResult;
  update(): Promise<UpdateResult>;
  search(query: string): Promise<SearchResult[]>;
}

interface RulesetService {
  list(): Promise<Ruleset[]>;
  get(id: string): Promise<Ruleset>;
  resolve(satellitePath: string): Promise<ResolvedRuleset[]>;
  validate(satellitePath: string, rulesetId?: string): Promise<ValidationResult>;
  explain(ruleId: string): Promise<RuleExplanation>;
}

interface ValidationService {
  project(path: string): Promise<ValidationResult>;
  ruleset(satellitePath: string, rulesetId: string): Promise<ValidationResult>;
  architecture(satellitePath: string): Promise<ValidationResult>;
  sdlc(satellitePath: string): Promise<ValidationResult>;
  all(satellitePath: string): Promise<ValidationResult>;
}

interface ArtifactService {
  list(): Promise<ArtifactTemplate[]>;
  generate(templateId: string, context: ArtifactContext): Promise<GeneratedArtifact>;
  validate(artifact: GeneratedArtifact): Promise<ValidationResult>;
  schema(templateId: string): Promise<JSONSchema>;
}

interface SDLCService {
  status(satellitePath: string): Promise<SDLCStatus>;
  nextGate(satellitePath: string): Promise<PhaseGate>;
  validateGate(satellitePath: string, gateId: string): Promise<GateValidationResult>;
  evidence(satellitePath: string, gateId: string): Promise<Evidence[]>;
}
```

---

## 3. CLI Architecture

### 3.1 Command Structure

```
evolith-cli <domain> <action> [options]

Domains:
  core        - Core information and management
  ruleset     - Ruleset discovery and validation
  validate    - Project validation
  artifact    - Artifact generation
  sdlc        - SDLC operations
  gate        - Phase gate operations
  adr         - ADR management
  agent       - Agent management
  scaffold    - Architecture scaffolding
```

### 3.2 Global Options

| Option | Description |
|--------|-------------|
| `--core <path>` | Path to Evolith Core (default: auto-detect) |
| `--satellite <path>` | Path to satellite repository (default: cwd) |
| `--format <json\|yaml\|text>` | Output format (default: text) |
| `--output <path>` | Write output to file |
| `--verbose` | Enable verbose output |
| `--quiet` | Suppress non-essential output |
| `--dry-run` | Simulate without making changes |

### 3.3 Error Codes

| Code | Name | Description |
|------|------|-------------|
| 0 | SUCCESS | Operation completed successfully |
| 1 | VALIDATION_FAILED | One or more rules failed validation |
| 2 | CONFIGURATION_ERROR | Invalid configuration or inputs |
| 3 | CORE_NOT_FOUND | Evolith Core not found at path |
| 4 | RULESET_NOT_FOUND | Requested ruleset doesn't exist |
| 5 | INVALID_INPUT | Invalid arguments or options |
| 6 | VERSION_CONFLICT | Core/satellite version mismatch |
| 7 | EXECUTION_ERROR | Error during command execution |
| 8 | PARTIAL_SUCCESS | Operation completed with warnings |
| 9 | INTERNAL_ERROR | Unexpected internal error |

### 3.4 Output Format

All commands return structured JSON when `--format json`:

```json
{
  "success": true,
  "operation": "validate_project",
  "coreVersion": "1.0.0",
  "rulesetVersion": "1.0.0",
  "timestamp": "2026-06-06T12:00:00Z",
  "summary": {
    "evaluated": 47,
    "passed": 44,
    "failed": 2,
    "warnings": 1
  },
  "findings": [
    {
      "ruleId": "HXA-01",
      "severity": "MUST",
      "title": "Core has zero framework dependencies",
      "status": "passed",
      "location": "src/domain/"
    }
  ],
  "traceability": [
    {
      "source": "rulesets/adr/adr-0002-hexagonal-architecture.rules.json",
      "rule": "HXA-01",
      "artifact": "src/domain/User.ts"
    }
  ],
  "metadata": {
    "satellite": "ums",
    "phase": "F1",
    "duration": "2.3s"
  }
}
```

---

## 4. MCP Server Architecture

### 4.1 Transport

**Primary:** stdio (JSON-RPC over stdin/stdout)
**Secondary:** HTTP (optional, for browser-based clients)

### 4.2 Capability Classification

| Type | Use Case | Examples |
|------|----------|----------|
| **Tool** | Operations that change state or compute | validate_project, generate_artifact, execute_ruleset |
| **Resource** | Read-only data access | core_info, rulesets_list, adr_get |
| **ResourceTemplate** | Parameterized data queries | artifact_search, adr_search |
| **Prompt** | Reusable interaction patterns | prepare_discovery, review_architecture |

### 4.3 Resources

```
evolith://core/info                      # Core metadata
evolith://core/capabilities              # Supported capabilities
evolith://rulesets                       # All rulesets
evolith://rulesets/{id}                  # Specific ruleset
evolith://rulesets/{id}/rules            # Rules in a ruleset
evolith://adrs                           # All ADRs
evolith://adrs/{id}                      # Specific ADR
evolith://artifacts/templates            # Artifact templates
evolith://sdlc/phases                    # SDLC phases
evolith://sdlc/gates/{phase}             # Gates for a phase
evolith://standards                      # Standards corpus
evolith://taxonomy                       # Repository taxonomy
```

### 4.4 Tools

```typescript
// Validation Tools
validate_project(satellitePath?: string): Promise<ValidationResult>
validate_ruleset(rulesetId: string, satellitePath?: string): Promise<ValidationResult>
validate_architecture(satellitePath?: string): Promise<ValidationResult>

// Ruleset Tools
list_rulesets(category?: string): Promise<Ruleset[]>
get_ruleset(rulesetId: string): Promise<Ruleset>
explain_rule(ruleId: string): Promise<RuleExplanation>
resolve_rulesets(satellitePath: string): Promise<ResolvedRuleset[]>

// Artifact Tools
list_artifact_templates(): Promise<ArtifactTemplate[]>
generate_artifact(templateId: string, context: ArtifactContext): Promise<GeneratedArtifact>
validate_artifact(artifact: object): Promise<ValidationResult>

// Architecture Tools
initialize_architecture(phase: F1|F2|F3, options: ArchitectureOptions): Promise<ArchitectureResult>
detect_architecture_drift(satellitePath?: string): Promise<DriftReport>
inspect_architecture(satellitePath?: string): Promise<ArchitectureReport>

// SDLC Tools
get_sdlc_status(satellitePath?: string): Promise<SDLCStatus>
validate_phase_gate(phase: number, gate: number, satellitePath?: string): Promise<GateResult>

// ADR Tools
list_adrs(status?: string): Promise<ADR[]>
get_adr(adrId: string): Promise<ADR>
create_adr(context: ADRContext): Promise<CreatedADR>

// Core Tools
search_core(query: string): Promise<SearchResult[]>
get_core_info(): Promise<CoreInfo>
```

### 4.5 Prompts

```typescript
// Reusable interaction patterns for AI agents

implement_with_evolith:
  "You are implementing a feature following Evolith governance.
   First, consult the applicable rulesets for this satellite's phase.
   Then, generate artifacts using the approved templates.
   Finally, validate all changes against the rulesets."

review_architecture:
  "Review the architecture of the provided satellite against
   the F1/F2/F3 ruleset that matches its current phase.
   Identify any violations and suggest remediations."

prepare_discovery:
  "Help the user prepare for Phase 1 Discovery.
   Generate a Discovery Canvas, Business Case ROI, and Ballpark Estimation
   using the approved templates and validation rules."

generate_adr:
  "Guide the user through creating an Architectural Decision Record.
   Ensure all required sections are present and traceable to Core ADRs."
```

---

## 5. Shared Models

### 5.1 ValidationResult

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

interface Finding {
  ruleId: string;
  severity: 'MUST' | 'SHOULD' | 'COULD';
  title: string;
  description: string;
  status: 'passed' | 'failed' | 'warning' | 'skipped';
  location?: string;
  expected?: string;
  actual?: string;
  blocking: boolean;
}
```

### 5.2 Ruleset

```typescript
interface Ruleset {
  id: string;
  title: string;
  description: string;
  version: string;
  effectiveDate: string;
  category: string;
  scope: 'core' | 'satellite';
  rules: Rule[];
  source: string;  // Path in Core
}

interface Rule {
  id: string;
  severity: 'MUST' | 'SHOULD' | 'COULD';
  title: string;
  description: string;
  validationQuery: string;
  blocking: boolean;
  category?: string;
  layer?: string;
  references?: string[];
}
```

---

## 6. Caching Strategy

### 6.1 Core Metadata Cache

- **TTL:** 5 minutes
- **Location:** `~/.cache/evolith-core/`
- **Invalidation:** On Core update or manual refresh

### 6.2 Ruleset Resolution Cache

- **TTL:** 1 hour
- **Scope:** Per satellite (based on evolith.yaml hash)
- **Invalidation:** On ruleset update or evolith.yaml change

### 6.3 Validation Cache

- **TTL:** Until next git commit
- **Scope:** Per file (based on file hash)
- **Invalidation:** On file change detected by watcher

---

## 7. Security Considerations

### 7.1 Core Integrity

- SDK verifies Core signature (future: HMAC)
- No modification of Core files through SDK
- Read-only access to Core by default

### 7.2 Satellite Validation

- Validates against Core rulesets, not local copies
- Prevents satellites from shipping modified rules
- Enforces version pinning (INH-02)

### 7.3 MCP Security

- No execution of arbitrary code
- File operations sandboxed to satellite directory
- No network requests by default (optional telemetry)

---

## 8. Non-Functional Requirements

### 8.1 Performance

- Core load: < 500ms (cached)
- Rule validation: < 100ms per rule
- Full project validation: < 10s for typical satellite

### 8.2 Offline Mode

- CLI fully functional offline (Core bundled or cached)
- MCP can operate offline with cached Core metadata

### 8.3 Observability

- Structured logging (JSON to stdout)
- Log levels: error, warn, info, debug
- Telemetry opt-in only (disabled by default)

---

## 9. Extension Points

### 9.1 Plugin System (Future)

```typescript
interface EvolithPlugin {
  name: string;
  version: string;
  commands?: Command[];
  tools?: Tool[];
  resources?: Resource[];
  hooks?: Hook[];
}
```

### 9.2 Custom Rulesets (Future)

Satellites can define local rulesets that extend Core:
- Placed in `rulesets/local/` directory
- Loaded after Core rulesets
- Cannot override Core rules (INH-01)

---

## 10. Migration Strategy

### Phase 1: SDK Extraction
1. Extract Core logic into `@beyondnet/evolith-sdk-core`
2. Keep CLI in `@beyondnet/evolith-cli` using SDK
3. Maintain backward compatibility

### Phase 2: MCP Completion
1. Implement MCP server using SDK
2. Keep CLI as primary for humans
3. MCP for AI agents and IDEs

### Phase 3: Package Split
1. Split SDK into `@beyondnet/evolith-sdk-core`, `@beyondnet/evolith-sdk-artifacts`, `@beyondnet/evolith-sdk-sdlc`
2. Publish to npm
3. CLI depends on SDK packages

---

## 11. Related Documents

- `sdk-cli-mcp-current-state-assessment.md` - Current state
- `sdk-api-capability-catalog.md` - API details
- `cli-command-catalog.md` - CLI commands
- `mcp-capability-catalog.md` - MCP capabilities
- `sdk-cli-mcp-implementation-roadmap.md` - Implementation plan

---
[Back to SDK/CLI Planning Index](./README.md)