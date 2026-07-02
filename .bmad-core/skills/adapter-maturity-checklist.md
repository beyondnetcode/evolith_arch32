# Adapter Maturity Checklist

> **Owner:** @winston  
> **Version:** 1.0.0  
> **Purpose:** Standard checklist for evaluating interaction adapter readiness before marking an adapter as operational.

## Checklist Items

### Implementation (30%)

- [ ] Adapter file exists in `packages/agent-runtime/src/adapters/interaction/`
- [ ] Implements `InteractionAdapterPort<TInput>` interface
- [ ] Declares correct `sourceInterface` constant
- [ ] `toRuntimeRequest()` maps all input fields to `AgentRuntimeRequest`
- [ ] Handles edge cases (empty intent, missing context fields)
- [ ] Sets appropriate defaults (e.g., `dry_run`)

### Tests (20%)

- [ ] Spec file exists alongside implementation
- [ ] Tests cover happy path (valid input → correct request)
- [ ] Tests cover edge cases (empty input, missing fields)
- [ ] Tests verify `sourceInterface` is set correctly
- [ ] All tests pass

### Integration (15%)

- [ ] Exported from `packages/agent-runtime/src/adapters/index.ts`
- [ ] Registered in barrel with correct type export
- [ ] Can be instantiated and used in a test harness

### Manifest (15%)

- [ ] Listed in `.bmad-core/skills/manifest.json` (if adapter has governance significance)
- [ ] Referenced by at least one agent definition in `.bmad-core/agents/`
- [ ] Has a backing checklist (this document or equivalent)

### Agent Reference (10%)

- [ ] Winston's agent definition mentions the adapter's `sourceInterface`
- [ ] Architect's agent definition cross-references if applicable
- [ ] Adapter appears in relevant audit playbooks

### Documentation (10%)

- [ ] README or docstring explains the adapter's purpose
- [ ] Input interface (`TInput`) is documented
- [ ] Usage examples provided
- [ ] ES counterpart exists if user-facing

## Scoring

| Items Passed | Status |
|-------------|--------|
| All 6 categories | **Operational** |
| 5 categories | **Near-complete** |
| 3-4 categories | **Partial** |
| 1-2 categories | **Phantom** |
| 0 categories | **Missing** |

## Usage

When evaluating an adapter:

1. Run `node .bmad-core/skills/adapter-maturity-analysis.mjs` for automated scoring
2. Review this checklist manually for nuance
3. Update the adapter's status in gap tracking if maturity changes
4. If phantom: create GT-* entry to materialize the declaration
