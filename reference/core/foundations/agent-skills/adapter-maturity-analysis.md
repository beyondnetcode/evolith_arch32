# Adapter Maturity Analysis

> **Owner:** @winston  
> **Version:** 1.0.0  
> **Tags:** adapter, maturity, interaction-adapter, runtime, audit

## Purpose

Evaluates the maturity of all interaction adapters against the `InteractionAdapterPort` contract and the Agent Runtime's governance pipeline. Produces a structured report of gaps, phantom declarations, and readiness status.

## When to Use

- After any audit wave that touches agent runtime, MCP, CLI, or Hermes adapters
- When a new `InteractionAdapterPort` implementation is added
- During gap closure to verify adapter maturity claims

## Inputs

| Input | Source |
|-------|--------|
| Adapter implementations | `src/packages/agent-runtime/src/adapters/interaction/` |
| Port contract | `src/packages/agent-runtime/src/domain/ports/interaction-adapter.port.ts` |
| Agent definitions | `.bmad-core/agents/*.md` |
| Skill manifest | `.bmad-core/skills/manifest.json` |

## Outputs

| Output | Format |
|--------|--------|
| Adapter maturity report | JSON with per-adapter readiness score |
| Phantom declarations list | List of declared-but-not-implemented capabilities |
| Gap recommendations | GT-* candidates for unimplemented adapters |

## Evaluation Criteria

Each adapter is scored on:

| Criterion | Weight | Description |
|-----------|--------|-------------|
| Implementation exists | 30% | File exists in `adapters/interaction/` |
| Tests exist | 20% | Spec file with passing tests |
| Exported from barrel | 15% | Listed in `adapters/index.ts` |
| Registered in manifest | 15% | Skill/checklist entry exists in `.bmad-core/skills/manifest.json` |
| Agent definition references | 10% | Agent persona mentions the adapter |
| Documentation exists | 10% | README or checklist backing the declaration |

## Scoring

| Score | Status |
|-------|--------|
| 100% | **Operational** — fully implemented and tested |
| 75-99% | **Near-complete** — minor gaps in docs or manifest |
| 50-74% | **Partial** — implementation exists but missing tests/docs |
| 25-49% | **Phantom** — declared but not materialized |
| 0-24% | **Missing** — no trace of implementation |

## Execution

```bash
# Full analysis
node .bmad-core/skills/adapter-maturity-analysis.mjs

# JSON output only
node .bmad-core/skills/adapter-maturity-analysis.mjs --json

# Check specific adapter
node .bmad-core/skills/adapter-maturity-analysis.mjs --adapter mcp
```
