> **Bilingual Navigation:** [Ver versión en Español](./0111-quality-signal-provider-port.es.md)

# ADR-0111: Quality Signal Provider Port — External Evidence via Adapters

> **Agent Signature:** Architect Agent (Winston)

## Status
Proposed (2026-07-13 — Architecture Board)

## Date
2026-07-13

## Context and Problem

Evolith Core is a stateless, deterministic Evaluation Engine: it receives an
`EvaluationContext` and returns an `EvaluationResult`, governed by contracts,
rulesets and OPA ([ADR-0101](./0101-core-stateless-evaluation-engine.md)). The
suite positions itself as an *AI-era architecture governance* layer that
connects architectural decisions to technical quality, testing, performance,
documentation and execution across the SDLC.

Delivering on that positioning requires **evidence**: the criteria that the Core
derives from a design/blueprint ([ADR-0104](./0104-topology-driven-advisory-design-governance.md))
are only as strong as the signals that confirm or refute conformance at build
and runtime. A rich ecosystem of external tools already produces such signals —
runtime auditors (e.g. Lighthouse), autonomous test platforms (e.g. TestSprite),
multi-agent content/discoverability auditors (e.g. Claude SEO), and structural
code-review methodologies (e.g. the "thermo-nuclear" review rubric).

The risk is obvious and recurrent: if the Core — or each surface (CLI, Portal,
agent-runtime) — integrates these tools directly, we couple a deterministic
engine to volatile third-party technology, introduce network/side-effects into a
stateless evaluator, leak code to external clouds, and grow N×M bespoke
integrations with no normalization, no provenance and no uniform policy.

The problem: **how do external quality/evidence tools enrich Evolith Core's
evaluation without ever becoming a dependency of the Core, while letting each
tenant choose which of them are active?**

## Objective and Scope

Define the seam through which any external quality/evidence producer feeds the
Core. In scope: (1) a single driven port `IQualitySignalProvider`, (2) a
canonical `Evidence` model with mandatory provenance, (3) the rule that the Core
consumes `Evidence` **inline in its context** and never executes providers
itself, and (4) a tenant-scoped, declarative provider **registry** that selects
which adapters are active.

Out of scope: the concrete adapter implementations and their vendor-specific
choices (each is delegated to a companion Platform ADR, e.g. a Node.js ADR for
the Lighthouse adapter), and the scorecard/gate products that consume the
resulting evidence (tracked separately).

## Options Considered

### Option A: The Core calls the tools directly

Let `core-domain` invoke Lighthouse/TestSprite/etc. during evaluation. Rejected:
it breaks statelessness ([ADR-0101](./0101-core-stateless-evaluation-engine.md)),
puts network I/O and non-deterministic side-effects inside the deterministic
engine, and hard-couples the Core to specific tools.

### Option B: One bespoke integration per tool at each surface

Each surface (CLI, Portal, agent-runtime) wires each tool ad hoc. Rejected: N×M
drift, no shared normalization, inconsistent (or absent) provenance, and no way
to evaluate signals uniformly against policy. It also re-implements the
adapter/normalization work already established for the Port/Cortex and Jira
connectors.

### Option C: Single provider port + canonical Evidence ACL + tenant registry (chosen)

External producers implement one driven port and emit a normalized `Evidence`
object (an anti-corruption layer). The orchestration layer runs the *active*
providers, collects `Evidence[]`, and passes it inline to the Core. A
per-tenant registry declares which providers are active. Chosen: it keeps the
Core pure, makes every provider pluggable, tenant-selectable and disposable, and
reuses the connector-adapter pattern the suite already practices.

## Decision and Rationale

### 1. One driven port, owned by orchestration — not by the Core

`IQualitySignalProvider` lives in the orchestration/application layer
(agent-runtime and the SDLC surfaces), **not** in `core-domain`. All provider
I/O — headless Chrome, cloud calls, LLM audits — happens behind this port.

```ts
// orchestration layer (NOT core-domain)
interface IQualitySignalProvider {
  readonly id: string;                 // "lighthouse" | "testsprite" | ...
  supports(ctx: CollectionContext): boolean;
  collect(target: CollectionTarget): Promise<Evidence>;
}
```

### 2. The Core knows only the canonical `Evidence` model

`Evidence` is the sole surface the Core sees. It enters the `EvaluationContext`
**inline**, exactly as source files enter today via the repository-access /
`OverlayFileSystem` precedent ([ADR-0080](./0080-remote-repository-reference-contract.md),
[ADR-0101](./0101-core-stateless-evaluation-engine.md)). The Core is indifferent
to which tool produced a signal.

```ts
// core-domain — the ONLY thing the Core imports
interface Evidence {
  source: string;                      // opaque to the Core
  dimension: string;                   // "performance" | "a11y" | "code-quality" | "testing" | ...
  metrics: Record<string, number>;
  findings: Finding[];
  determinism: 'deterministic' | 'probabilistic';   // Lighthouse vs LLM-based
  provenance: Provenance;              // collectedBy, adapterVersion, artifactHash, timestamp
}
```

### 3. The Core never executes providers

Collection is a side-effectful orchestration concern. The Core receives
already-collected `Evidence[]` and evaluates it against derived criteria and
policy. This preserves determinism and keeps the evaluator free of network and
vendor coupling. If a dimension has no evidence, the Core reports it as
`no-evidence`, never as a failure it caused.

### 4. Providers are selected per tenant, declaratively

A tenant-scoped registry (same spirit as the skill-registry SSOT and the
`.harness` manifest, honoring multi-tenant isolation —
[ADR-0010](./0010-multi-tenancy-architecture-strategy.md),
[ADR-0106](./0106-master-tenant-context-projections.md)) declares which providers
are active and their config. Selection is opt-in and lives in configuration, not
in the Core.

```yaml
qualitySignals:
  providers:
    - { id: lighthouse,     enabled: true,  config: { categories: [performance, a11y, seo] } }
    - { id: thermo-nuclear, enabled: true }
    - { id: testsprite,     enabled: false }   # cloud/proprietary → opt-in, default off
```

### 5. Adapters live at the edge, boundary-enforced

Concrete adapters live in `@evolith/infra-providers` (alongside the Port/Cortex
and Jira connectors), lazily imported so the package builds with none installed.
`lint:boundaries` forbids any third-party or adapter import from reaching
`core-domain`. Cloud/proprietary providers (e.g. TestSprite) isolate their code
egress at the adapter boundary and default to disabled.

### 6. Provenance is mandatory and drives governance

Every `Evidence` carries provenance (`collectedBy` / `adapterVersion` /
`artifactHash` / `timestamp`) and a `determinism` flag, so signals are
auditable ([ADR-0016](./0016-immutable-business-audit-trail.md)) and policy can
weight or gate on them (e.g. treat probabilistic evidence as advisory, require
deterministic evidence for a hard gate).

## Evidence and Evaluation Criteria

- **Statelessness preserved**: the Core imports only `Evidence`; grep must show
  no provider/adapter import in `core-domain`. Same criterion applied to Hermes
  in [ADR-0102](./0102-evolith-agent-runtime.md).
- **Precedent**: inline context ingestion already works for source files via the
  repository-access model ([ADR-0080](./0080-remote-repository-reference-contract.md));
  `Evidence` follows the identical shape.
- **Reuse**: the driven-adapter pattern is proven by the Port/Cortex (GT-527) and
  Jira (GT-529) connectors; this ADR generalizes it to evidence producers.
- **Enforceability**: the domain boundary is machine-checkable via
  `lint:boundaries`.
- **Litmus test (Core-ADR)**: if Lighthouse, TestSprite, Claude SEO and the
  thermo-nuclear rubric all disappeared tomorrow, the decision (port + canonical
  Evidence + registry) still stands — they are illustrative adapters, not the
  subject of the decision.

## Consequences, Risks, and Trade-offs

Positive: the Core stays pure and deterministic; any evidence producer becomes
pluggable, tenant-selectable and disposable; provenance makes every signal
auditable and policy-evaluable; the design/runtime conformance loop
([ADR-0104](./0104-topology-driven-advisory-design-governance.md)) closes with
real evidence.

Negative / trade-offs: an extra indirection (collection → normalization →
evaluation); providers differ in determinism, so consumers must respect the
`determinism` flag rather than treating all evidence equally; probabilistic
(LLM-based) providers need a confidence/normalization discipline. Risks: adapter
or registry drift (mitigated by versioned adapters and an explicit registry) and
code egress for cloud providers (mitigated by adapter-boundary isolation and
default-off opt-in). No provider may ever be a hard dependency of the suite.

## References

- Lighthouse — runtime auditing engine (Apache-2.0), Node programmatic API with
  JSON output: <https://github.com/GoogleChrome/lighthouse> *(illustrative adapter)*
- TestSprite — autonomous AI testing; OSS CLI/MCP over a proprietary cloud
  (credit-based): <https://www.testsprite.com/> *(illustrative, opt-in adapter)*
- Claude SEO — MIT multi-agent audit skill pack (score + severity plan pattern):
  <https://github.com/AgricIDaniel/claude-seo> *(pattern reference)*
- Thermo-nuclear code-quality review — structural review rubric:
  <https://github.com/cursor/plugins/blob/main/cursor-team-kit/skills/thermo-nuclear-code-quality-review/SKILL.md>
  *(methodology reference)*

## Related Decisions and Standards

- [ADR-0101](./0101-core-stateless-evaluation-engine.md) — stateless Core
  Evaluation Engine (the contract that consumes `Evidence`).
- [ADR-0102](./0102-evolith-agent-runtime.md) — ports & adapters agentic layer;
  this ADR applies the same principle to evidence producers and reuses the
  orchestration layer that runs the providers.
- [ADR-0104](./0104-topology-driven-advisory-design-governance.md) — derives the
  criteria that this evidence confirms or refutes (the conformance loop).
- [ADR-0080](./0080-remote-repository-reference-contract.md) — inline context
  ingestion precedent (`OverlayFileSystem`).
- [ADR-0010](./0010-multi-tenancy-architecture-strategy.md),
  [ADR-0106](./0106-master-tenant-context-projections.md) — tenant isolation for
  the per-tenant provider registry.
- [ADR-0016](./0016-immutable-business-audit-trail.md) — audit/provenance
  guarantees for collected evidence.
- [core/ADR-0005](./0005-automated-sast-quality-gates.md),
  [core/ADR-0018](./0018-testing-pyramid-quality-gates.md) — quality-gate
  consumers of the evidence produced through this port.
- Companion Platform ADR (follow-on): Node.js adapter for the Lighthouse
  provider — records the concrete vendor/runtime choice per the ADR authoring
  standard.
