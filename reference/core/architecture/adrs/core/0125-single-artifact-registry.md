# ADR-0125: A Single Artifact Registry, Keyed by Slug

> **Bilingual Navigation:** [Versión en Español](./0125-single-artifact-registry.es.md)

| Field | Value |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-08-02 |
| **Deciders** | Architecture Board |
| **Technical Story** | GT-650 — two unreconciled artifact vocabularies make a catalog unpublishable |

<!-- implementation-status: src/rulesets/sdlc/artifact-registry.json, src/rulesets/sdlc/artifact-registry.schema.json, src/packages/core-domain/src/application/services/gate-registry.service.ts, src/packages/core-domain/src/application/services/universal-phase-artifacts.generated.ts, src/apps/core-api/src/application/services/core-reference-query.service.ts, src/apps/core-api/src/presentation/controllers/reference.controller.ts, .harness/scripts/generate-phase-gates-rules.mjs, .harness/scripts/generate-universal-phase-artifacts.mjs, .harness/scripts/ci/59-validate-artifact-registry.mjs -->
> **Implementation status in this repository: implemented** — migration completed 2026-08-03,
> `GT-650` is `DONE`. `src/rulesets/sdlc/artifact-registry.json` is the single declaration and holds
> **33 artifacts: 24 `binding` and 9 `advisory`**. The gate files reference it by `artifactId` and
> carry neither `schemaRef` nor `producedBy`; `phase-gates.rules.json` and `UNIVERSAL_PHASE_ARTIFACTS`
> are generated from it; `GET /api/v1/phases/artifacts` publishes it.
> `57-validate-gate-corpora-parity` was **deleted with its cause and no longer exists in this
> repository**; the guard that covers the artifact registry today is
> `.harness/scripts/ci/59-validate-artifact-registry.mjs`. What is NOT discharged is named under
> **Pending gaps** below, with paths, rather than left implicit.

## Status

Accepted — 2026-08-02. Implemented — 2026-08-03.

The decision is in force and the migration that carries it is complete. `GT-650`'s acceptance
criteria are the ones written here, including the one that was easiest to skip: the losing corpus
had to be **deleted or derived**, and it was derived rather than merely checked —
`src/rulesets/sdlc/phase-gates.rules.json` is produced by
`.harness/scripts/generate-phase-gates-rules.mjs` and verified in CI with `--check`, and the parity
splint was removed with the cause it existed for. Two files that agree today drift tomorrow; that
defect is now unrepresentable rather than managed. The clauses still owing work are listed under
**Pending gaps** and are a backlog, not an unstated exception.

## Context

*The state described in this section is the state of 2026-08-02, which is what this decision was
taken against. It is no longer the state of the repository — see the implementation status above and
Pending gaps below.*

The Core answers the question *"which artifacts does phase X require?"* from **three** places, and no two of them agree.

| # | Where | Key | Vocabulary | Coverage | Consumer |
|---|---|---|---|---|---|
| A | `reference/governance/sdlc/gates/gate-f*.json` | `requiredArtifacts` | human names (`Coverage Report`) | 24 artifacts, 5 gates | the **evaluator** — `phase-gate-validator.service.ts`, `gate-registry.service.ts` |
| B | `UNIVERSAL_PHASE_ARTIFACTS` in `core-domain` | — | slugs (`coverage-report`) | 18 artifacts, 3 downstream phases | `PhaseArtifactProfileService` — advisory completeness |
| C | `src/rulesets/sdlc/phase-gates.rules.json` | `mandatoryEvidence` | human names | the same 24 as A | the **HTTP surface** satellites query |

**A and C are two hand-maintained copies of the same list, and they had already drifted.** `#378` wired schemas for four artifacts and declared three as tool output; all seven edits reached A and none reached C. For as long as that went unnoticed the Core evaluated against one answer and published another, with nothing red anywhere. `57-validate-gate-corpora-parity` stopped the copies drifting further, which was a splint, not a fix; it was deleted on 2026-08-03, once `phase-gates.rules.json` became generated and the two copies could no longer disagree by construction.

**A and B are not two spellings of one list. They answer different questions**, which is why every previous attempt to "merge" them stalled:

- A/C is **binding gate evidence**: what must be present, with prose `validation`, `rules` ids and `templateRef`, for a gate to pass.
- B is **advisory completeness**: what a downstream phase is expected to contain, unioned at runtime with the `phaseProfiles` of each confirmed topology, to produce a percentage. `PhaseArtifactProfileService` is explicitly non-binding — *"the Tracker's gate decides."*

The disagreement that makes this concrete is `Coverage Report`. Gate `f3` requires it as construction evidence (*"Business logic coverage >= 80%"*); `UNIVERSAL_PHASE_ARTIFACTS` lists `coverage-report` under `quality`. **Both are correct.** It is produced by the construction build and it is still expected to be present when QA is measured. Neither file can express that, so each stated half the truth and the two look like a contradiction.

Two further facts constrain the choice:

1. **Slugs are already the machine identity elsewhere.** Topology manifests key their `phaseProfiles` on `artifactKind` (`data-product-contract-set`, `data-ownership-map`), and `PhaseArtifactProfileService` unions those with B's entries in one `Set`. Human names appear only in A and C.
2. **A satellite is already paying for this.** `evolith_tracker` ships `StandInPhaseArtifactProfileSource`, a hand-built mirror stamped `core-standin`, because there is nothing to sync from. Its `GAP-004` is blocked on this ADR.

## Decision

### 1. One registry, and slug is the identity

A single artifact registry becomes the only place an artifact is declared. Each entry carries:

- `id` — the stable slug (`coverage-report`). **This is the identity.** It is what topology manifests, the completeness service, the schemas and the Tracker already use.
- `label` — the human name (`Coverage Report`). **Display only.** No consumer may match on it.
- `schemaId` — the canonical schema's published `$id`, or absent.
- `producedBy` — present when the artifact IS a tool's own output, in which case `schemaId` is absent. The two are mutually exclusive and their difference is meaningful: *no schema yet* and *deliberately no schema* call for opposite actions.

Human names are demoted rather than deleted because they are what a person reads in a gate report, and because deleting them would silently break the prose `validation` text that names them.

### 2. An artifact may be required by more than one phase

The registry records `phases`, a list. `coverage-report` is required at `construction` **and** expected at `quality`, which is what was always true and what no single-home model could express. This resolves the `Coverage Report` disagreement by admitting that it was never a disagreement — it was two files each able to say half of it.

An entry also distinguishes `binding` (gate evidence — its absence fails a gate) from `advisory` (counted towards completeness only). This preserves the A/B distinction that matters instead of flattening it, and keeps `PhaseArtifactProfileService` non-binding as ADR-0104 requires.

### 3. The gate files reference the registry; they no longer restate it

`gate-f*.json` keeps what is genuinely gate-specific — the prose `validation`, the `rules` ids, the `templateRef` — and refers to each artifact **by `id`**. It stops carrying `schemaRef` and `producedBy`, because those are properties of the artifact, not of the gate that happens to require it. The seven-field drift of `#378` becomes unrepresentable rather than merely detected.

**Amended by the implementation, 2026-08-03, and the amendment goes further than the clause.** `templateRef` moved to the registry as well, for the very reason this clause gives: where an artifact's authoring template lives is a property of the artifact, not of each gate that happens to require it — which is exactly how the seven-field drift became possible. The gate files today carry no `templateRef` at all (verified: zero occurrences across `gate-f1..f5.json`); the registry carries six. What stayed in the gate is what is about the gate: `validation`, `rules`, `status`, `waiverRequiredFields` and `exitCriteria`. The clause's rule is unchanged and applied more widely, not relaxed.

### 4. `phase-gates.rules.json` is generated, not maintained

It becomes a derived artifact built from the registry plus the gate files, with a `--check` mode, registered as a link in the derived-artifact chain (`GT-630`) so it is verified to be at a fixed point. Its hand-maintained twin disappears. `57-validate-gate-corpora-parity` is then redundant and is removed in the same change — a guard kept past its cause becomes noise, and noise trains people to skip red.

**Its relative `../schema/…` paths stay relative.** They resolve correctly from `src/rulesets/sdlc/`; only A's paths were ever broken. Rewriting them to match A would be a change with no cause.

### 5. `UNIVERSAL_PHASE_ARTIFACTS` derives from the registry

The hand-written constant is replaced by a projection over the registry (`advisory` and `binding` entries whose `phases` include the downstream phase). `PhaseArtifactProfileService` keeps its behaviour, including the union with topology `phaseProfiles`, which already speaks slugs and so needs no translation.

### 6. The registry is published

`GET /api/v1/phases/artifacts` (all phases) and `GET /api/v1/phases/:phase/artifacts` return the registry projection: for each artifact its `id`, `label`, `schemaId` **or** `producedBy`, and whether it is binding. A satellite can then consume rather than mirror, and `evolith_tracker` can replace its `core-standin` source with `core-sync`.

The response gives the schema's `$id` and not a repository path, following the reasoning already recorded in the Tracker's `CORE_ARTIFACT_SCHEMAS`: a path is a fact about where a file sits in one repository at one moment; the `$id` is the schema's own identity and survives the Core reorganising its tree.

### 7. What this does NOT decide

**It does not make the Core the authority over what a tenant may record.** The registry says what the *Core* requires at its own gates. Per the Tracker's `T-056`, content validation is the tenant's configuration and not engine code: a satellite may add artifacts and fields the Core has never heard of, and this registry never contradicts that. The published catalog is a reference offered to whoever fills an artifact in, not a closed list they must fit into.

## Consequences

- **[DONE 2026-08-03] Migration is mechanical for A and C, and a judgement call for B.** The 24 A/C artifacts have a one-to-one mapping to slugs, ten of which are already written down in the Tracker's `CORE_ARTIFACT_SCHEMAS` — that table is evidence the mapping is a decision someone has already made and can be reviewed, not derived. B's 18 slugs include nine that no gate requires (`source-change-set`, `architecture-drift-result`, `spec-traceability-map`, `contract-test-result`, `cfr-metric`, `defect-log`, `exception-status`, `release-plan`, `operational-sign-off`). Each must be classified `advisory` or promoted to `binding` deliberately; defaulting them either way would silently change what blocks a release.
- **[DONE 2026-08-03] Three consumers change at once**, and the migration is not safely partial: the evaluator, the completeness service and the HTTP surface all read the registry, so a half-migration reintroduces exactly the split this ADR removes. It should land as one change with the generator and the chain link.
- **[DONE 2026-08-03] The parity guard is deleted, not kept.** Its cause is gone once one file is generated from the other. `57-validate-gate-corpora-parity` no longer exists in this repository; the numbered slot `57` is now `.harness/scripts/ci/57-validate-closure-reachability.mjs`, an unrelated guard.
- **[PARTIAL] `evolith_tracker` GAP-004's Core half unblocks**, and its `StandInPhaseArtifactProfileSource` can be retired. The two UMS halves of that row are unaffected. The Core half is delivered — the registry is published — and the satellite has written `CoreSyncPhaseArtifactProfileSource`, but the stand-in is still the wired source; see Pending gaps.
- **[STILL OPEN — verified 2026-09-01] Seven artifacts have no schema and are not tool output** (`MoSCoW Prioritization Matrix`, `ADR Registry`, `Reference Blueprint Alignment`, `Simplicity Checklist Phase 1`, `Documentation Delta`, `Acceptance Validation`, `Deployment Evidence`). The registry makes that visible per entry instead of leaving it implicit, which will read as a backlog — correctly. Note in particular that `adr.schema.json` must **not** be wired to `ADR Registry`: a registry is a *list* of ADRs and not an ADR, so the mapping would validate green on paper and produce a false negative against the real artifact.

## Pending gaps

The decision is implemented; these are the parts of it that are not, each with the path that shows it.
They are recorded here so this ADR stays useful instead of decorative.

1. **A fourth corpus still declares artifacts by hand, and §1 says there should be only one.**
   `src/rulesets/schema/phase-artifact-registry.json` catalogues 36 artifact kinds — 23 `universal`
   plus topology-derived ones — each with its own `title` and `description`, and no generator writes
   it. Its 23 universal kinds are all present in the registry today, but only one direction and only
   the downstream phases are checked:
   `src/packages/core-domain/src/application/services/phase-artifacts.e2e.spec.ts:41-58` asserts that
   every `UNIVERSAL_PHASE_ARTIFACTS` kind appears there. Nothing checks the reverse, and nothing
   covers the `discovery` and `design` binding artifacts. This is the same defect class the ADR was
   opened for, one corpus later. The ADR's Context named three corpora; there are four.

2. **The guard that covers the registry has outlived the retirement condition written into it.**
   `.harness/scripts/ci/59-validate-artifact-registry.mjs:17-21` says it dies "when the gates
   reference the registry BY ID and stop carrying `schemaRef`". Both are true as of 2026-08-03, yet
   the guard runs — its body was rewritten to a narrower and still-useful subject (that every phase
   an artifact names is in the declared vocabulary, that no `advisory` artifact is required by a
   gate, and that no `binding` one is absent from every gate). Either the header or the guard is
   stale, and this ADR's own rule — a guard kept past its cause becomes noise, and noise trains
   people to skip red — makes that a decision to take rather than to leave.

3. **Seven binding artifacts still have neither a schema nor a tool-output declaration.** Verified in
   `src/rulesets/sdlc/artifact-registry.json`: `acceptance-validation`, `adr-registry`,
   `deployment-evidence`, `documentation-delta`, `moscow-prioritization-matrix`,
   `reference-blueprint-alignment`, `simplicity-checklist-phase-1`. The Consequences predicted this
   would read as a backlog. It does, and it is still open.

4. **The satellite half is unblocked but not switched.** `evolith_tracker` has written
   `src/apps/tracker-api/Tracker.Infrastructure/Governance/CoreSyncPhaseArtifactProfileSource.cs`,
   and the container still registers the mirror:
   `src/apps/tracker-api/Tracker.Application/DependencyInjection.cs:71` binds
   `IPhaseArtifactProfileSource` to `StandInPhaseArtifactProfileSource`. §6's "a satellite can then
   consume rather than mirror" is true as a capability and not yet as a wiring.

## Related ADRs

- [ADR-0104](./0104-topology-driven-advisory-design-governance.md) — topology-driven advisory design governance; `PhaseArtifactProfileService` stays non-binding under this ADR.
- [ADR-0101](./0101-core-stateless-evaluation-engine.md) — the Core is a stateless evaluation engine; the registry is corpus, not state.
- `evolith_tracker` **T-056** — three-layer separation; §7 above is bounded by it.

---
[Back to Index](./README.md)

> **Agent Signature:** Architect Agent
