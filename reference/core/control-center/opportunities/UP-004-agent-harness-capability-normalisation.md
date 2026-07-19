# UP-004 — From Isolated Prompts to a Governed Agent Harness

> Bilingual navigation: [Español](./UP-004-agent-harness-capability-normalisation.es.md)

| Field | Value |
|---|---|
| **ID** | UP-004 |
| **Status** | PROPOSED |
| **Date** | 2026-07-18 |
| **Initiated by** | Harness-normalisation lane |
| **Addressed to** | Evolith Core Architecture Board |
| **Priority** | P0 (foundations) / P1 (intelligence layer) |
| **Estimated Complexity** | XL — proposed as a sequence of independently landable slices |
| **Related ADR** | ADR-0116 (reserved — canonical Finding + authority boundary) · ADR-0101 · ADR-0097 · ADR-0111 · ADR-0115 |
| **Related GTs** | GT-556 · GT-557 · GT-558 · GT-559 (all landed; this proposal generalises them) |

## Method — what grounds this analysis

This is not a survey of what an agent harness could contain. Every claim below is
either **measured in this repository** or explicitly marked as a design proposal.
Where a number appears, it was obtained by running the code, not by reading it.

That distinction matters because the central finding of this analysis is that
**this repository's checks have been systematically reporting success without
having executed**. An analysis of that problem which was itself unverified would
be an instance of the problem.

Four capabilities (GT-556…559) were implemented while producing this document.
They are treated here as evidence, not as the proposal.

---

## Part I — What actually repeated

### I.1 Six models for "something is wrong here"

| Model | Home |
|---|---|
| `EvidenceFinding` | `core-domain/src/evaluation/contracts/quality-evidence.ts` |
| `RiskFinding` | `core-domain/src/evaluation/contracts/evaluation-result.ts` |
| `GapFinding` | `core-domain/src/evaluation/contracts/evaluation-result.ts` |
| `GateViolation` | `core-domain/src/domain/gate-evidence.ts` |
| `ValidationIssue` | `core-domain/src/application/validators/ruleset-validator.types.ts` |
| `Violation` | `core-domain/src/domain/violation.ts` |

Their **true intersection is `message` plus some notion of severity**. Five of the
six carry no provenance. None carries determinism. So a finding travelling from a
PR review to a scorecard to the knowledge base is not merely re-typed at each hop
— there is nothing to preserve, because the fields a consumer would need were
never captured.

A seventh duplication (`parseFindingLocation`, independently implemented in the
SARIF exporter) was discovered **by the compiler** when the canonical contract was
wired into the barrel. Nobody had noticed it in review.

### I.2 Copies do not stay copies — they fork

`GateViolation` and `ValidationIssue` were duplicated verbatim into
`sdk-client/src/mcp/types.ts`. They have since diverged:

- `GateViolation` — the SDK widened `severity`, and **replaced the required
  `location` with an optional `artifact?`**.
- `ValidationIssue` — degraded to `severity: string`; the `MUST|SHOULD|COULD`
  constraint is gone entirely.

Neither is assignable to its domain counterpart, in either direction. This
reframes the cost of duplication: it is not untidiness, it is **silent decay**. A
copy is a fork that has not diverged *yet*.

### I.3 Sixty files re-encoding one rule

Sixty files independently restate the advisory boundary — "binding: false",
"advisory", "non-binding", "recommends but does not decide". Every author
paraphrases. There was no artefact to point at in review, and nothing that could
detect a violation.

---

## Part II — Three failure classes, each measured

### II.1 The false green — a check that believes it ran

This is the dominant defect class in the harness. **Seven confirmed instances:**

| # | Script | What it reported | What was true |
|---|---|---|---|
| 1 | `30-validate-phase-topology-disjoint` | OK, 8 topology ids | 8 from the repo root, **5 from `src/`**, exit 0 both times |
| 2 | `31-detect-duplicate-rulesets` | green | scanned an **empty corpus**; the real one holds 145 rulesets |
| 3 | `32-validate-ruleset-schemas` | green | same empty corpus |
| 4 | `12-validate-bmad-signatures` | printed its "BMAD Signatures validated" success line | `if (existsSync(adrDir))` skipped the entire loop |
| 5 | `11-validate-product-docs` | — | read the wrong `package.json`, so `pkg.version` was always `undefined` and the version-drift assertion **could never fire** |
| 6 | `33-check-adapter-freshness` | green | barrel check never fired (missing `src/` prefix) |
| 7 | `27-opa-parity-gate` | green | 26 fixtures from `/tmp`, **0 from the repo root**, exit 0 both times |

**The refinement that matters.** The obvious fix — "verify the path exists" —
is insufficient, and #2/#3 prove it. `rulesets/` **exists**; it simply contains
only `agents/`, so zero `.rules.json` matched. `existsSync` passed, the path was
live, and the answer was still fabricated.

> Confirming that a path exists does not confirm that you looked at anything.

This is why the landed guardrail asserts on **items scanned**, not on path
validity. A scan yielding zero items must fail, because zero scanned means the
check did not run — it does not mean the check passed.

### II.2 Silent scope promotion — an operation whose real scope differs from its apparent scope

This class was **not visible in the earlier analysis**. Three instances, one of
them mine:

1. **`27-opa-parity-gate`** caught an exception from `git diff` (which inherited
   the cwd) and, in the `catch`, **silently promoted itself to FULL scope**. A
   failure widened the operation instead of stopping it.
2. **The `unimar-core` plugin** enforced one organisation's architecture standard
   over every repository the user opened, because it was enabled at *user* scope
   rather than at the scope of the repos it governs. It blocked writes to a
   `.harness/` it had no authority over.
3. **This author** ran every CI script in a loop to collect exit codes, including
   `02-optimize-repo.mjs`, and **deleted five tracked files** — including the
   repo-root marker the new resolver depends on. The script was invoked without
   checking what it did.

All three share a shape: **the actual blast radius exceeded the assumed blast
radius, and nothing surfaced the difference.** #1 widened on error, #2 widened by
default, #3 widened by unchecked invocation.

A harness that governs agents must make scope explicit and narrow it on failure,
never widen it.

### II.3 Self-authorization

- A knowledge validator wrote `promoted_by:` naming **itself**.
- An agent was asked to certify proposals it had authored.
- `AP-R03` (self-authorization) is deliberately ordered **ahead** of `AP-R02`
  (actor is not human), because "you cannot certify your own output" is the
  reason a reviewer needs; "agents are not human" is the one they assumed.

---

## Part III — One reasoning pattern worth standardising

Five independent instances, three in code and two in agent behaviour, converged
on the same bias without being designed to:

| Instance | Behaviour |
|---|---|
| `KnowledgeOpportunityProvider` | emits nothing when the corpus is empty — zero citations there means "no corpus", not "no answer" |
| `resolveDuplicate` | returns `inconclusive` on empty corpus or retrieval failure; a `create` there means "we know nothing", not "this is new" |
| `assessAutomationCandidate` | "is this mechanically decidable?" outranks every count, however large |
| Subagent facing the `S-16` hook | could have bypassed it with a shell heredoc; refused, on the grounds that the guardrail exists so the governed party cannot dismiss it |
| Subagent writing `authority-policy` | refused to encode human self-review, because no ADR mandates it — flagged it as a gap needing a decision instead |

**Bias toward silence under uncertainty.** In every case it protects the same
thing: trust in the system. A check that is often wrong teaches engineers to route
around *every* check, including the correct ones. A wrong rule is worse than no
rule.

This should be an explicit, documented reasoning pattern of the Harness — the
single most transferable thing produced by this work.

---

## Part IV — Capability matrix

| Capacidad | Hoy | Problema | Normalizar como | Harness | Skill | Tool | Knowledge | Prioridad |
|---|---|---|---|---|---|---|---|---|
| Modelo de hallazgo | 6 interfaces + 2 forks en SDK | no viaja entre superficies sin perder campos | `Finding` canónico | X | | | | **P0** * |
| Resolución de rutas | hardcodeada en 17 scripts | respuesta dependiente del cwd, siempre verde | `PathResolver` fail-closed | X | | | | **P0** * |
| Cobertura de escaneo | inexistente | 0 ítems = verde | `assertScanned` | X | | | | **P0** * |
| Frontera de autoridad | prosa en 60 archivos | no auditable, no detectable | `AuthorityPolicy` | X | | | | **P0** * |
| Alcance de operación | implícito | se ensancha en error o por defecto | `ScopeContract` | X | | | | **P0** |
| Evidencia + procedencia | `Evidence` existe, sin cablear | `collect()` nunca se invoca desde la cadena | Evidence Engine | X | | | | **P1** |
| Recuperación de conocimiento | RAG + `IKnowledgePort` | sin trazabilidad de qué regla/versión se usó | Knowledge Engine | X | | | X | **P1** |
| Ensamblado de contexto | ad-hoc por agente | contexto grande, irrelevante o contradictorio | Context Engine | X | | | | **P1** |
| Detección de recurrencia | construida (KO detector) | acoplada al eje de conocimiento | `RecurrenceDetector` | | | | | **P1** |
| Dedup semántico | construido | solo se usa para KB; sirve a gaps, ADRs, propuestas | `DuplicateResolver` skill | | X | | | **P1** |
| Madurez para automatizar | construida | criterio general, uso particular | `AutomationEvaluator` | | X | | | **P1** |
| Ciclo petición→aprobación | `Waiver` + `KI/KO` separados | dos implementaciones del mismo ciclo | `GovernedRequest` | X | | | | **P1** |
| Revisión de arquitectura | prompt | no reproducible ni versionable | `ArchitectureReviewSkill` | | X | | | **P1** |
| Memoria por ámbito | dispersa | sin política de retención ni caducidad | Memory Engine | X | | | | **P2** |
| Observabilidad de agentes | ausente | no se puede auditar una ejecución | `AgentRun` trace (OTel) | X | | | | **P2** |
| Registro de capacidades | 3 registros parciales | deriva entre ellos | Capability Registry | X | | | | **P2** |
| Adapters de enforcement | 5 con forma común | ya resuelto como seam | Tools Registry | | | X | | **P2** |
| Declaración de dependencias | rota 2 veces en producción | `ora` sin usar, `pg` sin declarar | guard de release-drift | | | | | **P2** |
| Orquestación multiagente | manual | recomendaciones potencialmente contradictorias | Workflow Engine | X | | | | **P3** |

* = ya implementado (2026-07-18).

---

## Part V — Agent Intelligence Layer

```text
                    EVOLITH AGENT HARNESS
  ┌──────────────────────────────────────────────────────┐
  │  Context Engine   Knowledge Engine   Rules Engine     │
  │  Evidence Engine  Memory Engine      Policy Engine    │
  │  Capability Registry   Skills   Tools   Evaluators    │
  │  Observability Engine                                 │
  └──────────────────────────────────────────────────────┘
                            ↓
                     WINSTON AGENTS
          Reason → Detect → Explain → Recommend → Learn
```

Responsibilities, stated as **what each engine refuses to do**, because that is
where the governance lives:

| Engine | Provides | Refuses |
|---|---|---|
| **Context** | scoped, ranked, versioned context per task | to grow unboundedly; to serve contradictory sources without flagging the conflict |
| **Knowledge** | rules, ADRs, patterns, cases with citation | to answer without naming the rule, its source and its version |
| **Rules** | resolution of applicable rules by scope | to invent a rule the Board has not accepted |
| **Evidence** | normalised evidence with mandatory provenance | to emit an unattributed observation |
| **Memory** | scoped recall (session…organisational) | to become an unbounded store; every tier declares retention |
| **Policy** | `evaluateAuthority()` — may this actor do this? | to let any actor certify its own output |
| **Capability Registry** | one catalogue of skills/tools/detectors | to let a capability run undeclared |
| **Observability** | a full `AgentRun` trace | to let an execution complete unaudited |

**The load-bearing point:** these engines are mostly *not new code*. The seams
already exist — `IQualitySignalProvider`, `IKnowledgePort`,
`EvaluationOrchestrator`, `IEnforcerAdapter`, the `Evidence`/`Provenance` model
of ADR-0111. What is missing is **wiring, not design**. `Evidence.collect()` is
implemented and never invoked from the governed chain.

---

## Part VI — Standard models

### Finding (landed)

Canonical severity `info|low|medium|high|critical` — the only vocabulary that is a
strict superset of an existing one, so no producer is coarsened. Two properties
are non-negotiable and enforced by the type system:

- **`FindingOrigin` is a required argument on every mapper.** An unattributed
  finding is a compile error.
- **`determinism`** distinguishes a measurement from an inference. A probabilistic
  finding must never be presentable as a fact.
- **`advisory: true`** as a literal type, mirroring `DecisionRecommendation.binding: false`.

Interpretive projections are **non-reversible**, so the producer's verbatim token
is retained in `sourceSeverity`. That is what keeps `warning` and `SHOULD`
distinguishable after both land on `medium`.

### Evidence

Extends ADR-0111. Mandatory: `source`, `dimension`, `determinism`,
`provenance{collectedBy, adapterVersion, timestamp}`. Proposed additions:
`corpusVersion` and **`inconclusive`** — the `knowledge-dedup` lesson generalised.

> The distinction between *"I looked and found nothing"* and *"I could not look"*
> must survive to the consumer. Collapsing them is how false confidence is
> manufactured.

### Knowledge Opportunity

Already implemented per ADR-0115: recurrence → knowledge search → gap →
proposal → human review. **It should be a Harness capability available to every
agent**, not a knowledge-axis feature. Any agent that answers a question twice
without citation has found a knowledge gap.

---

## Part VII — Context Engineering

```text
Agent Task → Context Resolver → Organization → Product → Repository
           → Feature/PRD → Architecture → Applicable Rules → ADR
           → Knowledge Base → Previous Findings → Current Evidence
```

Against the four stated risks:

| Risk | Mechanism |
|---|---|
| Context too large | **selection before ranking** — resolve scope first, then rank within it. Ranking a corpus you should not have loaded is the expensive mistake. |
| Irrelevant information | scope contract per task; the resolver declares what it included **and what it excluded**. |
| Contradictory information | conflict is **surfaced, never silently resolved**. A contradiction between two accepted ADRs is a governance defect and must reach a human. |
| Stale knowledge | `corpusVersion` stamped on every retrieval; a finding cites the version it was derived from. |

Caching is versioned by `corpusVersion` + ruleset version, so a stale cache is
detectable rather than invisible. **Compression is deliberately last** — a
compressed context that dropped the decisive fact fails silently, which is the
same class as the false green.

---

## Part VIII — Memory, Observability, HITL, Versioning

**Memory tiers** — each must declare retention and invalidation, or it becomes the
uncontrolled database the request warns against:

| Tier | Lifetime | Invalidated by |
|---|---|---|
| Session | one run | run end |
| Task | one task chain | task completion |
| Repository | durable | commit that contradicts it |
| Product | durable | PRD change |
| Architecture | durable | superseding ADR |
| Organisational | durable | Board decision only |

> The corpus already has a governance mechanism (`approved_knowledge_ids`) and it
> has been **empty since June**. The bottleneck is not storage — it is that
> nothing has been promoted. Adding memory infrastructure does not fix a decision
> bottleneck.

**Observability.** One `AgentRun` trace per execution (OpenTelemetry), with spans
for context retrieval, knowledge retrieval, tool calls, analysis, evaluation and
recommendation. Each run answers: which agent, which task, what context, which
tools, which rules, what evidence, what recommendation, what cost, what latency,
what confidence.

**Human-in-the-loop — actions an agent must never take automatically:**

1. Promote knowledge beyond `candidate` (ADR-0097, ADR-0115).
2. Convert an inference into an enforced rule.
3. Grant an architectural exception or waiver.
4. Certify its own output.
5. Widen its own scope on failure.

**Versioning.** Every capability carries a semantic version; every finding cites
the capability version and corpus version that produced it. A capability whose
verdicts change must bump, so a historical finding stays interpretable.

---

## Part IX — Multi-agent workflows and conflict

```text
PR Opened → [Architecture · Security · Code Quality · SDLC] (parallel)
          → Evidence Agent → Winston Coordinator → Unified Review
```

Conflict resolution, in order:

1. **Determinism wins over inference.** A deterministic finding outranks a
   probabilistic one on the same artefact.
2. **Evidence wins over assertion.** A finding without evidence loses to one with.
3. **Unresolvable conflict escalates.** It is never averaged into a score — a
   disagreement between two agents about a rule is information, and averaging
   destroys it.

---

## Part X — What must NOT be normalised

The most important section, and the one usually missing.

**Thresholds.** ADR-0115 deliberately left them out. Recurrence=2, breadth=3,
similarity=0.9 are heuristics that must move without a governance decision.
Freezing them into the Harness makes them immovable.

**The judgement "is this worth capturing?"** This is precisely what
`assessAutomationCandidate` refuses to infer from counts. Normalising it would
manufacture certainty.

**Human self-review.** No ADR bars a Board member from accepting a draft they
authored. Four-eyes review is a real policy but a **separate** one; encoding it
would be an agent inventing governance. Recorded as an open gap requiring an ADR
line first.

**Which office may ratify, waive or enforce.** The ADRs settle that *a human* is
required, not *which one*. That belongs to RBAC, and the two compose rather than
merge.

---

## Part XI — Roadmap

### P0 — Foundations · *the Harness must be trustworthy before it is clever*

| | Status |
|---|---|
| Canonical `Finding` + mappers | **landed** (GT-558) |
| Fail-closed `PathResolver` | **landed** (GT-556) |
| Zero-coverage guardrail | **landed** (GT-557) |
| Executable authority boundary | **landed** (GT-559) |
| `ScopeContract` — explicit scope, narrows on failure | proposed |
| Retire the `sdk-client` forks onto the canonical contract | proposed |

These add no reasoning. They stop the system misreporting itself. Any
intelligence layer built on an untrustworthy floor inherits the untrustworthiness.

### P1 — Intelligence

Wire `Evidence.collect()` into the governed chain; Context Engine with scope
contracts and conflict surfacing; Knowledge Engine with mandatory citation;
promote the three components built for ADR-0115 (recurrence detector, duplicate
resolver, automation evaluator) into shared capabilities; unify `Waiver` and
`KI/KO` into one `GovernedRequest`.

### P2 — Automation

Capability Registry as single source; `AgentRun` observability; memory tiers with
declared retention; dependency-declaration guard.

### P3 — Optimisation

Workflow Engine and multi-agent conflict resolution; context compression;
cross-product knowledge federation.

---

## Answers to the key questions

| # | Question | Answer |
|---|---|---|
| 1 | What repeated? | finding models (6+2 forks+1), path resolution (17), advisory rule (60), coverage assertions (7 false greens) |
| 2 | What to normalise? | the four P0 (done) + scope contracts + evidence wiring |
| 3 | Harness Core? | Finding, PathResolver, coverage, authority, scope, evidence, context, knowledge |
| 4 | Skills? | architecture review, duplicate resolution, automation assessment, scorecard, drift detection |
| 5 | Tools? | GitHub, Git, OPA, CI/CD, OTel — already a seam via `IEnforcerAdapter` |
| 6 | Knowledge? | ADRs, patterns, anti-patterns, real cases, interpretations — via the KO axis |
| 7 | Shared by all agents? | context, evidence, authority, observability, memory |
| 8 | Winston-specific? | coordination and conflict resolution — not the primitives |
| 9 | Injected automatically? | applicable rules, relevant ADRs, previous findings on the same artefact |
| 10 | Fully automatable? | detection, evidence collection, deterministic validation |
| 11 | Requires HITL? | promotion, ratification, exceptions, rule creation |
| 12 | Never automatic? | the five listed in Part VIII |
| 13 | Findings reusable across agents? | only once they share the canonical contract — hence P0 |
| 14 | How does Evolith learn? | KO axis: recurrence → gap → proposal → human review → knowledge |
| 15 | Avoid duplication? | Capability Registry + the compiler (it found the seventh duplication) |
| 16 | Versioning? | semver per capability; findings cite capability + corpus version |
| 17 | Does a capability improve the agent? | measure findings that survive adversarial verification, not findings emitted |

---

## Closing observation

Two problems were solved on the same day: a guardrail enforcing a standard over a
repository it did not govern, and a set of guards reporting success over corpora
they never read.

They are the same defect. **In both cases the real scope of a check differed from
its apparent scope, and nothing surfaced the difference.** The plugin believed it
governed Evolith. Script 30 believed it had examined eight topologies when it had
seen five.

A Harness whose purpose is to govern agents must be, before anything else,
**honest about what it actually did**. Every capability proposed here is
downstream of that.
