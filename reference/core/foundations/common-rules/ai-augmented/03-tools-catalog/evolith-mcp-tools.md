# Evolith MCP Tools Catalog

This document catalogs all MCP tools provided by the Evolith CLI for AI agent automation.

## Tool Inventory

| Tool Name | Category | Purpose | Mutative |
|-----------|----------|---------|----------|
| `evolith-agent-handoff` | SDLC | Create agent configuration files | Yes |
| `evolith-architecture-evaluate` | Architecture | Evaluate architecture patterns | No |
| `evolith-gate-status` | SDLC | Get phase gate validation status | No |
| `evolith-moscow-analyze` | Planning | Run MoSCoW prioritization | No |
| `evolith-moscow-export` | Planning | Export MoSCoW results | No |
| `evolith-sdlc-handoff` | SDLC | Generate SDLC handoff artifacts | Yes |
| `evolith-validate` | Validation | Validate project artifacts | No |
| `evolith-phase-advance` | SDLC | Propose phase transition | Yes |
| `evolith-auto-fix` | Architecture | Auto-fix architectural violations | Yes |
| `evolith-alias` | Configuration | Manage CLI command aliases | Yes |
| `evolith-schema` | Validation | Generate phase-gate schemas | Yes |

---

## Tool Specifications

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
