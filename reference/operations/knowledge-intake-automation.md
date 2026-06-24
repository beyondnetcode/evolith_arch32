# Knowledge Intake Automation

> **Bilingual Navigation:** [Version en Español](./knowledge-intake-automation.es.md)

**Classification:** Operations and Infrastructure
**Status:** Active
**Owner:** Platform and Architecture
**Scope:** Automated pipeline for ingesting, validating, promoting, and reviewing external knowledge candidates in Evolith Core.

## Purpose

Automate the knowledge intake lifecycle from candidate ingestion through promotion to executable status. The pipeline enforces schema validation, OPA policy compliance, dual-engine parity, and structured Wilson reviews — all gated by fail-closed CI checks.

## Pipeline Overview

The knowledge intake pipeline operates through four stages:

```
┌─────────────┐    ┌──────────────┐    ┌─────────────┐    ┌──────────────┐
│  Ingest KI  │───▶│  Validate    │───▶│  Promote    │───▶│  Wilson      │
│  (PR merge) │    │  (CI gate)   │    │  (manual)   │    │  Review      │
└─────────────┘    └──────────────┘    └─────────────┘    └──────────────┘
       │                  │                   │                   │
       ▼                  ▼                   ▼                   ▼
   KI-*.yaml         Schema + OPA        State machine       Structured
   SRC-*.yaml        Parity gate         Transition           review prompt
```

## Status Transition Rules

Knowledge candidates follow a strict state machine:

| Current Status | Allowed Transitions |
|---------------|---------------------|
| `candidate` | → `evaluated`, → `retired` |
| `evaluated` | → `accepted`, → `retired` |
| `accepted` | → `executable`, → `retired` |
| `executable` | → `retired` |
| `retired` | (terminal — no transitions) |

Each transition requires specific fields:
- **Non-candidate:** `promoted_at`, `promoted_by`
- **Accepted/Executable:** non-null `adr` reference
- **Executable:** `native_rule`, `opa_policy`, `fixtures[]`
- **Retired:** non-null `disposition`

## CI Workflow

The `.github/workflows/knowledge-intake.yml` workflow triggers on PRs that modify KI or SRC files under `reference/knowledge/intake/`.

### Jobs

| Job | Purpose | Fail Behavior |
|-----|---------|---------------|
| `validate` | Runs schema + transition validation (script 17) and dual-engine parity (script 18) | Fails on any validation error |
| `opa-check` | Evaluates OPA policy tests against knowledge intake rules | Fails on any OPA violation |
| `report` | Posts validation results as a PR comment | Always runs, updates existing comment |

### Trigger Conditions

The workflow fires on PRs to `main` or `develop` branches that touch:
- `reference/knowledge/intake/KI-*.yaml`
- `reference/knowledge/intake/KI-*.yml`
- `reference/knowledge/intake/SRC-*.yaml`
- `reference/knowledge/intake/SRC-*.yml`

## Promotion Script

Promote a KI candidate to the next stage in the state machine:

```bash
node .harness/scripts/knowledge-promote.mjs <ki-file> <target-status>
```

### Example

```bash
# Promote to evaluated
node .harness/scripts/knowledge-promote.mjs reference/knowledge/intake/KI-EVANS-AGGREGATE-001.yaml evaluated

# Promote to accepted (requires ADR reference in the file)
node .harness/scripts/knowledge-promote.mjs reference/knowledge/intake/KI-EVANS-AGGREGATE-001.yaml accepted
```

The script:
1. Validates the transition is legal
2. Validates required fields for the target status
3. Updates `promotion.status`, `promotion.promoted_at`, and `promotion.promoted_by`
4. Validates the updated file against JSON Schema and OPA policy
5. Writes the updated YAML back to the file

## Wilson Review Trigger

Prepare a structured review prompt for Winston (\`@winston\`) to evaluate a knowledge candidate:

```bash
node .harness/scripts/knowledge-wilson-review.mjs <ki-file>
```

### Example

```bash
node .harness/scripts/knowledge-wilson-review.mjs reference/knowledge/intake/KI-EVANS-AGGREGATE-001.yaml
```

The script:
1. Reads the KI file and its linked source registry entry
2. Constructs a structured review prompt with all candidate metadata
3. Writes the prompt to `.harness/tmp/wilson-review-<KI-ID>.md`
4. Outputs a preview of the prompt

### CI Trigger

Wilson review can also be triggered via PR comment command:
```
/wilson-review reference/knowledge/intake/KI-EVANS-AGGREGATE-001.yaml
```

## Auto-Fix Mode

The validation script supports a `--fix` flag that auto-corrects minor issues:

```bash
node .harness/scripts/ci/17-validate-knowledge-intake.mjs --fix
```

### Auto-Correctable Issues

| Issue | Fix Applied |
|-------|-------------|
| Missing `review.review_freshness` | Set to current date |
| Missing `promotion.promoted_at` (non-candidate) | Set to current date |
| Missing `promotion.promoted_by` (non-candidate) | Set to `17-validate-knowledge-intake.mjs` |

After fixing, the script re-validates to confirm all issues are resolved.

## Adding New Knowledge Sources

1. **Create a source registry entry** (`SRC-*.yaml`):
   ```yaml
   source_registry_id: SRC-MY-SOURCE-001
   source_license: MIT
   edition_or_url: "https://example.com/resource"
   retention_mode: citation
   content_fingerprint: sha256:<hash>
   review_cadence: 12-months
   ki_links:
     - KI-MY-KNOWLEDGE-001
   ```

2. **Create a knowledge intake candidate** (`KI-*.yaml`):
   ```yaml
   knowledge_id: KI-MY-KNOWLEDGE-001
   source_registry_id: SRC-MY-SOURCE-001
   source:
     class: book
     author: "Author Name"
     work: "Work Title"
     locator: "Chapter/Page"
     retrieved_at: "2026-06-23"
     rights_status: citation-and-synthesis-only
   assessment:
     trust_level: primary
     portability: high
     topologies:
       - modular-monolith
     maturity: proven
     preconditions: []
     anti_patterns: []
     alternatives: []
     concerns: []
   promotion:
     status: candidate
     promoted_at: null
     promoted_by: null
     adr: null
     native_rule: null
     opa_policy: null
     fixtures: []
     disposition: null
   review:
     owner: '@winston'
     next_review_at: "2026-12-23"
     review_freshness: "2026-06-23"
   synthesis: >-
     A detailed synthesis of the knowledge that captures the key insights,
     applicability to Evolith Core architectures, and any caveats.
   ```

3. **Submit a PR** — the CI workflow validates automatically.

4. **Promote** once the Wilson review approves:
   ```bash
   node .harness/scripts/knowledge-promote.mjs reference/knowledge/intake/KI-MY-KNOWLEDGE-001.yaml evaluated
   ```

## Validation Gates

| Gate | Script | Purpose |
|------|--------|---------|
| Schema Validation | `17-validate-knowledge-intake.mjs` | JSON Schema compliance, transition rules, topology IDs |
| OPA Policy | `knowledge-intake.rego` | 7 rules (KI-R01 through KI-R07) |
| Dual-Engine Parity | `18-validate-knowledge-parity.mjs` | Native/OPA verdict consistency |
| Approved Projection | `approved-projection.json` | Knowledge IDs approved for RAG retrieval |

## Related Authority

- [Agentic CI and RAG Support](./agentic-ci-rag-support.md)
- [Wilson Audit Playbook](../../.harness/playbooks/wilson-audit-playbook.md)
- [Knowledge Intake Schema](../../rulesets/schema/knowledge-intake.schema.json)
- [Knowledge Intake OPA Policy](../../rulesets/opa/knowledge-intake.rego)

## Cache Invalidation for Knowledge Intake

When knowledge intake files are promoted or updated, the Redis caching layer may serve stale data. Follow this procedure to ensure cache consistency.

### When to Invalidate

| Event | Cache Key | Action |
|-------|-----------|--------|
| KI promoted to `executable` | `topology:list` | Call invalidation endpoint |
| OPA policy updated | `opa:result:*` | Wait for TTL expiry (60s) or call invalidation |
| New ruleset added | `topology:list` | Call invalidation endpoint |

### Invalidation Steps

1. **Promote the KI file** using the standard pipeline:
   ```bash
   node .harness/scripts/knowledge-promote.mjs reference/knowledge/intake/KI-*.yaml executable
   ```

2. **Invalidate the topology cache** (if topology manifests changed):
   ```bash
   curl -X POST http://localhost:3000/api/v1/architecture/cache/invalidate
   ```

3. **Verify** the cache is invalidated by checking metrics:
   ```bash
   curl -s http://localhost:3000/metrics | grep evolith_cache
   ```

### Notes

- OPA result caches use a 60-second TTL and self-invalidate without manual intervention.
- The MCP server's tool/resource discovery cache uses a 10-minute TTL and is safe to leave stale during knowledge intake operations.
- If Redis is unavailable, all caching degrades gracefully to in-memory — no manual intervention required.

---
[Back to Operations](./README.md)
