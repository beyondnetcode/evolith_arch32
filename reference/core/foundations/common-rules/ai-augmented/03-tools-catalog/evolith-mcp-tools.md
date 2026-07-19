# Evolith MCP Tools Catalog

This document catalogs all MCP tools provided by the Evolith CLI for AI agent automation.

## Tool Inventory

| Tool Name | Category | Purpose | Mutative |
|-----------|----------|---------|----------|
| `evolith-adr-create` | ADR | Create a new Architecture Decision Record. Writes reference/archite… | Yes |
| `evolith-adr-get` | ADR | Get the full details of a single ADR by id (e.g. ADR-0001) or number. | No |
| `evolith-adr-list` | ADR | List all Architecture Decision Records (id, title, status, date). | No |
| `evolith-adr-matrix` | ADR | Get the ADR matrix summary (totals by status + recent ADRs). | No |
| `evolith-adr-update` | ADR | Update the status of an existing ADR (Proposed | Accepted | Depreca… | Yes |
| `evolith-agent-install` | Agents | Install a new Evolith agent | Yes |
| `evolith-agent-list` | Agents | List all installed Evolith agents | No |
| `evolith-agent-remove` | Agents | Remove an Evolith agent | Yes |
| `evolith-agent-run` | Agents | Run an intent through the Agent Runtime pipeline | No |
| `evolith-agent-upgrade` | Agents | Upgrade an existing Evolith agent | Yes |
| `evolith-agent-validate` | Agents | Validate a specific agent ruleset | No |
| `evolith-architecture-validate` | Architecture | Validate repository architecture along the progressive maturity axis | No |
| `evolith-drift-detect` | Architecture | Detect architecture drift in a repository | No |
| `evolith-phase-artifacts-evaluate` | Architecture | Measure downstream-phase artifact completeness for a confirmed topo… | No |
| `evolith-topology-get` | Architecture | Get a specific architecture topology by ID | No |
| `evolith-topology-list` | Architecture | List all available architecture topologies in Evolith Core. | No |
| `evolith-pattern-list` | Architecture | List canonical architecture patterns, filterable by category, kind, topology and whether they carry executable enforcement. | No |
| `evolith-pattern-get` | Architecture | Get a single canonical architecture pattern by id (case-insensitive). | No |
| `evolith-pattern-list-by-topology` | Architecture | List the patterns that apply to a topology, with applicability, guidance and the rule ids that enforce them. | No |
| `evolith-topology-recommend` | Architecture | Recommend a topology composition from technical signals (advisory, … | No |
| `evolith-auto-fix` | Auto-fix | Apply automatic fixes to architectural violations reported by Evoli… | Yes |
| `evolith-composable-validate` | Composable-validate.tool | Validate using the composable engine (GT-312). Supports multiple va… | No |
| `evolith-config-get` | Config | Get Evolith configuration value | No |
| `evolith-config-set` | Config | Set Evolith configuration value | Yes |
| `evolith-docs-scaffold` | Docs-scaffold.tool | Scaffold the base documentation required by Evolith (README.md, AGE… | Yes |
| `evolith-evaluate` | Evaluate.tool | Evaluate a canonical EvaluationContext (gates, artifacts, rules, co… | No |
| `evolith-fixtures` | Fixtures | Seed reproducible fixtures and sample data (evolith.yaml, ADRs, rul… | Yes |
| `evolith-upgrade-apply` | Governance | Apply a satellite upgrade from the upstream Evolith core. Writes fi… | Yes |
| `evolith-upgrade-plan` | Governance | Plan a satellite upgrade against the upstream Evolith core (read-on… | Yes |
| `evolith-init-batch` | Init | Non-interactive (batch/CI) initialization of an Evolith satellite. … | Yes |
| `evolith-metrics` | Metrics.tool | Get MCP server metrics (per-tool call counts, latency, failures) | No |
| `evolith-phase-advance` | Phase-advance | Propose an SDLC phase transition by evaluating the current phase ex… | Yes |
| `evolith-moscow-create` | Planning | Create a new MoSCoW prioritization analysis | Yes |
| `evolith-moscow-list` | Planning | List all MoSCoW analyses in a repository | No |
| `evolith-moscow-load` | Planning | Load an existing MoSCoW analysis | No |
| `evolith-moscow-remove` | Planning | Remove a specific item from a MoSCoW analysis | Yes |
| `evolith-moscow-report` | Planning | Generate a markdown report of a MoSCoW analysis | No |
| `evolith-moscow-update` | Planning | Update a specific item in a MoSCoW analysis | Yes |
| `evolith-moscow-validate` | Planning | Validate a MoSCoW analysis rules (e.g. 60/20/20 split) | No |
| `evolith-satellite-adopt` | Satellite-adopt.tool | Adopt an existing GitHub repository as an Evolith satellite. Return… | Yes |
| `evolith-satellite-create` | Satellite-create.tool | Create a new satellite repository on GitHub and register it with Ev… | Yes |
| `evolith-satellite-list` | Satellite-list.tool | List all registered Evolith satellites from the local satellite-reg… | No |
| `evolith-satellite-status` | Satellite-status.tool | Get the status and details of a registered Evolith satellite by its… | No |
| `evolith-scaffold` | Scaffold.tool | Scaffold an Evolith satellite along the progressive maturity axis | Yes |
| `evolith-dora-metrics` | SDLC | Calculate DORA metrics approximations using Git log history | No |
| `evolith-gate-evaluate` | SDLC | Evaluate a specific SDLC phase gate | No |
| `evolith-sdlc-handoff` | SDLC | Perform a phase gate handoff (e.g. phase-0 to phase-1) | Yes |
| `evolith-sdlc-status` | SDLC | Get the current SDLC phase status | No |
| `evolith-sdlc-generate` | Sdlc-generate.tool | Generate a Hexagonal Architecture scaffold from a Mermaid classDiag… | Yes |
| `evolith-validate` | Validate.tool | Validate a satellite repository against Evolith rules. Supports end… | No |

> **Derived from source (GT-445).** The inventory above is the complete set of **50** governance MCP tools, reconciled from the canonical registration sources under `src/packages/mcp-server/src/tools/` (name + description) — it is the authoritative surface alongside the generated [Product Surface Inventory](../../../../../../product/products/smart-cli/product-inventory.md) and the live MCP registry. Category is derived from the tool source file; *Mutative* is a verb heuristic. Regenerate when tools change.

---

## Tool Specifications

> **Legacy curated subset — being superseded.** The detailed specs below predate the current 47-tool surface: several document **obsolete tool names that no longer exist** (`evolith-agent-handoff`, `evolith-architecture-evaluate`, `evolith-gate-status`, `evolith-moscow-analyze`, `evolith-moscow-export`, `evolith-alias`, `evolith-schema`). The authoritative, complete list is the **Tool Inventory** table above. Full per-tool spec regeneration from source is a follow-on (GT-445).

### evolith-agent-handoff

**Purpose:** Create a new agent configuration file with validated schema.

**Input Schema:**
```typescript
{
  agentName: string;
  description: string;
  role: "validator" | "generator" | "analyzer";
  rulesetId?: string;
}
```

**Output:** Agent configuration file created at `agents/{agentName}.yaml`

---

### evolith-architecture-evaluate

**Purpose:** Evaluate architecture patterns against defined rulesets.

**Input Schema:**
```typescript
{
  rulesetId: string;
  dir?: string;
  format?: "text" | "json";
}
```

**Output:** Architecture evaluation report with violations and evidence.

---

### evolith-gate-status

**Purpose:** Display current SDLC phase gate validation status and DORA metrics.

**Input Schema:**
```typescript
{
  since?: number; // Days of git history (default: 90)
}
```

**Output:** Gate status (passed/failed/pending) + DORA metrics dashboard.

---

### evolith-moscow-analyze

**Purpose:** Run MoSCoW prioritization analysis on user stories.

**Input Schema:**
```typescript
{
  inputFile: string;
  outputFile?: string;
}
```

**Output:** Prioritized story list with MoSCoW categories.

---

### evolith-moscow-export

**Purpose:** Export MoSCoW analysis results to various formats.

**Input Schema:**
```typescript
{
  format: "markdown" | "json" | "csv";
  outputFile?: string;
}
```

**Output:** Formatted MoSCoW export file.

---

### evolith-sdlc-handoff

**Purpose:** Generate SDLC handoff artifacts between phases.

**Input Schema:**
```typescript
{
  fromPhase: string;
  toPhase: string;
  project?: string;
}
```

**Output:** Handoff documentation with evidence links.

---

### evolith-validate

**Purpose:** Validate project artifacts against phase-gate requirements.

**Input Schema:**
```typescript
{
  phase?: string;
  gate?: string;
  dir?: string;
  format?: "text" | "json";
}
```

**Output:** Validation report with pass/fail status per artifact.

---

### evolith-phase-advance

**Purpose:** Propose and evaluate phase transitions with evidence.

**Input Schema:**
```typescript
{
  from: string; // Source phase
  to: string;   // Target phase
  project?: string;
  core?: string;
  evaluatedBy?: string;
  initiative?: string;
  tenant?: string;
  webhookUrl?: string;
  format?: "text" | "json";
}
```

**Output:** Phase transition proposal with evidence envelope.

---

### evolith-auto-fix

**Purpose:** Automatically apply architectural fixes to violations reported by Evolith Core rule evaluators.

**Context:** When architecture validation reports violations, this tool can automatically apply known fix strategies without manual intervention.

**Input Schema:**
```typescript
{
  rulesetId?: string;  // Ruleset to fix (e.g., "domain-purity", "hexagonal-boundaries")
  violations?: Array<{
    ruleId: string;
    filePath: string;
    message: string;
  }>;
  dryRun?: boolean;    // Preview fixes without applying (default: false)
  dir?: string;        // Base directory for relative paths
}
```

**Output Schema:**
```typescript
{
  totalViolations: number;
  fixesApplied: number;
  fixesPreview: number;
  fixesFailed: number;
  manualReview: number;
  summary: string;
}
```

**Supported Fix Strategies:**

| # | Strategy | Violation Type | Action |
|---|----------|----------------|--------|
| 1 | `domain-purity` | Domain layer imports framework | Remove framework imports, replace with interface references |
| 2 | `hexagonal-boundaries` | Boundary violations | Enforce port/adapter separation, remove cross-layer imports |
| 3 | `missing-domain-interface` | Missing port interfaces | Generate interface skeleton files with TODOs |
| 4 | `layer-isolation` | Business logic in wrong layer | Extract business logic to appropriate domain layer |
| 5 | `artifact-coherence` | Deprecated artifact references | Update artifact references to match actual structure |
| 6 | `service-purity` | Side effects in domain services | Remove console.log and other side effects |
| 7 | `dependency-injection` | Static instantiation | Replace `new Service()` with constructor injection |
| 8 | `error-handling` | Missing error boundaries | Add try-catch with proper error propagation |

**Implementation Status:**

- DONE All 8 strategies implemented with preview and apply modes
- DONE Dry-run support for safe preview before applying changes
- DONE Error handling with detailed failure messages
- DONE Summary generation with counts per status

**Usage Examples:**

```bash
# Dry-run mode (preview fixes without applying)
evolith mcp call evolith-auto-fix --rulesetId domain-purity --dryRun

# Apply fixes to specific violations
evolith mcp call evolith-auto-fix --rulesetId hexagonal-boundaries

# Fix multiple violation types
evolith mcp call evolith-auto-fix --rulesetId comprehensive --dryRun

# Fix with custom directory
evolith mcp call evolith-auto-fix --rulesetId domain-purity --dir /path/to/project
```

**Safety Features:**
- `dryRun` mode allows preview before applying changes
- Summary generation shows applied/preview/failed/manual counts
- Failed fixes are reported with error messages for manual review
- Non-mutative by default (requires explicit execution)

**References:**
- Implementation: `sdk/cli/src/infrastructure/mcp/tools/auto-fix.ts`
- Tests: `sdk/cli/src/infrastructure/mcp/tools/auto-fix.spec.ts`
- E2E: `sdk/cli/test/auto-fix.e2e-spec.ts`

---

### evolith-alias

**Purpose:** Manage CLI command aliases for personalized workflows.

**Input Schema:**
```typescript
{
  action: "add" | "remove" | "list";
  alias?: string;
  command?: string;
}
```

**Output:** Alias management confirmation or list.

---

### evolith-schema

**Purpose:** Generate phase-gate validation schemas.

**Input Schema:**
```typescript
{
  phase: string;
  gate?: string;
  outputFile?: string;
}
```

**Output:** Generated schema file for phase-gate validation.

---

## Tool Design Principles

All Evolith MCP tools follow these design principles:

1. **Semantic Determinism:** Clear, explicit naming
2. **Hyper-Explicitness:** Descriptions optimized for vector search
3. **Strict Schemas:** JSON Schema with constraints
4. **High Idempotence:** Safe to retry
5. **Semantic Error Handling:** Actionable error messages

See [Tool Design Principles](./tool-design-principles.md) for details.

---

## Usage

Tools are accessed via the Evolith MCP server:

```bash
# Start MCP server
evolith-mcp

# Call a tool
evolith mcp call <tool-name> --<option> <value>
```

For interactive usage, configure your AI agent with the MCP server endpoint.

---

[Back to Index](./README.md)
