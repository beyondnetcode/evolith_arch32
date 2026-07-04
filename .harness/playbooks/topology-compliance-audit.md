# Topology Compliance Audit Playbook

> **Bilingual Navigation:** [Versión en Español](./topology-compliance-audit.es.md)

**Author:** Winston (Principal Auditor)
**Trigger:** `node .harness/playbooks/topology-compliance-audit.mjs` or manual prompt
**Scope:** Evaluate completeness of each topology Bounded Context against the
          canonical exemplar (Agentic/AI-First) and governance rules.

## Audit Checklist per Topology

### Required Artifacts (canonical — from Agentic/AI-First exemplar)

| # | Artifact | Type | Criticality |
|---|----------|------|-------------|
| 1 | `README.md` + `.es.md` | Documentation | MUST |
| 2 | `adoption.md` + `.es.md` | Documentation | MUST |
| 3 | `evidence.md` + `.es.md` | Documentation | MUST |
| 4 | `evolution.md` + `.es.md` | Documentation | MUST |
| 5 | `maturity.md` + `.es.md` | Documentation | MUST |
| 6 | `operations.md` + `.es.md` | Documentation | MUST |
| 7 | `patterns.md` + `.es.md` | Documentation | MUST |
| 8 | `resilience.md` + `.es.md` | Documentation | MUST |
| 9 | `runbooks.md` + `.es.md` | Documentation | MUST |
| 10 | `security.md` + `.es.md` | Documentation | MUST |
| 11 | `<topology>.rego` | OPA Policy | MUST |
| 12 | `<topology>.test.rego` | OPA Test | MUST |
| 13 | `<topology>.rules.json` | Ruleset | MUST |
| 14 | `<topology>.wasm` | Compiled WASM | MUST |
| 15 | `topology.manifest.json` | Manifest | MUST |
| 16 | `topology.config.schema.json` or custom schema | Config Schema | MUST |
| 17 | `fixtures/valid.*.json` | Validation fixture | MUST |
| 18 | `fixtures/invalid.*.json` | Validation fixture | MUST |
| 19 | `parity-fixtures/compliant.json` | OPA parity fixture | MUST |
| 20 | `parity-fixtures/violation.json` | OPA parity fixture | MUST |

### Cross-Cutting Requirements (not per-topology)

- [ ] Bilingual parity hook active (CI validates every `.md` has `.es.md`)
- [ ] No business data (ROI, budget, cost) in topology artifacts
- [ ] OpenAPI specs for each topology's REST surface
- [ ] MCP tool manifests for each topology
- [ ] CLI command flows for each topology
- [ ] Governance ruleset references resolve to real files

## Output Format

1. Tree of `reference/core/architecture/topologies/`
2. Per-topology compliance table with evidence paths
3. Cross-cutting ruleset status
4. Exemplar validation results (Agentic/AI-First)
5. Prioritized gap list
6. Violation log (business data, parity, broken refs)

## Constraints

- Phase 1 artifacts MUST NOT contain business data (ROI, budget, cost).
  Only authorized business-layer components: ACL of Evolith Tracker, Funnel 0.
- Every artifact MUST have EN/ES mirror pair.
- Each topology must be a complete Bounded Context.
- Three mandatory operational interfaces: CLI, MCP, Service CORE API.
