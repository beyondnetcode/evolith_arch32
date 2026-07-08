> **Bilingual Navigation:** [Ver versión en Español](./0105-okf-knowledge-projection.es.md)

# ADR-0105: OKF as the Portable Projection of the Knowledge OS

> **Agent Signature:** Architect Agent (Winston)

## Status
Proposed (2026-07-07)

## Date
2026-07-07

## Context and Problem

The Evolith Core Knowledge OS (`reference/knowledge/`, M0) is **YAML-first**: the single source of truth is authored as `canonical/product.yaml`, `canonical/packs/*.pack.yaml`, and a master `knowledge.index.yaml`, with authored prose kept in `canonical/**/*.md`. This model is excellent for governed authoring — composition manifests, machine-verifiable oracles, SemVer packs, PR review — but it is **proprietary to Evolith**: an external agent (Claude, ChatGPT, Gemini, Copilot, an MCP client) cannot consume it without learning our `apiVersion: evolith.dev/knowledge/v1` schema.

In June 2026 Google Cloud published **OKF (Open Knowledge Format) v0.1** — a vendor-neutral open specification that represents curated knowledge as a directory of markdown files with YAML frontmatter (`type` is the only required field), reserved `index.md`/`log.md` files, and markdown cross-links forming a graph. OKF is precisely the portable interchange shape our proprietary corpus lacks. The problem: **how do we make the Core's knowledge consumable as a standard, portable bundle without abandoning the governed YAML authoring model that already works?**

## Objective and Scope

**Objective:** expose the Core's canonical knowledge as an OKF v0.1-conformant bundle that any external human or agent can read, without a proprietary account, SDK, or schema.

**In scope:**
- A **published, committed** OKF projection of `canonical/` at `reference/knowledge/okf/` — generated (never hand-edited, never authority), readable on clone, and kept honest by an **up-to-date gate** that proves `published == regenerate(canonical)`.
- A deterministic generator wired into the existing M0 local surface, plus OKF conformance + up-to-date checking for CI.

**Out of scope (explicitly deferred):**
- Replacing the YAML authoring model with native OKF authoring (that would be a separate, larger decision).
- Hosting/serving the bundle over REST/MCP — deferred to M2, reusing `corpus-resource.handler` and `IKnowledgePort`.
- Ingesting external OKF bundles _into_ the Core (import direction).
- An editorial/scoping allow-list of publishable packs — a documented hook, not built: Core is open-source and, per ADR-0101, never owns sensitive/tenant state, so all packs are publishable today.

## Options Considered

1. **OKF as a published projection with an up-to-date gate (chosen).** Keep YAML as the sovereign authoring format; add an adapter that projects `canonical/` → an OKF bundle committed at `reference/knowledge/okf/`, plus a `--verify` gate that fails CI if the committed bundle drifts from source. Readable on clone (the point of an open, collaborative corpus), with drift closed by the gate. Additive, reversible.
2. **OKF as a derived, gitignored projection.** Same generator, but the bundle stays uncommitted under `derived/` and consumers regenerate it. Preserves the `derived/=never-committed` invariant literally, but a bundle nobody sees on clone has no audience — it fails the "anyone who downloads the source can consume it" goal for an open project. Rejected in favor of publishing + a gate that keeps drift out.
3. **Adopt OKF as the native authoring format.** Replace `*.pack.yaml`/`product.yaml` with hand-authored OKF concept files. Maximally aligned with the standard, but discards composition manifests, the machine-verifiable oracle model, and SemVer packs — a rewrite of the M0 Knowledge OS for interop we can obtain by projection. Rejected.
4. **Do nothing / bespoke export on demand.** Leave the corpus proprietary and hand-write exports when a consumer asks. Rejected — non-repeatable, drifts from source, defeats the "boot expert without conversational memory" goal.

## Decision and Rationale

**Adopt Option 1: OKF v0.1 is the Core's portable *projection* format, not its authoring format — published and gated.**

- **Authoring stays YAML-first.** `canonical/` remains the single source of truth. The OKF bundle is a **published, generated artifact** at `reference/knowledge/okf/`: committed and readable on clone, but never authored by hand and never authority. An **up-to-date gate** (`--verify`, run in CI and pre-commit when the corpus changes) proves `published == regenerate(canonical)`, so the committed bundle can neither drift nor become a second source of truth — the intent of the `derived/` invariant is preserved by verification rather than by hiding the file.
- **The projection is deterministic.** `.harness/scripts/knowledge-okf-project.mjs` reads `knowledge.index.yaml`, rehydrates authored bodies **always from source**, and emits an OKF bundle: `product.md` (`type: Product`), one `type: Knowledge Pack` per pack, one concept per authored file (`type: Glossary`/`Domain Model`/`Prompt`), reference nodes for absorbed ADRs/schemas (`type: ADR`/`Schema`), reserved `index.md` per directory, and a `log.md`. Cross-links are **absolute from the bundle root** (`/packs/…`) per the spec's stability recommendation.
- **Provenance is preserved as OKF extensions.** `owner`, `reviewBy`, `version`, `partOf`, and `resource` (repo-relative path or `evolith://` URN) travel as extra frontmatter keys — permitted by OKF and ignored by naive consumers.
- **Conformance is enforced.** The generator self-checks every non-reserved file for a parseable frontmatter with a non-empty `type`; `--check` runs this in CI without writing.

Rationale: this buys standards-based interoperability at near-zero risk. Nothing in the authored corpus changes; the projection is a pure function of it. If OKF evolves or is abandoned, only the adapter changes — the sovereign knowledge is untouched. This is the same altitude discipline as ADR-0101: the Core stays the authority; a portable surface is derived, not owned.

## Evidence and Evaluation Criteria

- **Criteria:** (a) zero change to the sovereign corpus; (b) OKF v0.1 conformance; (c) determinism/reproducibility; (d) drift closed by verification, not by hiding the artifact.
- **Evidence:**
  - The generator emits a conforming bundle from the real corpus: `node .harness/scripts/knowledge-okf-project.mjs --check` → _15 files, 0 violations_.
  - The up-to-date gate holds and catches drift: `--verify` passes on a fresh bundle, and returns exit 1 when `canonical/` changes without regeneration (proven by mutating a concept and re-running).
  - Unit tests assert conformance, source rehydration, absolute cross-links, backlink accumulation, reserved-file handling, byte-for-byte determinism for a fixed `--as-of`, and `diffBundle` drift classification (changed/missing/orphan).
  - OKF v0.1 spec: only `type` is required; consumers MUST tolerate unknown keys and broken links — so our extension fields and `evolith://` reference nodes are safe.

## Consequences, Risks, and Trade-offs

**Positive**
- The Core's knowledge is consumable by any OKF-aware agent/tool with no proprietary coupling and **readable directly on clone** — the collaborative, open-source goal: anyone who downloads the source can read and grow the corpus.
- Additive and reversible: no authored file changes; the adapter is the only new authority-free surface.
- Sets the seam for M2 hosted serving (REST `/api/v1/knowledge` + MCP resource) to emit the same bundle.

**Negative / risks**
- **Dual representation drift** between YAML source and the committed OKF bundle. *Mitigated:* the `--verify` gate (CI `38-validate-okf-projection` + pre-commit when the corpus changes) blocks any commit whose published bundle ≠ `regenerate(canonical)`; the bundle is generated, never hand-edited; bodies rehydrate from source.
- **Git history is permanent** — everything published ships forever. *Accepted:* Core is open-source and, per [ADR-0101](./0101-core-stateless-evaluation-engine.md), never owns sensitive/tenant state (that lives in satellites), so all packs are publishable. If a pack ever must be withheld, add an editorial exclude to the index's `projections` entry — a documented hook, deliberately not built now (YAGNI).
- **OKF v0.1 is young** ("a starting point, not a finished standard"). *Mitigated:* isolated behind one adapter and watched by `knowledge-okf-standard-watch` (see the Winston playbook); a spec change is a local edit.
- **Reference nodes use `evolith://adr/…` URNs**, not resolvable file paths. *Accepted:* OKF consumers must tolerate non-dereferenceable/broken links; schema references still carry real repo paths.

**Trade-off:** we accept maintaining a projector (and its drift surface) in exchange for standards interoperability without a corpus rewrite.

## References

- OKF v0.1 specification — [GoogleCloudPlatform/knowledge-catalog/okf/SPEC.md](https://github.com/GoogleCloudPlatform/knowledge-catalog/blob/main/okf/SPEC.md)
- [How the Open Knowledge Format can improve data sharing — Google Cloud Blog](https://cloud.google.com/blog/products/data-analytics/how-the-open-knowledge-format-can-improve-data-sharing/)
- Generator: `.harness/scripts/knowledge-okf-project.mjs` · Tests: `.harness/scripts/knowledge-okf-project.test.mjs`
- Source of truth: `reference/knowledge/knowledge.index.yaml`, `reference/knowledge/canonical/`
- Knowledge OS overview: `reference/knowledge/README.md`

## Related Decisions and Standards

- [ADR-0074: Evolith Core API Exposure Layer](./0074-evolith-core-api-exposure-layer.md) — the hosted OKF surface (M2) exposes through this layer.
- [ADR-0080: Remote Repository Reference Contract](./0080-remote-repository-reference-contract.md) and [ADR-0101: Core as a Stateless Evaluation Engine](./0101-core-stateless-evaluation-engine.md) — same altitude discipline: derived/portable surfaces never become Core authority.
- Knowledge OS design proposal: `reference/specs/architecture/knowledge-os-proposal.md` (Tracker satellite).
- Complementary allow-list: `src/rulesets/schema/knowledge-projection.schema.json` (RAG projection, not to be confused with the OKF projection).

---

[Back to ADR Registry](../README.md) · [ADR Decision Matrix](../adr-matrix.md) · [ADR-0101](./0101-core-stateless-evaluation-engine.md)
