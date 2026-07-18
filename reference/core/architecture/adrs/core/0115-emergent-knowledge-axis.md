# ADR-0115: Emergent Knowledge Axis — Knowledge Originated by Applying the Standard

> Bilingual navigation: [Español](./0115-emergent-knowledge-axis.es.md)

## Status

Proposed

## Date

2026-07-18

## Context and Problem

[ADR-0097](./0097-knowledge-lifecycle-governance.md) established a governed lifecycle for knowledge — `candidate → evaluated → accepted → executable`, custodied by `@winston`, with promotion gated on Architecture Board decisions and enforced by `knowledge-intake.rego` (KI-R01..R07). That machinery is sound and already validates real records.

It has one origin: **external sources**. The `knowledge-intake.schema.json` is titled *External Knowledge Intake Candidate*, its `source.class` enum is `book | public-article | official-docs`, and every candidate must point at a `SRC-*` registry entry carrying licensing and retention terms. The pipeline answers "we read something external and want to adopt it".

It has no answer for the opposite direction: knowledge that **emerges from applying the standard**. When a satellite repository violates a rule in an instructive way, when two teams read the same rule differently, when a review concludes something worth preserving, or when the same question is asked repeatedly, that knowledge has no intake path. It survives, if at all, as prose in a pull request.

This is not hypothetical. Concrete evidence in this repository today:

- No shipped interface can capture such a finding (CLI 31 commands, MCP 47 tools, Core API ~25 endpoints, agent-runtime 7 skills — none is an intake).
- `approved_knowledge_ids` is empty: nothing has ever been promoted into retrieval.
- The `ground` step in the governed chain queries `IKnowledgePort` on every run and discards the outcome — the single richest signal of a knowledge gap is computed and thrown away.

The cost of leaving this unaddressed is that Evolith can detect a violation but cannot accumulate understanding of it. The same incident is re-analysed in each repository that hits it.

## Objective and Scope

Give knowledge that originates **inside** the ecosystem the same governed path that external knowledge already has, without duplicating the governance that ADR-0097 established.

**In scope:** a second origin (`KO-*`) on the existing lifecycle; the evidence and traceability an emergent finding must carry; the rules governing what may and may not be captured; and the boundary between what an agent may do and what requires a human.

**Out of scope:** the detection heuristics themselves (which signals, thresholds, and confidence scoring — those evolve and must not be frozen in an ADR); the retrieval infrastructure (ADR-0090 / ADR-0112); and the user-facing proposal intake, which is a distinct concern tracked by [UP-003](../../../control-center/opportunities/UP-003-user-contribution-intake-mechanism.md) and its reserved ADR-0114.

## Options Considered

**Option A — A separate Knowledge Base with its own lifecycle.** A parallel store, schema, states and review flow dedicated to emergent knowledge.
*Rejected.* It would duplicate a governance model that is already accepted, already has OPA enforcement, and already names a custodian. Two lifecycles would drift, and the drift would be silent: nothing would reconcile a `KB-*` entry against a `KI-*` one covering the same ground. This repository has repeatedly paid for duplicated sources of truth.

**Option B — Reuse `KI-*` unchanged, treating an internal finding as a "source".** Model the originating repository as a `SRC-*` entry.
*Rejected.* It corrupts the meaning of the fields. `source.rights_status` and the licensing terms of a `SRC-*` entry exist to govern third-party material; a finding in our own repository has no rights holder, no retrieval date, and no citation constraints. Reviewers would lose the ability to tell adopted external theory from observed internal practice — a distinction that matters when deciding how much authority a claim carries.

**Option C — A second origin on the same lifecycle.** Introduce `KO-*` (Knowledge Opportunity) sharing the states, custodian, promotion gates and OPA rules of `KI-*`, differing only in the block that describes where the knowledge came from.
*Adopted.* See below.

**Option D — Let agents write knowledge directly, with human review after publication.** Optimises for volume.
*Rejected.* It inverts the burden of proof. Published knowledge carries institutional authority; retracting it is far more costly than never publishing it. It also contradicts ADR-0097's promotion gates and the non-binding contract that governs every Core recommendation.

## Decision and Rationale

We adopt **Option C**: a second origin on the lifecycle ADR-0097 already governs.

A `KO-*` record is structurally a `KI-*` record in which the `source` block — which describes an external work — is replaced by an `origin` block describing the observation:

| `KI-*` (external) | `KO-*` (emergent) |
|---|---|
| `source.class: book \| public-article \| official-docs` | `origin.class: violation \| interpretation \| exception \| review-decision \| recurrence \| incident` |
| `source.author` / `work` / `locator` | `origin.repository` / `component` / `commit` / `pull_request` |
| `source.rights_status` | `origin.sensitivity` |
| `source_registry_id → SRC-*` | `origin.evidence_ref → Evidence.provenance.artifactHash` |

Everything else is unchanged and deliberately so: the same `candidate → evaluated → accepted → executable` states, the same `@winston` custodian, the same `promotion` block, and the same Board decision gates. Critically, **KI-R03 already encodes the Knowledge → Rule → Automation path** — `executable` requires an ADR, a native rule, an OPA policy and passing fixtures. Emergent knowledge inherits that gate rather than inventing one.

Rationale, in order of weight:

1. **One lifecycle cannot drift from itself.** The failure mode this repository keeps encountering is duplicated authority going stale. A second origin shares the single set of promotion rules by construction.
2. **The governance already exists and is enforced.** `knowledge-intake.rego` carries seven rules; reusing them means emergent knowledge is governed on day one rather than after a second policy is written and kept in parity.
3. **Provenance is already modelled.** `Evidence.provenance` ([ADR-0111](./0111-quality-signal-provider-port.md)) records `collectedBy`, `adapterVersion`, `artifactHash` and `timestamp` — exactly the traceability an emergent finding requires. Referencing it avoids a parallel evidence model.
4. **The advisory boundary has a precedent to inherit.** `DecisionRecommendation` is `binding: false` by contract ([ADR-0101](./0101-core-stateless-evaluation-engine.md)). An agent proposing knowledge inherits that shape rather than acquiring a new authority.

### Authority boundary

An agent MAY detect, analyse, search for existing knowledge, assess duplication, propose an action, and draft a `KO-*` at `candidate`. An agent MUST NOT advance a record beyond `candidate`, author or modify an accepted entry, or convert an inference into a rule. Promotion authority remains exactly as ADR-0097 assigned it: `@winston` for `evaluated`, the Architecture Board for `accepted` and `executable`.

A drafted record MUST separate **confirmed facts** (what the evidence shows) from **agent interpretation** (what the agent concludes) and **pending verification**. An inference presented as an established decision is a governance defect, not a formatting one.

### Exclusions

A `KO-*` MUST NOT be created for a finding that is purely syntactic, has no architectural impact, is already fully covered by existing knowledge, or rests on opinion without evidence. It MUST NOT contain credentials, secrets, personal data, or client-identifying information; `origin.sensitivity` governs what may be published, and material that cannot be generalised without exposing a client does not belong in shared knowledge.

## Evidence and Evaluation Criteria

Options were judged on: whether they preserve a single source of governance; whether they reuse enforcement that already exists; whether they keep the agent's authority bounded; and whether they can be validated by the guards already in the repository.

Supporting evidence from the current codebase:

- `src/rulesets/schema/knowledge-intake.schema.json` — the structure being extended; `review.owner` is a schema `const` of `@winston`.
- `src/rulesets/opa/knowledge-intake.rego` — KI-R01..R07, 9 passing tests; KI-R03 is the automation gate this decision inherits.
- `src/packages/core-domain/src/evaluation/contracts/quality-evidence.ts` — the `Evidence` and `Provenance` models referenced by `origin.evidence_ref`.
- `.harness/scripts/ci/17-validate-knowledge-intake.mjs` / `18-validate-knowledge-parity.mjs` — the dual-engine validation an emergent record must also satisfy.

Prior art considered: architecture decision records as a genre solve *why a decision was made* but not *what was learned applying it*; incident postmortems capture operational learning but have no promotion path into executable policy. The gap this ADR addresses sits between the two.

## Consequences, Risks, and Trade-offs

**Positive.** Emergent knowledge becomes governable with no new lifecycle. The Knowledge → Rule → Automation path becomes reachable from real practice rather than only from adopted theory. Satellites can originate cases without owning knowledge, and reference a stable identifier instead of copying prose.

**Negative / accepted trade-offs.** The intake surface widens, so review load grows — mitigated by requiring evidence and by ranking reuse above creation. A shared schema means an `origin`-specific change risks touching the `source` path; this is accepted deliberately, because the alternative (two schemas) is the drift this decision exists to prevent.

**Risks.**
- *Backlog dilution* — many low-value candidates. Mitigated by the exclusion rules and by the fact that a `KO-*` at `candidate` carries no authority.
- *Premature automation* — a pattern promoted to a rule on thin evidence. Mitigated by KI-R03, which already demands fixtures and an ADR before `executable`.
- *Sensitivity leakage* — a client-specific detail reaching shared knowledge. Mitigated by `origin.sensitivity` as a required field, but this is a residual risk that review must actively police; no schema can fully detect it.

## References

- [ADR-0097 — Knowledge Lifecycle Governance Standard](./0097-knowledge-lifecycle-governance.md)
- [ADR-0090 — RAG Knowledge Governance Standard](./0090-rag-knowledge-governance.md)
- [ADR-0101 — Core as Stateless Evaluation Engine](./0101-core-stateless-evaluation-engine.md)
- [ADR-0111 — Quality Signal Provider Port](./0111-quality-signal-provider-port.md)
- [ADR-0112 — RAG Embedding and Vector-Store Platform](./0112-rag-embedding-and-vector-store-platform.md)
- `src/rulesets/schema/knowledge-intake.schema.json` · `src/rulesets/opa/knowledge-intake.rego`

## Related Decisions and Standards

- **Extends** ADR-0097: same states, same custodian, same promotion gates; adds an origin.
- **Constrained by** ADR-0101: the Core evaluates and recommends; it does not decide.
- **Consumes** ADR-0111's `Evidence`/`Provenance` as the evidence carrier for `origin.evidence_ref`.
- **Feeds** ADR-0090 / ADR-0112: approved knowledge reaches retrieval through the existing projection allow-list.
- **Distinct from** [UP-003](../../../control-center/opportunities/UP-003-user-contribution-intake-mechanism.md) and its reserved ADR-0114: that governs proposals raised by *users through an interface*; this governs knowledge observed by *agents applying the standard*. They converge on the same lifecycle and must not be implemented as two systems.
