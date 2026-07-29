# Tracker Handover — GT-615, GT-616, GT-617

> **Bilingual Navigation:** [Versión en Español](./tracker-handover-gt615-gt617.es.md)

| Field | Value |
|---|---|
| **Type** | Cross-repository handover (Core board to Tracker team) |
| **Date** | 2026-07-29 |
| **Target repository** | `beyondnetcode/evolith_tracker` |
| **Covers** | GT-615 (P2, M) · GT-616 (P2, S) · GT-617 (P2, S) |
| **Status of the gaps** | `PENDING` — unchanged, and deliberately so |
| **Origin of the rows** | Evolith product diagnostic, 2026-07-26, findings 2.4, 2.5 and 2.6 |

## Provenance and verification stance

The three gap rows were registered in the Core board carrying the disclaimer *"no
verificado aquí (vive en el repositorio del Tracker)"*. That disclaimer is now
partially spent: every claim in this document was re-checked against a working
copy of the Tracker at commit `f8b68f2` (branch `feature/gt-447-fullstack-local`,
2026-07-24), read-only, with no build.

That matters in two directions. Two of the diagnostic's numeric claims survive
exactly as written, and are restated below with the command that produces them.
One of its causal claims does **not** survive: GT-616 describes the early return
in `TrackerTracing.cs` as the defect, and it is not — it is a ratified decision
with a test defending it. Acting on the row as written would delete a guard the
Tracker deliberately built. The real defects sit next to it, and they are worse.

Nothing here is marked closed. None of these can be verified from the Core
repository, and a green tick earned by a document rather than by a test is the
failure mode this board keeps finding in its own guards.

## How to use this document

Each gap gets the same five parts: the re-verified evidence with a reproduction
command, the defect stated as one falsifiable sentence, the change expressed as
named files and named symbols, the test that must go red before the change and
green after, and whatever the row got wrong or left implicit.

The acceptance signal the Core board will look for is not this document being
read. It is a merged Tracker pull request that cites the test names below. Until
then the three rows stay `PENDING`.

One trap applies to all three. `CoreEvaluationTransactionPersistenceLiveTests`
self-skips unless `EVOLITH_CORE_LIVE=1` is set, so it reports success in CI
without executing. Do not attach any proof required here to that class or to any
other environment-gated one. Every test named below must run unconditionally on
a clean checkout.

## GT-615 — `repository_revision` is written and never read

### The evidence, re-verified

The column exists and is mandatory. `core_evaluation_transactions` lives in
schema `tracker_governance`; the column is declared
`repository_revision character varying(128) NOT NULL` in
`src/apps/tracker-api/Tracker.Infrastructure/Migrations/20260705022822_InitialCreate.cs`
and mapped in
`src/apps/tracker-api/Tracker.Infrastructure/Persistence/Integration/Configurations/CoreEvaluationTransactionRecordConfiguration.cs`
(line 18).

Three production paths write rows, and all three store the verdict in the
`response_data` jsonb under the key `decision`:

| Write path | File | Line of `AddAsync` |
|---|---|---|
| `POST /core-evaluation` | `Tracker.Presentation/Endpoints/Integration/CoreEvaluationEndpoints.cs` | 48 |
| `POST /products/{id}/evaluate-architecture` | `Tracker.Presentation/Endpoints/Products/ProductEndpoints.cs` | 216 |
| Phase-gate Core sync | `Tracker.Presentation/Endpoints/Governance/PhaseGateEndpoints.cs` | 115 |

The read side is two routes and nothing else.
`Tracker.Presentation/Endpoints/Integration/CoreEvaluationTransactionEndpoints.cs`
maps `GET /core-evaluation-transactions` (whole tenant, no filter) and
`GET /core-evaluation-transactions/{id:guid}`. The port behind them,
`Tracker.Domain/Integration/CoreEvaluationTransaction/Repositories.cs`, declares
six methods: `GetByIdAsync`, `AddAsync`, `UpdateAsync`, `DeleteAsync`,
`GetByTenantAsync`, `GetByOperationIdAsync`. Not one takes a repository URL, a
revision, or a time bound. The two indexes on the table are `(tenant_id, status)`
and a unique `operation_id`; neither serves a per-repository history query.

```bash
# in evolith_tracker
grep -n "MapGet\|MapPost" src/apps/tracker-api/Tracker.Presentation/Endpoints/Integration/CoreEvaluationTransactionEndpoints.cs
grep -c "" src/apps/tracker-api/Tracker.Domain/Integration/CoreEvaluationTransaction/Repositories.cs
grep -rn "repository_revision" src/apps/tracker-api --include=*.cs | grep -v Migrations
```

### The defect, stated exactly

Every Core verdict is persisted next to the revision it was produced for, and no
API, query or projection can retrieve two verdicts for the same repository and
compare them. The substrate for drift detection is complete on the write side
and absent on the read side.

### The change

Four slices, landable independently, in this order.

1. **Capture a real revision.** Add `CommitSha` to `RepositorySnapshot`
   (`Tracker.Application/Products/Repository/IRepositorySourceReader.cs`) and to
   `RepositoryEvaluationContext`
   (`Tracker.Application/Products/Repository/IRepositoryContextBuilder.cs`),
   populate it in each `IRepositorySourceReader` implementation from the
   provider response, and pass it as `RepositoryRevision` when
   `ProductEndpoints.cs` builds the `InlineEvaluationRequest`. When the provider
   cannot resolve a SHA, record a warning and store the empty string — never a
   placeholder that looks like a revision.
2. **Add the query.** Add
   `GetByRepositoryAsync(Guid tenantId, string repositoryUrl, DateTime? sinceUtc, CancellationToken ct)`
   to `ICoreEvaluationTransactionRepository` and implement it in both
   `Tracker.Infrastructure/Persistence/Integration/PostgreSqlCoreEvaluationTransactionRepository.cs`
   and `Tracker.Infrastructure/Persistence/InMemory/InMemoryRepositories.cs`
   (class `InMemoryCoreEvaluationTransactionRepository`), ordered by
   `requested_at` ascending. Add an EF migration creating the index
   `(tenant_id, repository_url, requested_at)`.
3. **Expose it.** Extend `GET /core-evaluation-transactions` with optional
   `repositoryUrl` and `since` query parameters. The tenant continues to come
   from `ITrackerUserContext` and must never be accepted from the query string;
   the `tenant-isolation` RoboSoft robot already asserts that shape and must stay
   green.
4. **Project the drift.** Add `GET /core-evaluation-transactions/drift` taking
   the same two parameters and returning the consecutive revision pairs whose
   `response_data->>'decision'` differs, each entry carrying
   `fromRevision`, `toRevision`, `fromDecision`, `toDecision` and
   `detectedAtUtc`. Write a `DriftDetected` audit entry when a completed
   transaction's decision differs from the previous completed transaction for
   the same `(tenant_id, repository_url)`.

### The test that proves it

New file
`src/apps/tracker-api/Tracker.Tests/Presentation/Integration/CoreEvaluationDriftEndpointTests.cs`,
running against `InMemoryCoreEvaluationTransactionRepository`, with no
environment gate of any kind:

- `Drift_Endpoint_Reports_Only_The_Revision_Pair_Where_The_Decision_Changed` —
  seed three completed transactions for one `repositoryUrl` with revisions
  `r1` (PASS), `r2` (PASS), `r3` (FAIL); assert the response contains exactly one
  entry, `from = r2`, `to = r3`. Red today: the route does not exist, so the
  request is a 404.
- `Drift_Endpoint_Never_Crosses_A_Tenant_Boundary` — seed a fourth transaction
  for the same `repositoryUrl` under a second tenant and assert it is absent.
- `History_Query_Filters_By_Repository_And_Since` — assert
  `GET /core-evaluation-transactions?repositoryUrl=X&since=<t2>` returns two rows
  in ascending `requestedAt` order. Red today: the parameters are ignored, so the
  whole tenant comes back.
- `Inline_Evaluation_Persists_The_Resolved_Commit_Sha` — with a stubbed
  `IRepositoryContextBuilder` returning a known SHA, drive
  `POST /products/{id}/evaluate-architecture` and assert the persisted
  `repository_revision` equals that SHA. Red today for an independent reason,
  which is why it is listed separately: see below.

Each test asserts its own seed count before asserting the result, so a query that
silently matches nothing cannot pass.

### The precondition nobody has noticed

`CoreEvaluationOptions.RepositoryRevision` defaults to the literal string
`"HEAD"` (`Tracker.Presentation/Integration/CoreEvaluationOptions.cs`, line 46).
`ProductEndpoints.cs` builds its `InlineEvaluationRequest` without setting
`RepositoryRevision` at all, so `CoreEvaluationGateway.EvaluateInlineAsync`
(line 200) falls back to that default. Every row written by
`POST /products/{id}/evaluate-architecture` therefore stores `repository_revision = "HEAD"`.

No commit SHA exists anywhere upstream of that write: `RepositorySnapshot`
carries `Files`, `Warnings` and `ResolvedBranch`, and `RepositoryEvaluationContext`
carries the same plus provider and topology. A branch name is not a revision.

The consequence is that slices 2 to 4 above, delivered alone, would produce a
drift endpoint that compares `HEAD` against `HEAD` and reports nothing, forever,
while looking implemented. Slice 1 is not an optional refinement — it is the
condition under which the rest of the gap can be closed at all. Size GT-615 with
slice 1 included.

## GT-616 — telemetry that cannot reconstruct an incident

### The evidence, re-verified

`AddTrackerTracing`
(`src/apps/tracker-api/Tracker.Presentation/Observability/TrackerTracing.cs`,
lines 55 to 58) returns before registering anything when `Otlp:Endpoint` is blank,
and blank is the default. That much of the row is accurate.

Three further facts the row does not contain:

- The early return is **ratified**, not accidental. It is the subject of ADR
  `T-049`, it is explained at length in the file's own documentation comment, and
  it is asserted by
  `Tracker.Tests/Presentation/Observability/ObservabilityConventionTests.cs`,
  test `SinEndpointConfigurado_LasTrazasNOseRegistran` (line 69).
- The switch has no wire to any deployment.
  `product/infra/helm/evolith-tracker-api/templates/configmap.yaml` emits
  `CoreApi__*`, `AgentRuntime__*`, `Authentication__*` and `Cors__Origins__0`,
  plus a passthrough over `.Values.extraEnv`. It never emits `Otlp__Endpoint`,
  and `values.yaml` has no `otlp` block. Turning traces on in a deployed
  environment requires hand-editing `extraEnv` with a key nobody documented.
- `.env.example` (lines 40 and 41) advertises `OTEL_EXPORTER_OTLP_ENDPOINT` and
  `OTEL_SERVICE_NAME`. `TracingOptions.SectionName` is `"Otlp"`, so the bound
  environment key is `Otlp__Endpoint`. Following the documentation produces
  silence, which is indistinguishable from the intended off state.
- Not one span is ever started. `TrackerTracing.Source` is referenced exactly
  once in the entire repository, by the convention test that asserts its name.

```bash
# in evolith_tracker — both return zero production hits
grep -rn "StartActivity" src --include=*.cs
grep -rn "Otlp__" product/infra
```

### The defect, stated exactly

Even with the exporter switched on, the only spans the Tracker emits are the
ASP.NET request span and the outbound `HttpClient` span created by
auto-instrumentation. No tenant, initiative, product, gate, phase, decision or
actor is attached to anything. An incident is reconstructible as HTTP plumbing
and not as governance — which is precisely the distinction the gap row asks for
and the one the current code cannot express.

### What this handover does not ask for

Do not delete the early return, and do not flip the default to on. That would
turn `SinEndpointConfigurado_LasTrazasNOseRegistran` red, and a red test there
means the change violated `T-049`, not that the test is stale. Off by default is
the decision; unreachable and uninstrumented is the defect.

### The change

1. Add `otlp.endpoint` (default `""`) and `otlp.serviceName` to
   `product/infra/helm/evolith-tracker-api/values.yaml`, emit
   `Otlp__Endpoint` and `Otlp__ServiceName` from
   `product/infra/helm/evolith-tracker-api/templates/configmap.yaml`, and set a
   real endpoint only in `values-ci-prod.yaml`. The default stays empty, so the
   ratified behaviour is unchanged and the switch becomes reachable.
2. Resolve the name collision in `.env.example`: either rename lines 40 and 41 to
   `Otlp__Endpoint` and `Otlp__ServiceName`, or bind the `OTEL_*` names as a
   fallback inside `AddTrackerTracing`. Pick one. Two documented names for one
   switch, only one of which works, is how this defect was born.
3. Instrument the governance seams with `TrackerTracing.Source.StartActivity`,
   tagging every span from a single declared constant class so that a rename
   cannot silently orphan a dashboard. Minimum attribute set:
   `evolith.tenant_id`, `evolith.product_id`, `evolith.initiative_id`,
   `evolith.phase`, `evolith.gate`, `evolith.decision`, `evolith.actor_id`,
   `evolith.correlation_id`. Minimum seams: `CoreEvaluationGateway.EvaluateAsync`
   and `EvaluateInlineAsync`, the phase-gate submission path in
   `PhaseGateEndpoints.cs`, and the waiver decision path already exercised by the
   `exception-governance` robot.

### The test that proves it

Extend
`src/apps/tracker-api/Tracker.Tests/Presentation/Observability/ObservabilityConventionTests.cs`,
which already reads sources from disk and therefore needs no new infrastructure:

- `ElConfigMapDeclaraElEndpointOtlp` — read
  `product/infra/helm/evolith-tracker-api/templates/configmap.yaml` and assert it
  contains `Otlp__Endpoint`. Red today.
- `LaVariableDocumentadaEsLaQueElCodigoLee` — assert `.env.example` names the
  same switch the code binds, and does not name a second one it ignores. Red
  today.
- `LosTramosDeGobernanzaLlevanAtributosDeDominio` — register an
  `ActivityListener` on source `Evolith.Tracker`, drive one evaluation through
  `CoreEvaluationGateway` with a stubbed `HttpClient`, and assert at least one
  `Activity` was recorded carrying `evolith.tenant_id` and `evolith.decision`.
  Red today: zero activities are ever created.

The third is the load-bearing one; the first two only prove the switch is
reachable. `SinEndpointConfigurado_LasTrazasNOseRegistran` must remain green
throughout, and its staying green is part of the acceptance criteria.

## GT-617 — documentation contradicts the schema

### The evidence, re-verified

Every number in the row is correct. Counted today:

| Claim | Where the claim lives | Documented | Actual |
|---|---|---|---|
| Architectural decisions | `README.md` line 10, ADRs badge | 30 | 31 |
| Database schemas | `reference/specs/design/tracker-postgresql-data-design.md` | 10 | 7 |
| Database tables | same document | 33 | 45 |
| RoboSoft robots | `robosoft/README.md` lines 60 to 67 | 3 | 12 |

The five documented schemas that do not exist are `tracker_artifacts`,
`tracker_audit`, `tracker_design`, `tracker_discovery` and `tracker_integration`.
The two real schemas the design document never names are `tracker_intake` and
`tracker_geo`. The seven that exist, with their table counts, are
`tracker_governance` (21), `tracker_geo` (12), `tracker_intake` (5),
`tracker_qa` (3), `tracker_construction` (1), `tracker_metrics` (1) and
`tracker_release` (1).

The robot table is worse than a stale count: two of its three rows are marked
`_(next)_`, and both of those robots were built and are in the CI gate.

```bash
# in evolith_tracker
grep -c "^CREATE TABLE " reference/specs/design/tracker-postgresql-data-design.md
grep -oE "CREATE SCHEMA IF NOT EXISTS [a-z_]+" reference/specs/design/tracker-postgresql-data-design.md | sort -u | wc -l
grep -cE "ToTable\(" src/apps/tracker-api/Tracker.Infrastructure/Migrations/TrackerDbContextModelSnapshot.cs
ls robosoft/robots/*.robot.mjs | wc -l
grep -oE "T-0[0-9]{2}" evolith.yaml | sort -u | wc -l
```

### The defect, stated exactly

Four artifacts that a technical due diligence reads first each state a count that
the code contradicts, and every one of them is maintained by hand. Correcting the
four numbers would leave the mechanism that produced them intact, and the next
migration would reopen the gap.

### The change

Derive all four, and gate the derivation.

1. `scripts/docs/gen-schema-inventory.mjs` — parse `ToTable("t", "s")` from
   `src/apps/tracker-api/Tracker.Infrastructure/Migrations/TrackerDbContextModelSnapshot.cs`
   and write the schema and table inventory into a marked, generated block in
   both `tracker-postgresql-data-design.md` and its `.es.md`. Regenerate both in
   the same run, or the Spanish slot becomes the new stale copy.
2. `scripts/docs/gen-robot-inventory.mjs` — read the `name` and `description`
   exported by each `robosoft/robots/*.robot.mjs` and write the Robots table in
   `robosoft/README.md`. The robot contract documented in that same README
   already guarantees those two fields exist.
3. The ADRs badge — either generate the count from the `T-NNN` entries in
   `evolith.yaml`, or remove the number from the badge. Removing it is the
   cheaper honest option: a count nobody regenerates is a liability, not
   information.
4. `scripts/ci/validate-doc-inventories.mjs`, wired into
   `.github/workflows/deploy-check.yml` — regenerate into a buffer and fail when
   it differs from what is committed. It must exit non-zero when it finds zero
   schemas, zero tables or zero robots, and it must print those three
   denominators on the passing run. A drift check that scans nothing reports
   success, and that is the shape of failure this whole board exists to catch.

### The test that proves it

Either an xUnit class
`src/apps/tracker-api/Tracker.Tests/Documentation/DocInventoryParityTests.cs` or
the guard in item 4 above, with exactly one of the two owning the assertion. Two
owners means neither is trusted. Whichever is chosen must assert:

- `DesignDocSchemasMatchTheModelSnapshot` — set equality between the schema names
  in the design document and those in the model snapshot. Red today: five names
  documented that do not exist, two that exist and are not documented.
- `DesignDocTableCountMatchesTheModelSnapshot` — 33 against 45 today.
- `RobotTableMatchesTheRobotsDirectory` — count and names. 3 against 12 today,
  with two entries mislabelled as not yet built.
- `AdrBadgeMatchesTheRegistry` — 30 against 31 today, or an assertion that the
  badge carries no number if option 3 removes it.

Each assertion reads its denominator first and fails when it is zero.

## What this handover does not close

Three things, stated so that nobody mistakes this document for progress.

The gap rows stay `PENDING` in `gap-tracking.md` and `gap-tracking.es.md`, and
their acceptance checkboxes stay unchecked. Nothing in the Tracker changed, and
the Core repository cannot run a Tracker test.

The re-verification was done against one commit of one branch of a working copy.
It is stronger than the diagnostic's unverified claim and weaker than a merged
test. The reproduction commands are included so that the Tracker team can
disagree with a specific number rather than with the document.

One adjacent defect was found and is **not** part of these three gaps:
`tracker-postgresql-data-design.md` still models `Backlog`, `Epic` and
`UserStory` aggregates in the schemas it invents, and Evolith governs initiatives
only. Regenerating the inventory from the snapshot will delete those tables from
the document as a side effect, which resolves the symptom; the prose around them
will still be wrong and needs a separate row.

## Related

- [Gap Tracking Board](../gaps/gap-tracking.md) — the three rows, unchanged.
- [Opportunities Board](./README.md) — index for this document.
- [Control Center](../README.md) — governance hub.

[Back to Opportunities Board](./README.md)
