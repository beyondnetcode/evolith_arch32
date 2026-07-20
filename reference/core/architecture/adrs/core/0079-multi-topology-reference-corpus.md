# ADR-0079: Multi-Topology Reference Corpus and Topology Manifest Contract

> **Bilingual Navigation:** [Versión en Español](./0079-multi-topology-reference-corpus.es.md)

## Status

Accepted — Evolith Architecture Board, 2026-06-18.

## Date

2026-06-18

## Context and Problem

Evolith Core is evolving from a static progressive-architecture reference corpus into an executable architecture governance framework. The existing corpus already governs the progressive axis from modular monolith to distributed modules and microservices through ADRs, rulesets, CLI validation, MCP tools, and the Service CORE API.

The new strategic direction requires Evolith Core to govern additional architecture families: cloud-native serverless, event-driven systems, data mesh, edge computing, and agentic or AI-first architectures. Treating these families as a flat list of mutually exclusive stages would be wrong. A product may combine multiple topology dimensions, for example modular monolith plus event-driven integration, or microservices plus data mesh plus agentic AI.

Without a controlled topology model, the repository risks duplicating ADRs, creating parallel CLI or MCP implementations per topology, breaking root taxonomy, and losing Dual-Engine Parity between Native rules and OPA/Rego policies.

## Objective and Scope

**Objective:** define the authoritative taxonomy, manifest contract, and executable exposure model for a Multi-Topology Reference Corpus in Evolith Core.

**In scope:**

- topology classification as a dimensional model;
- canonical locations for topology documentation and executable rules;
- `topology.manifest.json` as the binding contract for each topology profile;
- preservation of F1/F2/F3 as the progressive-axis compatibility model;
- exposure through the existing CLI, MCP, and Service CORE API control plane;
- mandatory Native and OPA/Rego parity for topology validation rules.

**Out of scope:**

- implementing every topology profile in this ADR;
- defining detailed rules for serverless, event-driven, data mesh, edge computing, or agentic AI;
- changing the root repository taxonomy to allow `/topologies/`;
- adding business timing, ROI, cost, staffing, or prioritization data to Core artifacts.

## Options Considered

1. **Root-level `/topologies/` directory.** Rejected for now. It conflicts with the current lean-root and reference-corpus taxonomy unless a superseding ADR amends root policy.
2. **Flat topology folders under `reference/core/architecture/topologies/`.** Rejected. It incorrectly implies serverless, event-driven, data mesh, edge computing, and agentic AI are mutually exclusive alternatives.
3. **Separate CLI, MCP server, or Core API per topology.** Rejected. It duplicates operational surfaces and violates the unified command-as-a-service model ratified by ADR-0073 and ADR-0074.
4. **Dimensional topology corpus with manifest-driven resolution.** Selected. It preserves repository taxonomy, models combinable architecture dimensions, and lets one control plane load topology-specific context and rules.

## Decision and Rationale

Adopt a **dimensional, manifest-driven Multi-Topology Reference Corpus**.

The canonical human-readable corpus will live under:

```text
reference/core/architecture/topologies/
  progressive-axis/
  execution/
  integration/
  data/
  ai/
```

The canonical executable topology rules will live under:

```text
rulesets/topologies/
  progressive-axis/
  execution/
  integration/
  data/
  ai/
```

Each topology profile must provide a `topology.manifest.json` that declares its identifier, dimension, status, inherited Core ADRs and rulesets, topology-specific ADRs, Native rulesets, OPA/Rego policies, MCP resources, MCP tools, CLI validators, optional scaffolds, and relevant UMS contracts.

F1, F2, and F3 remain valid as the **progressive-axis compatibility model**:

```text
F1 -> modular-monolith
F2 -> distributed-modules
F3 -> microservices
```

CLI, MCP, and Service CORE API remain one operational control plane. They must resolve topology behavior through the shared Core Domain topology catalog and manifest resolver. No topology may introduce a separate CLI, separate MCP server, or separate Core API.

Topology validation rules must preserve Dual-Engine Parity: every new executable topology rule must have both Native JSON ruleset coverage and matching OPA/Rego policy coverage.

Core topology artifacts must remain technical. Evolith Tracker remains the owner of business timing, ownership, prioritization, ROI, cost, and Funnel 0 decisions.

## Evidence and Evaluation Criteria

The selected option was evaluated against:

1. **Repository taxonomy safety:** it does not create new root-level content directories.
2. **Composability:** it allows products to combine topology dimensions.
3. **Operational simplicity:** it keeps CLI, MCP, and Service CORE API unified.
4. **Machine enforceability:** it supports manifest validation, Native rules, and OPA/Rego parity.
5. **AI usability:** it exposes topology context through MCP resources, tools, and prompts.
6. **Backward compatibility:** it preserves existing F1/F2/F3 architecture validation semantics.

Evidence used:

- existing F1/F2/F3 rulesets under `src/rulesets/architecture/`;
- existing OPA architecture policy under `rulesets/opa/architecture.rego`;
- ADR-0048 and ADR-0070 root taxonomy constraints;
- ADR-0073 unified CLI/MCP output contract;
- ADR-0074 Service CORE API exposure layer;
- MCP protocol concepts of resources, tools, prompts, and server capabilities.

## Consequences, Risks, and Trade-offs

**Positive consequences:**

- Evolith Core can govern multiple modern architecture families without fragmenting the repository.
- AI agents can request topology-scoped architectural context before writing code.
- The CLI and Service CORE API can validate topology-specific rules through the same domain model.
- F1/F2/F3 remain backward compatible while becoming part of a broader topology model.

**Risks:**

- The topology manifest schema becomes a critical contract and must be versioned carefully.
- Dual-Engine Parity increases implementation work for every new topology rule.
- Existing tools that only know `--arch-level` require a compatibility mapping during migration.

**Accepted trade-off:** the initial implementation will use `reference/core/architecture/topologies/` and `src/rulesets/topologies/` instead of root `/topologies/` to preserve current repository taxonomy. A future ADR may revisit root placement only if the governance value outweighs the root-taxonomy cost.

## References

- [Model Context Protocol specification](https://modelcontextprotocol.io/)
- [Repository Taxonomy and Structuring Policy](../../../control-center/taxonomy/repository-taxonomy.md)
- [Multi-Topology Reference Corpus Implementation Plan](../../../control-center/audits/multi-topology-reference-corpus-implementation-plan.md)
- [Gap Tracking Board](../../../control-center/gaps/gap-tracking.md)

## Related Decisions and Standards

- [ADR-0041: Dual-Engine Policy Evaluation](./0041-dual-engine-policy-evaluation.md)
- [ADR-0047: Progressive Architecture Evolution Framework](./0047-architectural-patterns-monolith-soa-microservices.md)
- [ADR-0048: Enterprise Taxonomy and Reference Layout](./0048-enterprise-taxonomy-reference-layout.md)
- [ADR-0070: Lean Root Repository Taxonomy](./0070-lean-root-repository-taxonomy.md)
- [ADR-0073: Unified CLI/MCP Output Contract](./0073-unified-cli-output-contract.md)
- [ADR-0074: Evolith Core API Native Exposure Layer](./0074-evolith-core-api-exposure-layer.md)
- [ADR-0078: Domain Financial Separation Governance](./0078-domain-financial-separation-governance.md)

---
[Back to ADR Registry](../README.md)

> **Agent Signature:** Architect Agent
