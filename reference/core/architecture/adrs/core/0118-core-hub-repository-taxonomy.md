> **Bilingual Navigation:** [Ver versión en Español](./0118-core-hub-repository-taxonomy.es.md)

# ADR-0118: The Core Hub Has Its Own Root Taxonomy, Distinct From Satellites

> **Agent Signature:** Architect Agent (Winston)

## Status

Accepted (2026-07-20 — implemented in `develop`)

This ADR records a decision that is **already implemented**, not one being
proposed:

| Decision | Commit | Artefact |
|---|---|---|
| TAX-05 expects the real hub layout | `b728117e` | `src/rulesets/opa/taxonomy.rego` |
| Root allowlist drops accidental artefacts | `b728117e` | `.harness/scripts/ci/03-validate-root-cleanliness.mjs` |

## Date

2026-07-20

## Context and Problem

The Core hub repository had **no ADR governing its own root**. Two existed, and
neither described it:

- **[ADR-0070](./0070-lean-root-repository-taxonomy.md)** mandates `src/` +
  `docs/`, and its Scope line reads *"Universal — All Evolith satellite
  repositories"*. It is the **satellite** rule. There is no `docs/` in the hub,
  and the taxonomy spec explicitly forbids creating one.
- **[ADR-0048](./0048-enterprise-taxonomy-reference-layout.md)** mandates
  `src/` + `reference/` + `product/`. That is the hub, but 0048 is about the
  reference layout, not about what may sit at the root.

ADR-0070 was therefore applied to the hub by inertia, and it does not fit: its
textual whitelist omits `CONTRIBUTING.md`, `SECURITY.md`, `AGENTS.es.md`,
`package.json`, `tsconfig.json`, `product/` and `reference/` — all present and
all legitimate.

The practical consequence is that **the real authority over the hub root became
a script**, `.harness/scripts/ci/03-validate-root-cleanliness.mjs`, while the
ADR became decorative. A governance corpus whose own root is governed by an
unreferenced script, and not by a decision record, cannot ask satellites to do
better.

Two further symptoms made the gap concrete:

1. `taxonomy.rego` TAX-05 required the root to contain
   `{reference, rulesets, sdk, .harness}` — the layout from **before** the
   `apps/`+`packages/`+`sdk/` → `src/` cutover. Its own tests passed because the
   fixtures encoded the same stale layout: rule and test agreed with each other
   and both were wrong about the repository.
2. That stale rule was the only thing keeping an accidental `rulesets/` at the
   root alive. It held an empty agent registry left by running the CLI from the
   repository root, and deleting it broke TAX-05 — so an artefact nobody wanted
   was structurally protected by a rule nobody had revisited.

## Objective and Scope

**Objective:** give the Core hub an explicit, enforced root taxonomy, and make
the enforcing script the ADR's declared implementation rather than its
substitute.

**In scope:** the root of the Core hub repository (`evolith_arch32`).

**Out of scope:** satellite repository roots, which remain governed by
[ADR-0070](./0070-lean-root-repository-taxonomy.md); and the internal layout of
`reference/`, `product/` and `src/`, governed by
[ADR-0048](./0048-enterprise-taxonomy-reference-layout.md).

## Options Considered

**A. Broaden ADR-0070 to cover both hub and satellites.** Rejected. The two
roots are legitimately different — the hub carries a governance corpus
(`reference/`, `product/`) that no satellite has, and satellites carry
application shapes the hub does not. One rule covering both would have to be so
permissive that it stops rejecting anything.

**B. Leave the script as the de-facto authority.** Rejected. It is what the repo
already did, and the outcome was this ADR's Context: the script drifted from the
ADRs, the ADRs drifted from the repo, and nobody was accountable for either.

**C. A hub-specific taxonomy ADR whose implementation is the existing script.**
Chosen. It names the script as the enforcement point, so the two cannot silently
disagree: changing the allowlist without amending this ADR is now a visible
governance omission rather than routine maintenance.

## Decision and Rationale

The Core hub root contains exactly four first-class domains:

| Directory | Holds |
|---|---|
| `reference/` | The provider-neutral Core constitution — architecture, SDLC, ADRs, control centre |
| `product/` | The Evolith Product Suite corpus — suite, products, operations, infra, research |
| `src/` | Every workspace: `apps/`, `packages/`, `sdk/`, `rulesets/`, `tests/` |
| `.harness/` | The automation that governs the repository itself |

Plus tool-owned dotfolders (`.github/`, `.husky/`, `.vscode/`, `.obsidian/`,
`.bmad-core/`, `.mimocode/`) and the root files the ecosystem requires
(`README`, `AGENTS`, `CONTRIBUTING`, `SECURITY`, `LICENSE`, `CHANGELOG`,
`package.json`, `tsconfig*.json`, `evolith.yaml`, dot-config files) — each in
both language variants where the bilingual policy applies.

**`evolith.yaml` is a required root entry, not an accident.** The Core is a
satellite of itself and carries its own governance contract, and
`.harness/scripts/lib/paths.mjs` uses it as a `ROOT_MARKER`. Removing it breaks
every path resolution in the harness.

**Anything the CLI generates when run from the repository root is not
taxonomy.** `test-project/` and `rulesets/` reached the root that way, were
committed once, and then read as structure. They are `.gitignore`d so the
mistake cannot repeat, and their real counterparts live under
`src/sdk/cli/`.

**The enforcement point is
[`03-validate-root-cleanliness.mjs`](../../../../../.harness/scripts/ci/03-validate-root-cleanliness.mjs)**,
which runs in the governance suite on every push and pull request. `TAX-05` in
`src/rulesets/opa/taxonomy.rego` carries the same expectation in
machine-readable form.

## Evidence and Evaluation Criteria

- [x] `03-validate-root-cleanliness.mjs` passes against the current root and
      rejects an unlisted directory (verified: it caught an empty `test-project/`
      that `git rm` left behind).
- [x] `opa test src/rulesets/opa/taxonomy.rego` — 5/5, and
      `repository-taxonomy.rego` — 8/8, with fixtures describing the real layout.
- [x] `rulesets/` and `test-project/` removed from the root and `.gitignore`d.
- [x] `evolith.yaml` identifies the repository as `evolith` rather than the
      template default `my-satellite`.

## Consequences, Risks, and Trade-offs

**Positive.** The hub root has a decision record for the first time. The
allowlist and the OPA rule now describe the same repository, and both are
enforced on every push rather than only in a hook nobody reaches.

**Negative.** Two taxonomy rules to maintain instead of one. Accepted: they
govern genuinely different repository shapes, and collapsing them would produce
a rule too weak to reject anything.

**Risk — this ADR drifts like ADR-0070 did.** Mitigated by naming the enforcing
script here and keeping the machine-readable expectation in `taxonomy.rego`, but
not eliminated: nothing yet fails when the allowlist changes and this document
does not. That check is the follow-up below.

**Known limitation.** `TAX-05` and `TAX-11` are duplicated across two rego
packages, `evolith.taxonomy` and `evolith.repository_taxonomy`, both updated
here. Two sources of truth for one policy remains a latent drift risk.

## Known Follow-up

- Consolidate the duplicated TAX-\* rules into a single rego package.
- Add a guard asserting that the root allowlist and this ADR agree, so the
  failure mode described above becomes visible.
- `evolith.yaml`'s `adrRegistry` is empty, so no ADR — including this one — is
  registry-validated.

## References

- [ADR-0048: Enterprise Taxonomy and Reference Layout](./0048-enterprise-taxonomy-reference-layout.md)
- [ADR-0070: Lean Root Repository Taxonomy](./0070-lean-root-repository-taxonomy.md) — satellites
- [`03-validate-root-cleanliness.mjs`](../../../../../.harness/scripts/ci/03-validate-root-cleanliness.mjs)
- [`taxonomy.rego`](../../../../../src/rulesets/opa/taxonomy.rego)

## Related Decisions and Standards

| Decision | Relationship |
|---|---|
| ADR-0070 | Governs satellite roots. This ADR governs the hub root. They do not overlap. |
| ADR-0048 | Governs what lives inside `reference/` and `product/`. This ADR governs what may sit at the root. |
