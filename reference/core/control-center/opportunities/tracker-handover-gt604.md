# Tracker Handover — GT-604

> **Bilingual Navigation:** [Versión en Español](./tracker-handover-gt604.es.md)

| Field | Value |
|---|---|
| **Type** | Cross-repository handover (Core board to Tracker team) |
| **Date** | 2026-07-29 |
| **Target repository** | `beyondnetcode/evolith_tracker` |
| **Covers** | GT-604 (P0, L) — acceptance criteria 2 and 3 |
| **Status of the gap** | `PENDING` — unchanged, and deliberately so |
| **What ships with this document** | Acceptance criterion 1, built and merged in the Core repository |
| **Contract package** | `@beyondnet/evolith-contracts` → `@beyondnet/evolith-contracts/ingest` |

## Why this document exists

GT-604 says that no surface writes evidence to the Tracker: the write path is
one-directional and points inward. Every `evolith evaluate`, every `enforce edit`
veto, every MCP `tools/call` and every CI drift-gate run produces a complete,
owner-attributed, engine-attributed verdict, and then the process exits and the
verdict is gone. The strategy is premised on accumulated evidence and the
components that generate it have nowhere to put it.

The gap has three acceptance criteria. The first — one ingest contract — was
buildable in the Core repository and is now built. The second and third are not,
and the reason is not scheduling:

- the shared client cannot be written, because there is no route to call. The
  Tracker exposes `GET /core-evaluation-transactions` and
  `GET /core-evaluation-transactions/{id}` and no Core-initiated write route. A
  client written against a route that does not exist is a mock with a network
  stack, and it would pass its own tests forever;
- the RoboSoft robot lives in your repository and cannot be authored from ours.

So this document hands over exactly two things: the endpoint the client will call
once it exists, and the test that proves it works. It also raises one sequencing
question we cannot answer from here, in the last section, and that question is
the reason to read this document before scheduling GT-603.

## How to use this document

The endpoint is specified twice, on purpose. Once in prose here, and once as
machine-readable data in the contract package
(`EVALUATION_INGEST_ENDPOINT_CONTRACT`), so that a Tracker-side test can assert
your route against the constant rather than against this document. Where the two
disagree, the constant wins and this document is the stale one.

The acceptance signal the Core board will look for is not this document being
read. It is a merged Tracker pull request that cites the test names below, and a
`core_evaluation_transactions` row written by a `POST` that the Core initiated.
Until then the row stays `PENDING`.

One trap, carried over from the previous handover and still live:
`CoreEvaluationTransactionPersistenceLiveTests` self-skips unless
`EVOLITH_CORE_LIVE=1` is set, so it reports success in CI without executing. Do
not attach any proof required here to that class or to any other
environment-gated one.

## What already exists on the Core side

### The contract

One module, published from the package you already pin:

- source: `src/packages/contracts/src/ingest/evaluation-ingest.ts`
- tests: `src/packages/contracts/src/ingest/evaluation-ingest.spec.ts`
- import path: `@beyondnet/evolith-contracts/ingest`, or the package root

It is plain data and pure functions with no imports and no I/O, the same
discipline as `evidence/evidence-edge.ts` (GT-605) and
`fixtures/evaluation-contract.fixtures.ts` (GT-573), so you can pin it at a
SemVer without pulling the Core engine in behind it.

What it publishes:

| Export | What it is |
|---|---|
| `EvaluationIngestPayload` | the request body, in full |
| `toEvaluationIngestPayload` | the producer-side mapper from `EvaluationResult` + violations |
| `resolveIngestCorrelationId` | the boundary synthesis that makes `correlationId` mandatory |
| `checkEvaluationIngestPayload` | the oracle you run on what your endpoint deserialized |
| `assertEvaluationIngestPayload` | the throwing form, for a test's arrange step |
| `EVALUATION_INGEST_ENDPOINT_CONTRACT` | the route, auth, idempotency and index, as data |
| `EVALUATION_INGEST_FIELD_SOURCES` | every wire field and the `EvaluationResult` / `Violation` path it derives from |

### The payload

Every field, and where it comes from. `EVALUATION_INGEST_FIELD_SOURCES` carries
the same table as data, and the Core suite walks every non-derived path against
objects the real `evaluateDriftGate` pipeline produced, so a rename upstream
turns the Core build red instead of silently changing your wire shape.

| Wire field | Type | Required | Derived from |
|---|---|---|---|
| `schemaVersion` | string | yes | pin of `EVALUATION_INGEST_SCHEMA_VERSION`, currently `1.0.0` |
| `correlationId` | string | **yes** | `EvaluationResult.correlationId`, synthesized when absent |
| `producer.surface` | string | yes | one of `agent-runtime` `cli` `core-api` `drift-gate` `mcp` |
| `producer.version` | string | no | the depositing surface's own version |
| `evaluatedAt` | ISO-8601 | yes | `EvaluationResult.evaluatedAt` |
| `overallVerdict` | string | yes | `EvaluationResult.overallVerdict` |
| `outcome` | string | yes | `EvaluationResult.outcome` |
| `requestedBy` | object | no | `EvaluationResult.requester` — **who asked** |
| `repositoryRevision` | object | no | `EvaluationResult.repositoryRevision` |
| `rulesExecuted[]` | array | yes | `EvaluationResult.rulesExecuted` — `ruleId`, `rulesetRef?`, `engine`, `verdict` |
| `violations[]` | array | yes | the run's canonical `Violation[]` |
| `violations[].accountableOwner` | string | no | `Violation.owner` — **who must fix it** |
| `accountableOwners` | string[] | yes | derived: distinct sorted owners |
| `blockingViolationCount` | number | yes | derived: non-frozen `error` violations |
| `versions` | object | yes | `EvaluationResult.versions` |

There is no `tenantId`, and its absence is a security property, not an omission.
See the authentication section.

### The two owners, and why they stay two

The gap's first acceptance criterion says "owner", singular. It is two, they are
different people, and the contract carries both under names that cannot be
confused:

- `requestedBy.actorId` — who asked for the evaluation. A user id, an agent id, a
  CI job id. Attribution of the **request**.
- `violations[].accountableOwner` — who must fix the finding. A CODEOWNERS entry
  resolved from the offending file. Attribution of the **defect**.

Collapse them into one field and both questions become unanswerable: "which
agent's verdicts keep failing" and "which team owns the failures" stop being
separable. When no CODEOWNERS rule matches, `accountableOwner` is absent — it is
never back-filled from the requester, because an unattributed defect recorded as
unattributed is honest and an invented one is an accusation.

`checkEvaluationIngestPayload` rejects a violation that still carries the source
field name `owner`, so a C#-side DTO that maps the wrong name fails loudly on
your side rather than writing a ledger the wrong way round.

### `correlationId` is required on the wire

`EvaluationResult.correlationId` is optional upstream, and both existing
producers already synthesize one when it is absent —
`src/sdk/cli/src/commands/evaluate/evaluate.command.ts` puts
`cli-eval-${evaluatedAt}` in its success envelope, and
`src/packages/core-domain/src/evaluation/drift-gate.ts` builds its evidence id
from `correlationId ?? evaluatedAt`. The contract makes the field mandatory on
the wire and synthesizes at the boundary, because a trail you cannot correlate is
not a trail, it is a pile of rows.

The synthesis is deterministic — no uuid, no clock — so the same verdict
deposited twice produces the same id. That is what makes the idempotency rule
below enforceable rather than decorative.

### The engine is carried verbatim

`rulesExecuted[].engine` is typed as `string`, not as an enum, and the mapper
never coerces it. `KNOWN_RULE_ENGINES` is documented as an OPEN vocabulary that
grows without a schema bump, and a mapper that quietly rewrote an unrecognised
engine to `native` would persist a row claiming a governance rule produced a
finding that a policy engine produced — a substitution no consumer could ever
detect afterwards. Tolerate unknown engines; do not validate against a closed
list on your side either.

## The endpoint you must expose

### Route and authentication

```
POST {baseUrl}/core-evaluation-transactions
```

`baseUrl` includes the `/api/v1` prefix, exactly as it does for
`/runtime-approvals`.

Authentication is the machine-key shape you already implement. The precedent is
`src/packages/agent-runtime/src/adapters/approval/tracker-approval.http-client.ts`
(lines 9 to 13, the contract comment for `POST /runtime-approvals`):

- the key travels in the `x-api-key` header, as a `CoreMachine` key;
- **the tenant is derived from WHICH key matched**, and is never sent in the
  body. Accepting a tenant from the body would let any valid key deposit evidence
  into any tenant's ledger, which is the exact hole your machine-auth handler
  exists to close;
- a body that nevertheless carries `tenantId` must be rejected, not ignored. The
  published `checkEvaluationIngestPayload` already reports it as a contract
  violation, so wiring the oracle into your handler gives you this for free.

The response is not enveloped, matching `/runtime-approvals`:
`{ transactionId, correlationId, created }`. `created` distinguishes a first
deposit from an idempotent replay so a producer can log which it got.

### Idempotency and the index it needs

A second deposit with the same `(tenant, correlationId)` updates the existing row
and returns `200`. It never creates a second row and it never returns `409`.
CI retries are normal and a retried pipeline must not double-count a verdict.

This requires a unique index on `(tenant_id, correlation_id)` in
`tracker_governance.core_evaluation_transactions`. Without it the rule is
unenforceable under concurrency, and two racing CI jobs will write two rows for
one verdict. The existing indexes on that table are `(tenant_id, status)` and a
unique `operation_id`; neither serves this.

If `correlation_id` is not yet a column, that is the first slice, and it is not
optional — it is the key the whole contract is joined on.

### Rejection rules

| Condition | Status |
|---|---|
| absent or unknown `x-api-key` | `401` |
| body fails `checkEvaluationIngestPayload` | `400`, with the oracle's `problems` in the response |
| body carries `tenantId` | `400` — never silently ignored |
| repeated `(tenant, correlationId)` | `200` over the existing row, `created: false` |

Do not add a rule that rejects an unknown `rulesExecuted[].engine`. See the
engine section: closing that vocabulary on your side reintroduces the defect the
contract removed.

## The test that proves it works

### The endpoint tests

New file
`src/apps/tracker-api/Tracker.Tests/Presentation/Integration/CoreEvaluationIngestEndpointTests.cs`,
running against `InMemoryCoreEvaluationTransactionRepository`, with no
environment gate of any kind. Each test asserts its own seed count before
asserting the result, so a query that silently matches nothing cannot pass.

- `Ingest_Persists_A_Row_With_The_Engine_Each_Rule_Actually_Ran_On` — post a
  payload whose `rulesExecuted` carries `native`, `opa` and one engine the
  Tracker has never heard of; assert all three survive into the persisted row
  verbatim. Red today: the route is a 404.
- `Ingest_Keeps_The_Requester_And_The_Accountable_Owner_Apart` — post a payload
  where `requestedBy.actorId` and every `violations[].accountableOwner` differ;
  assert both are readable from the persisted row and that no violation was
  attributed to the requester.
- `Ingest_Is_Idempotent_On_CorrelationId` — post the identical payload twice;
  assert one row, `created: true` then `created: false`, and a `200` both times.
- `Ingest_Rejects_A_Body_That_Carries_A_TenantId` — assert `400`, and assert the
  row count did not change.
- `Ingest_Never_Crosses_A_Tenant_Boundary` — post the same `correlationId` under
  two different machine keys; assert two rows, one per tenant, and that neither
  key can read the other's.
- `Ingest_Rejects_An_Unauthenticated_Post` — assert `401` and a zero-delta row
  count.

### The contract test

One test that pins the shape rather than reimplementing it: deserialize a payload
fixture into your DTO, re-serialize it, and run the published
`checkEvaluationIngestPayload` over the result. If your DTO drops
`rulesExecuted[].engine` or renames `accountableOwner` back to `owner`, this goes
red on your side at the moment the DTO changes, instead of producing a ledger of
engine-less rows that nobody notices for a quarter.

This is the same consumer-driven pattern GT-573 already established between the
two repositories, and it is the reason the contract package exports an oracle at
all rather than only types.

### The RoboSoft robot

`robosoft/robots/core-evidence-ingest.robot.mjs`, wired into the CI gate
alongside `tenant-isolation` and `exception-governance`. It must assert the whole
loop end to end and not merely the endpoint:

1. run a real `evolith evaluate` against a fixture workspace that is known to
   fail, with `--format drift`;
2. deposit the resulting payload through the endpoint with a `CoreMachine` key;
3. read the row back through `GET /core-evaluation-transactions` and assert the
   `correlationId` matches the one the CLI reported, that `rulesExecuted` is
   non-empty, and that at least one violation carries an `accountableOwner`.

Step 3's non-emptiness assertions are the load-bearing ones. A robot that asserts
only "a row exists" passes against an endpoint that persists an empty envelope,
and an empty ledger row is the failure mode this gap is about.

## A sequencing question we cannot answer from here

### What the two rows actually name

GT-604's acceptance criteria end with: *"Depends on GT-601 for the payload to be
non-empty and on GT-603 for it to be attributable."* The dependency on GT-603
appears to be wrong, and we are raising it as a question rather than correcting
it, because the Tracker schema is not in this repository and cannot be checked
from here.

The two rows name different tables:

| Row | Table it is about | What it changes |
|---|---|---|
| GT-603 | `audit_entries` | adds `actor_type`, `agent_id`, `model_id`, `session_id`; registers `IAgentExecutionPort` |
| GT-604 | `core_evaluation_transactions` | adds a Core-initiated writer |

A migration on `audit_entries` does not make a `core_evaluation_transactions` row
attributable. If the dependency is real, it is real through some path we cannot
see — a shared attribution type, a shared handler, a decision that both tables
adopt one actor model.

### What already shipped on the Core side

The Core-side half of attribution — the part GT-603's framing implies is still
missing — landed under GT-586 and is in `main` today:

- `EvaluationContext.requester` and `EvaluationContext.repositoryRevision` are
  accepted from the consumer;
- `EvaluationResult.requester` and `EvaluationResult.repositoryRevision` echo
  them back verbatim, and the Core never infers or invents either;
- `RequesterContext` carries `actorType`, `actorId`, `modelRef` and `sessionId` —
  the same four discriminators GT-603 wants on `audit_entries`;
- the pinned fixtures `EVALUATE_INLINE_ATTRIBUTED_REQUEST` and
  `EVALUATION_RESULT_ATTRIBUTION_FIXTURE` are published in
  `@beyondnet/evolith-contracts` for you to bind against.

So the ingest payload is attributable on the day the endpoint exists. `requestedBy`
is populated whenever the calling surface declares a requester, and that is a
producer-side concern in our repository, not a Tracker migration.

### The question we are asking you to answer

Three possibilities, and we cannot distinguish them from here:

1. the dependency is a transcription error and GT-604's endpoint can be scheduled
   immediately, independently of GT-603;
2. the dependency is real because you intend `core_evaluation_transactions` and
   `audit_entries` to share one actor-attribution type, and doing the ingest first
   would fork it;
3. the dependency is real because the ingest endpoint is expected to write an
   `audit_entries` row as a side effect, which would inherit GT-603's
   append-only constraint.

If the answer is 1, the two rows can proceed in parallel and GT-604 stops being
blocked. If it is 2 or 3, please say which, because it changes what the endpoint
must do and this document under-specifies it. We are not asking you to accept our
reading — we are asking which of the three it is.

The urgency is asymmetric, which is why this is not a footnote. GT-603 is on the
board as the one item that **expires** rather than accumulating cost: `audit_entries`
is append-only by database trigger, so every row written before the discriminator
column exists is permanently unattributable. If GT-604 is in fact not blocked by
it, then treating it as blocked delays the ingest path for no reason while the
expiring row waits behind a dependency that runs the other way.

## What this handover does not close

Three things, stated so that nobody mistakes this document for progress.

The gap row stays `PENDING` in `gap-tracking.md` and `gap-tracking.es.md`, and
its acceptance checkboxes stay unchecked. Criterion 1 is built and merged in the
Core repository; criteria 2 and 3 are untouched, and a gap is closed by its last
criterion, not its first.

No client was written. That was a deliberate refusal, not an omission: a client
against a nonexistent route passes its own tests indefinitely and would have to
be rewritten the day the real route landed. It is a small piece of work once the
endpoint exists, and it is tracked as the remainder of this row.

The claims about the Tracker in this document — the two existing `GET` routes,
the two existing indexes, the absence of a `correlation_id` column — are carried
over from the GT-615/616/617 re-verification against commit `f8b68f2` and were
NOT re-checked today. Treat them as the state of that commit, and correct us
where the Tracker has moved.

## Related

- [Gap Tracking Board](../gaps/gap-tracking.md) — the GT-604 row, unchanged.
- [Tracker Handover — GT-615, GT-616, GT-617](./tracker-handover-gt615-gt617.md) — the previous handover, and the source of the Tracker facts restated here.
- [Opportunities Board](./README.md) — index for this document.
- [Control Center](../README.md) — governance hub.

[Back to Opportunities Board](./README.md)
