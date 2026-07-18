> **Bilingual Navigation:** [Ver versión en Español](./0116-canonical-finding-and-authority-boundary.es.md)

# ADR-0116: Canonical Finding Contract and an Executable Advisory-Authority Boundary

> **Agent Signature:** Architect Agent (Winston)

## Status

Accepted (2026-07-18 — implemented in `develop`)

This ADR records two decisions that are **already implemented and merged**, not
two decisions being proposed:

| Decision | Gap | Commit | Artefact |
|---|---|---|---|
| Canonical `Finding` contract | GT-558 | `30013b07` | `src/packages/core-domain/src/evaluation/contracts/finding.ts` |
| Executable advisory-authority boundary | GT-559 | `e1f4901a` | `src/packages/core-domain/src/domain/authority-policy.ts` |

The ADR number was reserved in advance for the harness-normalisation lane in
[COORDINATION.md](../../../control-center/COORDINATION.md).

## Date

2026-07-18

## Context and Problem

Two long-standing defects in the Core surfaced together while normalising the
harness, and they share a root cause: a governance principle that exists only as
prose is a principle nothing can check.

**Findings had six shapes and no contract.** Six models coexisted in
`core-domain`, each the wire shape of its own subsystem:

| Shape | Home |
|---|---|
| `EvidenceFinding` | `evaluation/contracts/quality-evidence.ts` |
| `RiskFinding` | `evaluation/contracts/evaluation-result.ts` |
| `GapFinding` | `evaluation/contracts/evaluation-result.ts` |
| `GateViolation` | `domain/gate-evidence.ts` |
| `ValidationIssue` | `application/validators/ruleset-validator.types.ts` |
| `Violation` | `domain/violation.ts` |

Their true intersection was only `message` plus *some* notion of severity, and
the notions did not agree: four distinct vocabularies were in play
(`info|low|medium|high|critical`, `low|medium|high|critical`,
`error|warning|info`, `MUST|SHOULD|COULD`). Consequently a finding could not
travel PR review to scorecard to knowledge base without being hand-translated at
each hop, and every translation lost fields. Worse, five of the six carried **no
provenance at all** and none carried **determinism** — so an LLM auditor's
opinion and a deterministic tool's measurement were structurally
indistinguishable once they left their producer. [ADR-0111](./0111-quality-signal-provider-port.md) §6
makes provenance mandatory on `Evidence`; the findings *inside* that evidence
escaped the requirement.

**The advisory boundary was prose in sixty files.** "binding: false", "advisory
only", "recommends, does not decide" — restated in roughly sixty files across
the repository. Prose cannot be pointed at in a review and cannot refuse
anything. There was no way to ask the codebase "may this actor take this action
on this artefact?" and receive an answer, so every call site re-derived the rule
from memory and the [ADR-0097](./0097-knowledge-lifecycle-governance.md)
promotion lifecycle was re-described rather than encoded.

The commercial stake is not abstract. Evolith governs other people's
architectures. A governance system whose checks self-authorize gives the teams
it governs no reason to accept a verdict they disagree with: the only answer to
"who decided this?" would be "the tool did".

## Objective and Scope

Give both principles a single executable home in `core-domain`.

**In scope:** (1) one normalized `Finding` shape with mandatory origin, plus
pure one-way mappers from all six existing shapes; (2) a severity reconciliation
that is auditable rather than lossy; (3) a typed `evaluateAuthority()` guard
answering whether a given actor may take a given action, carrying a quotable
reason, a stable rule id and the ADR clause it derives from.

**Out of scope:** replacing any of the six shapes (this work is strictly
additive); deciding *which* office may ratify, waive or enforce (that is RBAC);
and the evidence gate of KI-R03, which stays in `knowledge-intake.rego`.

## Options Considered

### Option A: Leave the six shapes as they are and keep translating ad hoc

Continue hand-mapping at each hop, and add provenance to individual shapes as
needed. *Rejected.* This is the status quo whose cost is already measured: N
translations across N hops, each independently able to drop a field, with no
place to state what a finding minimally is. Adding provenance shape-by-shape
would produce six near-identical provenance blocks that drift, which is the
duplicated-authority failure mode this repository keeps paying for.

### Option B: Replace the six shapes with a single unified model

One `Finding` type, migrate every producer and consumer, delete the six.
*Rejected.* It is a breaking change across every subsystem simultaneously, for a
benefit that a purely additive contract delivers without the blast radius. It
also destroys information deliberately: `GateViolation.severity: 'error'` *means*
"blocks the gate", and `ValidationIssue` splits title from description — meanings
that are correct in their own subsystem and would have to be either flattened
away or promoted into the canonical model as universal, which they are not.

### Option C: Keep the advisory boundary as prose and enforce it in code review

Document the rule well and rely on reviewers. *Rejected.* Sixty files already
demonstrate that documenting it well does not make it checkable. A review is the
wrong instrument for an invariant that must hold at runtime: it catches the
occurrence it happens to read, not the class. Most decisively, a prose rule
cannot produce a *refusal* — and a refusal that cites a rule id and an ADR
clause is what distinguishes governance from opinion.

### Option D: An additive canonical contract plus an executable boundary function (adopted)

A `Finding` contract that no existing shape is forced to adopt, reached by pure
one-way mappers; and an `evaluateAuthority()` function that returns a typed
decision. See below.

## Decision and Rationale

### 1. The canonical `Finding` — provenance is not optional (GT-558, `30013b07`)

`finding.ts` declares one normalized shape and six mappers. Three invariants
carry the decision:

- **`FindingOrigin` is a required argument on every mapper.** No source shape
  carries provenance or determinism, so the caller must supply both. An
  unattributed finding is therefore a *compile error*, not a runtime surprise.
- **`determinism` is required, never defaulted.** A probabilistic finding must
  never be presentable as a fact. The predicate `isFactual()` exists so callers
  do not re-derive that rule — and get it wrong — at each hop.
- **`advisory` is the literal type `true`.** Mirroring
  `DecisionRecommendation.binding: false` ([ADR-0101](./0101-core-stateless-evaluation-engine.md)),
  this makes the advisory nature unspoofable rather than conventional. There is
  no `blocking`, no `verdict`, no `outcome` on the type. A producer's own
  blocking opinion (`ValidationIssue.blocking`, `Violation.frozen`) survives in
  `attributes` as an opaque, non-authoritative annotation.

The module is **strictly additive**: it modifies none of the six, and the six
remain the wire shapes of their subsystems. Where a source cannot fill a
canonical field the mapper leaves it *absent* rather than inventing a default —
notably `id`, because synthesizing one would fabricate a stability the source
does not have.

### 2. Severity reconciles to five levels, and the projection is auditable

The canonical scale is `info | low | medium | high | critical`. It is chosen
because it is the only vocabulary in play that is a strict *superset* of
another (`RiskLevel` verbatim), so two of the six map by identity and no
producer is forced into a coarser bucket than it already used.

`error` maps to `high` and **deliberately not to `critical`**. `critical` is
reserved for producers that distinguish a top band explicitly. A three-level
producer *cannot* mean "critical" — it has no such token — and promoting it
would silently inflate severity across the hop.

Because `error|warning|info` and `MUST|SHOULD|COULD` are *dispositions* rather
than magnitudes, projecting them onto a magnitude scale is inherently
interpretive and therefore non-reversible. Every finding consequently keeps the
producer's verbatim token in `sourceSeverity`. That field is what makes the
projection auditable instead of lossy.

### 3. The advisory-authority boundary, executable (GT-559, `e1f4901a`)

`authority-policy.ts` answers one question: *may this actor take this action on
this artefact?* `evaluateAuthority()` returns an `AuthorityDecision` carrying a
`permitted` boolean, a one-sentence `reason` written to be pasted into a review
comment verbatim, a stable `rule` id (`AP-R01`..`AP-R06`) and the `citation` —
the ADR clause the rule derives from. A refusal a reviewer cannot trace back to
a decision record is just another opinion.

Assertion is unbounded on purpose: `observe`, `recommend`, `attach-evidence` and
`draft-candidate` are open to every actor, because the cost of a surplus
observation is a review while the cost of a missing one is a blind spot.
`accept`, `promote`, `ratify`, `waive` and `enforce` require named human
authority, because those acts confer institutional weight and retracting them is
expensive.

Critically, the ADR-0097 lifecycle is **encoded as data, not re-described**:
`PROMOTION_SEQUENCE` holds the ordering and `PROMOTION_AUTHORITY` maps each
stage to the actor kinds that may move a record into it (`candidate` open,
`evaluated` to custodian or Board, `accepted` and `executable` to the Board
alone). Promotion is then two questions that must not be collapsed — is the
*move* legal (AP-R04), and is this actor the one who may make it (AP-R05) — so a
reviewer can tell "wrong stage" from "wrong person".

This module is **not RBAC**. `domain/rbac` answers "does this person hold the
role a gate requires?". This answers the prior question: "is a human required
here at all?" The two compose.

### 4. AP-R03 is ordered ahead of AP-R02, deliberately

The checks are ordered so the *sharpest* refusal wins rather than the first
applicable one. An agent promoting its own finding is refused by both rules;
AP-R03 (self-authorization) runs first because "you cannot certify your own
output" is the reason a reviewer needs, whereas AP-R02 ("agents are not human")
is the reason they already assumed.

This is the defect the whole module exists to prevent. An actor that ratifies
its own inference is checked by nothing: the thing producing the claim and the
thing certifying it are the same process, so the certificate carries no
information. An engine that could promote its own finding to a rule and then
enforce that rule would be grading its own homework in a loop, and every
subsequent evaluation would inherit the original mistake as if it were a
standard.

### 5. What was deliberately NOT decided

Three omissions are choices, not gaps:

- **Human self-review is not encoded.** AP-R03 refuses self-authorization only
  for non-human actors. No existing ADR bars a Board member from accepting a
  draft they authored, so encoding such a bar here would *invent* governance
  rather than express it. If the Board wants four-eyes review of its own
  members, that is a decision for the Board to record first.
- **Which office may ratify, waive or enforce is left to RBAC.** AP-R06 settles
  that these require a human and stops there. ADR-0101 places the binding
  decision outside the Core entirely, so the office is a consumer concern.
- **KI-R03's evidence gate stays in `knowledge-intake.rego`.** The requirement
  that `executable` demands an ADR, a native rule, an OPA policy and passing
  fixtures is already enforced by policy and is not restated in TypeScript.
  Two enforcement points for one rule is the drift this ADR exists to avoid.

## Evidence and Evaluation Criteria

Both decisions were judged on whether they create a single checkable home for a
rule, whether they can be adopted without a breaking migration, and whether a
violation produces a *refusal* rather than a comment.

- `src/packages/core-domain/src/evaluation/contracts/finding.ts` — the canonical
  contract, `FINDING_SCHEMA_VERSION` at `1.0.0`; verified by
  `finding.spec.ts` (38 cases), including a compile-time assertion that the real
  `ValidationIssue` is assignable to `ValidationIssueLike`, so the structural
  mirror cannot drift silently.
- `src/packages/core-domain/src/domain/authority-policy.ts` — the boundary;
  verified by `authority-policy.spec.ts` (25 cases).
- **Layering holds.** `ValidationIssueLike` is *declared* rather than imported
  because `application/` sits above `domain/`; importing upward would invert the
  layering `eslint-plugin-boundaries` enforces.
- **Additivity is the acceptance criterion for GT-558.** No producer or consumer
  of the six shapes was modified, so the contract can be adopted hop by hop.
- **Litmus test.** If every one of the six finding shapes were replaced
  tomorrow, the decision (one canonical shape, mandatory origin, auditable
  severity projection) still stands — the six are the current inputs, not the
  subject of the decision.

## Consequences, Risks, and Trade-offs

**Positive.** A finding can now cross subsystems without hand-translation and
without losing its origin. Provenance and determinism become impossible to omit
at the boundary where they were previously lost. The advisory principle acquires
one wording, one home and a return value; a refusal now cites `AP-R0n` and an
ADR clause, which is what makes a verdict arguable on its merits rather than on
the tool's say-so.

**Negative / accepted trade-offs.** Seven shapes now exist where six did, and
that is deliberate — the canonical model is a *contract*, not a seventh wire
format, but the distinction must be actively maintained in review or it becomes
sprawl. The severity projection is one-way: callers needing a gate outcome must
keep using `deriveVerdict()` on the *original* violations, because
`findingFromGateViolation()` deliberately cannot reconstruct the blocking
meaning it drops.

**Risks.**
- *Adoption stalls.* An additive contract nothing adopts is dead weight.
  Mitigated by `findingsFromEvidence()`, the one path where origin need not be
  supplied by hand, giving adoption a cheap entry point.
- *The boundary is bypassed.* `evaluateAuthority()` refuses nothing at a call
  site that never calls it. Mitigated by `requireAuthority()` for
  fail-closed call sites, but coverage remains a residual risk no type can
  close.
- *Structural mirror drift.* Mitigated by the compile-time assignability
  assertion in the spec, which converts drift into a build failure.

## Known Follow-up

`PromotionStatus` is now declared **twice**: in
`src/packages/core-domain/src/domain/authority-policy.ts` and in
`src/packages/agent-runtime/src/application/automation-candidate.ts:25`, with
identical members. `agent-runtime` should import the type from `core-domain`;
the reverse direction is not permitted, because `core-domain` may not depend on
the agentic layer ([ADR-0102](./0102-evolith-agent-runtime.md)). Until that
import lands, the two declarations can drift silently — nothing currently
reconciles them.

## References

- `src/packages/core-domain/src/evaluation/contracts/finding.ts` ·
  `finding.spec.ts` (GT-558, commit `30013b07`)
- `src/packages/core-domain/src/domain/authority-policy.ts` ·
  `authority-policy.spec.ts` (GT-559, commit `e1f4901a`)
- `src/packages/core-domain/src/evaluation/contracts/quality-evidence.ts` — the
  `Determinism` and `Provenance` types both decisions depend on.
- `src/rulesets/opa/knowledge-intake.rego` — KI-R01..R07; KI-R03 is the
  automation gate this ADR deliberately does not restate.
- [COORDINATION.md](../../../control-center/COORDINATION.md) — the
  harness-normalisation lane that reserved GT-556..559 and this ADR number.

## Related Decisions and Standards

- [ADR-0101](./0101-core-stateless-evaluation-engine.md) — the source of the
  advisory principle. `advisory: true` mirrors `binding: false`; AP-R01, AP-R02
  and AP-R06 all cite §3.
- [ADR-0097](./0097-knowledge-lifecycle-governance.md) — the promotion lifecycle
  that `PROMOTION_SEQUENCE` and `PROMOTION_AUTHORITY` encode as data. This ADR
  **encodes** it; it does not amend it.
- [ADR-0111](./0111-quality-signal-provider-port.md) — §6's mandatory provenance,
  extended from `Evidence` down to the individual findings inside it.
- [ADR-0115](./0115-emergent-knowledge-axis.md) — its authority boundary
  ("an agent may draft a `KO-*` at `candidate`, and may not advance it") is
  precisely what `PROMOTION_AUTHORITY` and AP-R03 make executable.
- [ADR-0102](./0102-evolith-agent-runtime.md) — the dependency direction that
  makes the `PromotionStatus` follow-up one-way.
- `domain/rbac` — composes with, and is not replaced by, this boundary: it
  answers *which* human, after AP-R02 has answered *whether* a human.

---
[Back to Upper Level](./README.md)
