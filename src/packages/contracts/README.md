# @beyondnet/evolith-contracts

The versioned **SemVer boundary** for the Evolith Core public contract (GT-513 · EAG-06).

External (non-Tracker) consumers depend on this package — not on the Core engine — to
discover, at a pinned SemVer + `sha256`, what the stateless Core can evaluate.

## What it exports

- **`MACHINE_CONTRACT_SET`** / **`CONTRACT_SET_SHA256`** — the machine-contract / schema
  set (id, version, path, per-file `sha256`) with a stable fingerprint over the schema
  list. Unlike the raw `evolith-machine-contracts.json` (which lists only
  `evolith_tracker`), this set advertises a first-class **`external`** consumer.
- **`EXPECTED_CAPABILITY_MANIFEST`** — the frozen snapshot of what
  `GET /api/v1/capabilities` returns for this contract version (name, SemVer, schema
  version, evaluation kinds, engines, surfaces, supported consumers, `sha256`).
- **`checkCapabilityManifestParity` / `assertCapabilityManifestParity`** — compare a live
  manifest against the declared snapshot and report/throw on drift.
- **Evaluate request/response fixtures** (GT-573) — `EVALUATE_INLINE_*_REQUEST` and
  `EVALUATION_RESULT_*_FIXTURE`, plus `trackerDecisionFrom` (a faithful port of the
  Tracker's `CoreEvaluationGateway.ToDecision`) and `checkTrackerEvaluationContract`.
  See [Evaluate fixtures](#evaluate-fixtures-gt-573).
- **Evidence-edge model** (GT-605, subpath `@beyondnet/evolith-contracts/evidence`) — the
  single typed evidence graph: `EvidenceEdge`, `EVIDENCE_EDGE_TYPES` with fixed direction
  semantics, the canonical `evidence://<kind>/<id>` node encoding, the shared
  depth-bounded `traverseEvidenceGraph`, and the `EVIDENCE_EDGE_STORAGE_CONTRACT` the
  Tracker's `evidence_edges` table is written against.
  See [Evidence graph](#evidence-graph-gt-605).

## Evaluate fixtures (GT-573)

Three request/response pairs, all captured from what the Core's inline
(`evaluationInput.files`) branch actually emits — not hand-written sketches:

| Fixture pair | What it exercises | `trackerDecisionFrom` |
| --- | --- | --- |
| `EVALUATE_INLINE_PASS_REQUEST` / `EVALUATION_RESULT_PASS_FIXTURE` | conformant satellite | `PASSED` |
| `EVALUATE_INLINE_FAIL_REQUEST` / `EVALUATION_RESULT_FAIL_FIXTURE` | governance rule `GOV-000`, **native** engine | `FAILED` |
| `EVALUATE_INLINE_OPA_GATE_FAIL_REQUEST` / `EVALUATION_RESULT_OPA_GATE_FAIL_FIXTURE` | an SDLC gate whose `.rego` rule fails, **opa** engine | `FAILED` |

`LEGACY_INLINE_ENVELOPE_FIXTURE` is the negative fixture: the `{ topology, gates, summary }`
envelope the inline branch used to return, which maps to `SKIPPED` over a real FAIL. That
is the incident these fixtures exist to prevent.

`checkFixtureCongruence(live, fixture)` compares a live payload against a published fixture
at the level of keys and types (never values), so the Core's own CI proves the fixtures a
consumer pins still describe what it emits. A removed or retyped field goes red; an added
field does not.

## Evidence graph (GT-605)

The Core declared typed edges that nothing persisted; the Tracker persisted a `List<string>`
that nothing typed. This package now holds the one model, including the parts a shared
*type* alone would leave ambiguous:

- `EVIDENCE_EDGE_SEMANTICS` fixes the **direction** of every edge type in a sentence.
- `formatEvidenceRef` / `parseEvidenceRef` define the canonical node string, which is what
  makes the Tracker's existing `References` column mechanically migratable —
  `edgesFromLegacyReferences` maps each entry to a typed edge or to `null` (an opaque
  external id, which is **not** an edge and must stay in `References`).
- `traverseEvidenceGraph` is the depth-bounded BFS both sides conform to, so the Tracker's
  recursive CTE can be tested against the same semantics.
- `EVIDENCE_GRAPH_QUERIES` and `EVIDENCE_EDGE_STORAGE_CONTRACT` specify the queries and the
  `evidence_edges` table/indexes. **The table itself is owned by
  `beyondnetcode/evolith_tracker` and is not built here.**

## Parity guarantee

Contract-parity tests bind this package to the live producer (`buildCapabilityManifest`,
which is exactly what the REST endpoint serves) and **fail on any drift**, so a Core
capability change cannot ship without a package + SemVer bump.

```ts
import { checkCapabilityManifestParity } from '@beyondnet/evolith-contracts';

const env = await fetch(`${base}/api/v1/capabilities`).then((r) => r.json());
const { ok, mismatches } = checkCapabilityManifestParity(env.data);
if (!ok) throw new Error(`Core drifted from contract: ${mismatches.join(', ')}`);
```

REST-only per ADR-0074 (no GraphQL).
