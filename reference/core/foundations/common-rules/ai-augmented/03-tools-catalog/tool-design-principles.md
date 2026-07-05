# Design Principles for Intelligent Tools

## Context

An LLM does not see the code; it only sees the documentation. An exquisitely written tool with poorly described metadata results in a useless agent.

Following these 5 principles maximizes the likelihood of a successful tool-call by 90%.

---

## 1. Semantic Determinism (Clear Naming)

The tool name must be highly explicit and avoid professional jargon unrelated to the action.

### Good Examples

```typescript
// Evolith MCP Tools - Clear action-oriented names
'evolith-architecture-evaluate'  // Evaluates architecture patterns
'evolith-gate-status'            // Gets gate validation status
'evolith-moscow-analyze'         // Runs MoSCoW prioritization
'evolith-auto-fix'               // Applies automatic fixes
```

### Bad Examples

```typescript
// Vague, jargon-heavy, or ambiguous
'do_work'           // What work?
'process_data'      // What data? What processing?
'calculate_shipping_tax'  // Acceptable but could be clearer
'fetch_user_by_email'     // Good but inconsistent prefix
'evolith-thing'     // meaningless
```

### Naming Convention for Evolith MCP Tools

```typescript
// Pattern: evolith-{domain}-{action}
// domain: architecture, sdlc, planning, validation, configuration
// action: evaluate, validate, generate, export, analyze, fix

const toolNaming = {
  domain: ['architecture', 'sdlc', 'planning', 'validation', 'configuration'],
  action: ['evaluate', 'validate', 'generate', 'export', 'analyze', 'fix'],
  example: 'evolith-architecture-evaluate'
};
```

---

## 2. The Principle of Hyper-Explicitness in Descriptions

A description is not for a human, it's for a vector space search engine.

### Bad Description

```typescript
{
  name: 'evolith-gate-status',
  description: 'Gets gate status.'  // Too vague
}
```

### Good Description

```typescript
{
  name: 'evolith-gate-status',
  description: `Display current SDLC phase gate validation status and DORA metrics.
    
USE THIS TOOL WHEN:
- User asks about phase gate compliance (e.g., "Are we ready for phase 2?")
- User wants to see DORA metrics (deployment frequency, lead time, etc.)
- Validating if a project meets phase transition requirements

DO NOT USE THIS TOOL FOR:
- Architecture pattern validation (use evolith-architecture-evaluate)
- Artifact validation (use evolith-validate)
- Phase transition proposals (use evolith-phase-advance)

OUTPUT: Gate status (passed/failed/pending) + DORA metrics dashboard with:
- Deployment frequency
- Lead time for changes
- Mean time to recovery (MTTR)
- Change failure rate`
}
```

### Description Template

```typescript
interface ToolDescription {
  /** One-line summary of what the tool does */
  summary: string;
  
  /** When to use this tool (trigger conditions) */
  useWhen: string[];
  
  /** When NOT to use this tool (boundaries) */
  doNotUseFor: string[];
  
  /** Expected output format and content */
  output: string;
}
```

---

## 3. Strict Schemas (Zod / JSON Schema)

Never define an argument as a loose `string`. Use Zod and constraints whenever possible to restrict the model's "creativity."

### Vague Argument (BAD)

```typescript
// Don't do this - too permissive
interface BadSchema {
  status: string;           // Could be anything
  format: string;           // What formats are valid?
  phase: string;            // Which phases exist?
}
```

### Strict Schema (GOOD)

```typescript
import { z } from 'zod';

// Evolith MCP Tool - evolith-gate-status
const GateStatusSchema = z.object({
  since: z.number()
    .int()
    .min(1)
    .max(365)
    .default(90)
    .describe('Days of git history to analyze (1-365, default: 90)')
});

// Evolith MCP Tool - evolith-validate
const ValidateSchema = z.object({
  phase: z.enum(['discovery', 'inception', 'construction', 'transition'])
    .optional()
    .describe('SDLC phase to validate'),
  gate: z.enum(['gate-1', 'gate-2', 'gate-3', 'gate-4'])
    .optional()
    .describe('Specific gate to validate'),
  format: z.enum(['text', 'json'])
    .default('text')
    .describe('Output format'),
  dir: z.string()
    .optional()
    .describe('Base directory for validation (default: cwd)')
});

// Evolith MCP Tool - evolith-auto-fix
const AutoFixSchema = z.object({
  rulesetId: z.enum([
    'domain-purity',
    'hexagonal-boundaries',
    'layer-isolation',
    'artifact-coherence'
  ]).optional().describe('Ruleset to fix'),
  violations: z.array(z.object({
    ruleId: z.string().describe('Rule identifier (e.g., "DOMAIN-001")'),
    filePath: z.string().describe('Relative path to violating file'),
    message: z.string().describe('Violation description')
  })).optional().describe('Specific violations to fix'),
  dryRun: z.boolean()
    .default(false)
    .describe('Preview fixes without applying changes'),
  dir: z.string().optional().describe('Base directory for relative paths')
});
```

### Schema Validation Pattern

```typescript
// All Evolith MCP tools follow this pattern
async function validateAndExecute<T>(
  schema: z.ZodSchema<T>,
  rawInput: unknown,
  execute: (validated: T) => Promise<ToolResult>
): Promise<ToolResult> {
  const parseResult = schema.safeParse(rawInput);
  
  if (!parseResult.success) {
    return {
      success: false,
      error: {
        type: 'INVALID_INPUT',
        message: 'Schema validation failed',
        details: parseResult.error.errors.map(e => ({
          field: e.path.join('.'),
          expected: e.message,
          received: rawInput
        }))
      }
    };
  }
  
  return execute(parseResult.data);
}
```

---

## 4. High Idempotence (Safe to Retry)

Agents frequently enter recursive retry loops upon failure. If a tool fails halfway through, executing it again MUST NOT generate duplicate side effects.

### Idempotency Pattern

```typescript
interface IdempotentToolInput {
  /** Unique key to prevent duplicate operations */
  idempotencyKey?: string;
  
  /** Operation data */
  data: Record<string, unknown>;
}

interface IdempotentToolResult {
  success: boolean;
  idempotencyKey: string;
  wasCached: boolean;  // true if this was a duplicate request
  result?: unknown;
  error?: ToolError;
}

// Example: evolith-sdlc-handoff with idempotency
async function sdlcHandoff(
  input: IdempotentToolInput & {
    fromPhase: string;
    toPhase: string;
    project?: string;
  }
): Promise<IdempotentToolResult> {
  const key = input.idempotencyKey ?? generateKey(input);
  
  // Check if already processed
  const cached = await idempotencyStore.get(key);
  if (cached) {
    return {
      success: true,
      idempotencyKey: key,
      wasCached: true,
      result: cached
    };
  }
  
  // Execute operation
  const result = await performHandoff(input);
  
  // Store for future idempotent retries
  await idempotencyStore.set(key, result, ttl: 3600);
  
  return {
    success: true,
    idempotencyKey: key,
    wasCached: false,
    result
  };
}
```

### When Idempotency is Required

| Tool Type | Idempotency Required | Reason |
|-----------|---------------------|--------|
| Read-only queries | No | No side effects |
| File creation | Yes | Prevent duplicates |
| State transitions | Yes | Prevent double-transition |
| External API calls | Yes | Prevent duplicate charges/requests |
| Validation | No | No side effects |

### Evolith MCP Tools Idempotency Status

| Tool | Mutative | Idempotent | Notes |
|------|----------|------------|-------|
| `evolith-agent-handoff` | Yes | Yes | Checks existing agent config |
| `evolith-architecture-evaluate` | No | N/A | Read-only |
| `evolith-gate-status` | No | N/A | Read-only |
| `evolith-moscow-analyze` | No | N/A | Read-only |
| `evolith-moscow-export` | Yes | Yes | Overwrites output file |
| `evolith-sdlc-handoff` | Yes | Yes | Uses idempotency key |
| `evolith-validate` | No | N/A | Read-only |
| `evolith-phase-advance` | Yes | Yes | Checks existing proposals |
| `evolith-auto-fix` | Yes | Yes | Tracks applied fixes |
| `evolith-alias` | Yes | Yes | Updates existing aliases |
| `evolith-schema` | Yes | Yes | Overwrites schema files |

---

## 5. Semantic Error Handling

If the tool fails, return a textual explanation helping the model understand how to fix the call.

### Bad Error (Unhelpful)

```typescript
// Don't do this - agent cannot recover
{
  success: false,
  error: {
    type: 'INTERNAL_SERVER_ERROR',
    message: 'HTTP 500'
  }
}
```

### Good Error (Actionable)

```typescript
// Evolith MCP Tool - evolith-validate
{
  success: false,
  error: {
    type: 'INVALID_INPUT',
    message: 'Schema validation failed',
    details: [
      {
        field: 'phase',
        expected: 'One of: discovery, inception, construction, transition',
        received: 'development',
        suggestion: 'Did you mean "construction"? That is the implementation phase.'
      }
    ],
    retryable: true,
    retryGuidance: 'Correct the phase value to a valid SDLC phase and retry'
  }
}
```

### Error Response Schema

```typescript
interface ToolError {
  /** Error category for programmatic handling */
  type: 'INVALID_INPUT' | 'NOT_FOUND' | 'PERMISSION_DENIED' | 'CONFLICT' | 'INTERNAL_ERROR';
  
  /** Human-readable message */
  message: string;
  
  /** Detailed field-level errors */
  details?: Array<{
    field: string;
    expected: string;
    received: unknown;
    suggestion?: string;
  }>;
  
  /** Can the agent retry to fix this? */
  retryable: boolean;
  
  /** Guidance on how to fix and retry */
  retryGuidance?: string;
  
  /** Related tools that might help */
  relatedTools?: string[];
}
```

### Error Type Guidance

| Error Type | When to Use | Agent Action |
|------------|-------------|--------------|
| `INVALID_INPUT` | Schema validation failed | Fix input and retry |
| `NOT_FOUND` | Resource doesn't exist | Create resource or choose different one |
| `PERMISSION_DENIED` | Insufficient permissions | Request permission or skip |
| `CONFLICT` | Resource already exists | Use different name or update existing |
| `INTERNAL_ERROR` | Tool bug | Report and escalate |

---

## Anti-Patterns (What NOT to Do)

### 1. The Magic Black Box

```typescript
// BAD: Tool does too much, agent can't predict behavior
{
  name: 'evolith-do-everything',
  description: 'Handles all project setup',
  // No clear input/output contract
  // Multiple side effects
  // Cannot be composed with other tools
}
```

### 2. The Silent Failure

```typescript
// BAD: Returns empty result on error
async function validate(input) {
  try {
    return await doValidation(input);
  } catch (e) {
    return {};  // Agent has no idea what went wrong
  }
}
```

### 3. The Creative Schema

```typescript
// BAD: Overly permissive schema invites hallucination
{
  name: z.string(),  // Could be anything!
  config: z.any(),   // No structure at all
  options: z.array(z.string())  // What options?
}
```

### 4. The Stateful Trap

```typescript
// BAD: Tool behavior depends on hidden state
let callCount = 0;
async function tool(input) {
  callCount++;
  if (callCount === 1) return { status: 'pending' };
  if (callCount === 2) return { status: 'processing' };
  return { status: 'done' };  // Agent can't reproduce results
}
```

### 5. The Documentation Gap

```typescript
// BAD: Tool implemented but not documented
// - No description in MCP server
// - No examples in catalog
// - Agent cannot discover or use tool
```

---

## Validation Checklist

Before adding a new Evolith MCP tool, verify:

### Naming (Principle 1)
- [ ] Name follows `evolith-{domain}-{action}` pattern
- [ ] Name clearly describes the action
- [ ] Name avoids jargon and ambiguity

### Description (Principle 2)
- [ ] Description includes USE WHEN conditions
- [ ] Description includes DO NOT USE FOR boundaries
- [ ] Description specifies output format
- [ ] Description is searchable (contains keywords agents would use)

### Schema (Principle 3)
- [ ] All fields use specific types (enum, number with range, etc.)
- [ ] No loose `string` or `any` types
- [ ] All fields have descriptions
- [ ] Default values specified where appropriate
- [ ] Schema validated with Zod before execution

### Idempotence (Principle 4)
- [ ] Mutative tools accept `idempotencyKey` parameter
- [ ] Duplicate requests return cached result
- [ ] File operations check for existing resources
- [ ] State transitions verify current state

### Error Handling (Principle 5)
- [ ] Errors include field-level details
- [ ] Errors specify if retryable
- [ ] Errors provide retry guidance
- [ ] Errors suggest related tools when helpful

### Documentation
- [ ] Tool added to `evolith-mcp-tools.md` catalog
- [ ] Tool added to `evolith-mcp-tools.es.md` (Spanish)
- [ ] Input/output schemas documented
- [ ] Usage examples provided
- [ ] Added to `approved-tools.md` inventory

---

## References

- [Evolith MCP Tools Catalog](./evolith-mcp-tools.md)
- [Approved Tools Inventory](./approved-tools.md)

---

[Back to Index](./README.md)
