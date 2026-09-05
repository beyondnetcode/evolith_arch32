## Pull Request Summary
<!-- Provide a brief description of the changes introduced by this PR. -->

## Before you submit

<!--
These are the things only YOU can confirm. Everything else — link resolution, doc
structure, markup balance, bilingual parity, coverage — is checked automatically and
will tell you if it is unhappy. You do not need to run the harness by hand.
-->

- [ ] **Sign-off (DCO):** my commits carry a `Signed-off-by` line. `git commit -s` adds it, and the `prepare-commit-msg` hook adds it for you if you forget. See [CONTRIBUTING](../CONTRIBUTING.md#developer-certificate-of-origin).
- [ ] **Conventional Commits:** my PR title and commits follow [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) (e.g. `docs:`, `feat:`, `fix:`, `chore:`).
- [ ] **Agnosticism:** this PR does not introduce a specific technology dependency (e.g. AWS, Azure, React) into the agnostic Core reference without an approved ADR.
- [ ] **Bilingual:** *only if* I edited one of the seventeen entry-surface documents listed in [`bilingual-scope.mjs`](../.harness/scripts/lib/bilingual-scope.mjs), I updated both halves. If I did not touch those, this does not apply — see [ADR-0126](../reference/core/architecture/adrs/core/0126-bilingual-entry-surface.md).

## Linked ADRs / Issues
<!-- If this PR makes an architectural change, link the Architecture Decision Record (ADR) here. -->
- Link to ADR:
- Link to Issue:

## What is not your problem

<!--
This repository runs a large number of governance checks against itself. If one of
them goes red on your PR for a reason unrelated to your change, say so in a comment
and a maintainer will sort it out — do not try to fix the harness to get green.
-->

Red checks that are **ours, not yours**, unless your change caused them:

- Anything under `.harness/scripts/ci/` reporting on the gap board, ADR registry, maturity or coverage floors.
- `Governance guards`, release-pipeline and provenance failures.
- Bilingual findings on documents outside the seventeen-file entry surface.
