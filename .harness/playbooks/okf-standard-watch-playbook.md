# OKF Standard-Watch Playbook

> **Bilingual Navigation:** [Versión en Español](./okf-standard-watch-playbook.es.md)

## Persona: Winston (Principal Architect; repository agent ID `@winston`)

**Scope**: Keep the OKF projection of the Knowledge OS ([ADR-0105](../../reference/core/architecture/adrs/core/0105-okf-knowledge-projection.md)) healthy and aligned with the upstream Open Knowledge Format standard, enforcing the precautions the ADR defines.
**Inputs**: `reference/knowledge/` (canonical corpus + `knowledge.index.yaml`), the pinned OKF spec, and the lockfile `reference/knowledge/canonical/okf-spec.lock.json`.
**Outputs**: A conforming, up-to-date OKF bundle published at `reference/knowledge/okf/` (committed, gated by `--verify`) and an up-to-date spec lockfile.
**Constraints**: Follow the Knowledge OS golden rule — **oracle/conformance drift blocks; time/standard staleness only warns**. The bundle is derived: never authority, never hand-edited, never committed.

---

## Why this exists

The Core is **YAML-first**; OKF is a portable, derived **projection** for external consumption (ADR-0105). Two risks come with adopting an external, young standard:

1. **Drift of the projection** — the corpus changes and the bundle stops conforming.
2. **Drift of the standard** — OKF v0.1 evolves upstream and our projector falls behind.

This playbook wires both into Winston's routine, split by cost so nothing puts the network on the commit path.

## The three mechanisms

| Mechanism | Trigger | Severity | Where |
|---|---|---|---|
| **Up-to-date guard** (`--verify` on corpus change) | every commit that stages `canonical/` or the index, any CI mode (even `skip`) | **blocks** | `.husky/pre-commit` → `knowledge-okf-precommit-guard.mjs` |
| **Up-to-date gate** (`--verify`) | `ci-runner` governance/auto/full | **blocks** | `.harness/scripts/ci/38-validate-okf-projection.mjs` |
| **Standard-watch** (upstream hash diff) | on demand (manual) + STALE nudge in pre-commit | **warns** | `.harness/scripts/knowledge-okf-standard-watch.mjs` |

## Commands

```bash
# Regenerate / validate the published projection (offline, deterministic)
node .harness/scripts/knowledge-okf-project.mjs            # regenerate bundle → reference/knowledge/okf/
git add reference/knowledge/okf                            # re-stage after any canonical/ change
node .harness/scripts/knowledge-okf-project.mjs --verify   # conformance + up-to-date (CI gate)
node .harness/scripts/knowledge-okf-project.mjs --check    # conformance only, no write

# Watch the upstream OKF standard (network, manual)
node .harness/scripts/knowledge-okf-standard-watch.mjs            # check + refresh checkedAt
node .harness/scripts/knowledge-okf-standard-watch.mjs --init     # first run: create the lockfile
node .harness/scripts/knowledge-okf-standard-watch.mjs --accept   # acknowledge a reviewed upstream change
node .harness/scripts/knowledge-okf-standard-watch.mjs --json     # machine-readable

# Tests
node --test .harness/scripts/knowledge-okf-project.test.mjs \
            .harness/scripts/knowledge-okf-standard-watch.test.mjs \
            .harness/scripts/knowledge-okf-precommit-guard.test.mjs
```

## Winston's routine when the standard changes

The pre-commit nudge (or a manual run) reports `status: changed` / exit `10`. Then:

1. **Read the diff of intent.** Open the upstream [OKF SPEC.md](https://github.com/GoogleCloudPlatform/knowledge-catalog/blob/main/okf/SPEC.md) and compare against what ADR-0105 assumes (required `type`, reserved `index.md`/`log.md`, absolute cross-links, tolerated unknown keys).
2. **Assess impact on the projector.** If the change touches required fields, reserved filenames, or conformance rules, update `knowledge-okf-project.mjs` and its tests until `--check` passes again.
3. **Reconcile the ADR.** If the semantics shift materially, add a correction note to ADR-0105 (do not rewrite history — mirror the altitude discipline of ADR-0101).
4. **Acknowledge.** Run `--accept` to pin the new upstream hash (`sha256` + `reviewedAt`), which clears the advisory.

## Exit-code contract

| Script | 0 | non-zero |
|---|---|---|
| `knowledge-okf-precommit-guard.mjs` | clean (may print STALE nudge) | `1` = corpus staged but published bundle out of date (**blocks commit**) |
| `ci/38-validate-okf-projection.mjs` | conforms and up to date | `1` = conformance or up-to-date drift (**blocks CI**) |
| `knowledge-okf-standard-watch.mjs` | up to date / init / accepted | `10` = changed upstream (advisory); `2` = network/parse error (lock untouched) |

---

[Back to Playbooks](./) · [ADR-0105](../../reference/core/architecture/adrs/core/0105-okf-knowledge-projection.md) · [Knowledge OS](../../reference/knowledge/README.md)
