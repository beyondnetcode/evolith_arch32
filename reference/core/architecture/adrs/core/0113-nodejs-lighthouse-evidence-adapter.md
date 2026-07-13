> **Bilingual Navigation:** [Ver versión en Español](./0113-nodejs-lighthouse-evidence-adapter.es.md)

# ADR-0113: Node.js Platform — Lighthouse (Apache-2.0) as the Reference Evidence Adapter

> **Agent Signature:** Architect Agent (Winston)

## Status
Proposed (2026-07-13 — Architecture Board)

## Date
2026-07-13

## Context and Problem

[ADR-0111](./0111-quality-signal-provider-port.md) established the Quality Signal
Provider seam: external quality/evidence tools feed Evolith Core through a single
driven port `IQualitySignalProvider` and a canonical, provenance-stamped
`Evidence` model, and the Core never executes a provider. That ADR deliberately
left the concrete adapter implementations and their vendor/runtime choices to a
**companion Platform ADR** — this one.

To prove the seam end-to-end (GT-534) we need a first concrete provider. The
choice of that provider is a platform decision: it fixes a runtime (headless
Chrome), a language/module system (a Node.js module), and a third-party tool with
its own license. Those consequences deserve their own recorded decision rather
than being buried in an adapter file.

The problem: **which concrete tool and runtime do we adopt for the first evidence
adapter, such that it validates the port without becoming a hard dependency of the
suite, carries no license risk, and produces deterministic, normalizable output?**

## Objective and Scope

Record the concrete vendor/runtime choice for the first adapter behind
`IQualitySignalProvider`. In scope: the tool (Lighthouse), its license
(Apache-2.0), the runtime it implies (Node.js + headless Chrome), the module
boundary that keeps it optional, and the normalization contract it must honor.
Out of scope: the port/registry design (owned by ADR-0111) and future adapters
(TestSprite, structural-review rubric, GEO scorecards — each gets its own record
if it introduces a new platform commitment).

## Options Considered

### Option A: Lighthouse as an embedded Node module (chosen)

Run Google Lighthouse via its programmatic Node API against a deployed URL,
consume its JSON result (LHR), and map it to canonical `Evidence`. Chosen:
Lighthouse is **Apache-2.0** (permissive, no copyleft, no commercial gate), a
mature and widely trusted auditor, ships an embeddable Node module with pure JSON
output, and is **deterministic** — the strongest fit for the seam's
`determinism: 'deterministic'` class and the lowest-risk way to prove the port.

### Option B: Drive Lighthouse via its CLI / a hosted PageSpeed Insights API

Shell out to the `lighthouse` CLI, or call the hosted PageSpeed Insights API.
Rejected: the CLI adds process-management and parsing overhead for no gain over
the Node module; the hosted API introduces a network dependency, quota/keys, and
data egress to a third party — the exact coupling ADR-0111 exists to avoid.

### Option C: A different auditor (WebPageTest, Sitespeed.io, a SaaS)

Rejected for the *reference* adapter: either heavier runtime/licensing surface or
a proprietary cloud. They remain perfectly valid as *additional* adapters behind
the same port later — the point of ADR-0111 is that the choice is disposable.

## Decision and Rationale

1. **Tool & license.** Adopt **Lighthouse (Apache-2.0)** as the reference
   evidence vendor. The permissive license means no copyleft obligation and no
   commercial re-licensing risk (contrast ADR-0110's MassTransit v9 situation);
   Lighthouse is illustrative, not load-bearing (ADR-0111 litmus test).

2. **Runtime.** The adapter runs on **Node.js** and requires a **headless
   Chrome** at execution time. This is a *runtime* commitment (the collection
   step in the orchestration layer), never a design-time or Core dependency.

3. **Module boundary — optional, lazily imported.** The adapter lives in
   `@beyondnet/evolith-infra-providers` and imports ONLY the canonical `Evidence`
   shapes from `core-domain`. `lighthouse` and `chrome-launcher` are **not**
   declared dependencies of the package; the default runner imports them
   *dynamically* so the package builds and installs with neither present
   (ADR-0111 §5 — no external tool is ever a hard dependency).

4. **Testability seam.** The real headless-Chrome run sits behind an injected
   `LighthouseRunner` port. Unit tests inject a stubbed LHR, so the suite runs
   with no Chrome and no network. A live run needs Chrome + a deployed URL and is
   a runtime concern.

5. **Normalization contract.** The adapter maps each Lighthouse category
   (`performance` → `performance`, `accessibility` → `a11y`, `best-practices`,
   `seo`) to a `0..100` metric AND an `EvidenceFinding` whose severity is derived
   deterministically from the category score. It emits
   `determinism: 'deterministic'` and **full, mandatory provenance**
   (`collectedBy: 'lighthouse'`, `adapterVersion`, a SHA-256 `artifactHash` of the
   LHR, and a `timestamp` taken from the LHR `fetchTime`), via
   `normalizeEvidence`.

6. **No dependency inversion.** The `IQualitySignalProvider` port is owned by the
   orchestration layer (agent-runtime). Importing it into an infra-edge package
   would invert the dependency direction (infra → orchestration), so the adapter
   conforms to the port **structurally** (a mirrored interface in-package) and the
   runtime registers the instance. Structural conformance to the real port is
   verified at build time.

## Evidence and Evaluation Criteria

- **License check**: Lighthouse is Apache-2.0 — permissive, sublicensable,
  no commercial gate (verify against the upstream `LICENSE`).
- **Determinism**: the adapter emits `determinism: 'deterministic'`; a fixed LHR
  yields identical `Evidence` (same metrics, findings and `artifactHash`).
- **Provenance**: every emitted `Evidence` carries a complete `Provenance`
  (mandatory per ADR-0111 §6), enforced by `normalizeEvidence`.
- **Purity of the edge**: `grep` shows no `lighthouse`/`chrome-launcher` in the
  package's declared dependencies; they are dynamically imported only.
- **Statelessness preserved**: the Core imports only `Evidence`; no adapter or
  vendor import reaches `core-domain` (ADR-0101 / ADR-0111 boundary criterion).

## Consequences, Risks, and Trade-offs

Positive: proves the ADR-0111 seam end-to-end with a real, deterministic evidence
dimension; permissive licensing removes legal risk; the injected-runner seam keeps
unit tests hermetic; the vendor stays disposable and tenant-selectable.

Negative / trade-offs: a live run needs a headless-Chrome-capable runtime image
and a deployed URL (an operational cost, not a design one); Lighthouse scores can
vary run-to-run on a live target due to network/CPU variance even though the tool
class is deterministic — consumers should treat a single run as a point sample and
may average across runs. Risk: Chrome/Lighthouse version drift changing category
ids or score semantics (mitigated by the versioned adapter and provenance
`artifactHash`).

## References

- Lighthouse — runtime auditing engine (Apache-2.0), Node programmatic API with
  JSON (LHR) output: <https://github.com/GoogleChrome/lighthouse>
- Lighthouse license (Apache-2.0):
  <https://github.com/GoogleChrome/lighthouse/blob/main/LICENSE>
- `chrome-launcher` — headless Chrome launcher used by the default runner:
  <https://github.com/GoogleChrome/chrome-launcher>

## Related Decisions and Standards

- [ADR-0111](./0111-quality-signal-provider-port.md) — the Quality Signal
  Provider port + canonical `Evidence` this adapter implements (parent decision).
- [ADR-0101](./0101-core-stateless-evaluation-engine.md) — stateless Core; the
  adapter runs in orchestration, never inside the evaluator.
- [ADR-0110](./0110-masstransit-v8-apache-license-pin.md) — precedent for treating
  a load-bearing dependency's license as an architectural concern (here the
  opposite: an *optional* dependency with a permissive license).
- [ADR-0104](./0104-topology-driven-advisory-design-governance.md) — derives the
  criteria this runtime evidence confirms or refutes (the conformance loop).
