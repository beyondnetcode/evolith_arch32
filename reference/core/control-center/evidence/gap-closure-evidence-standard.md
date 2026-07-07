# Gap Closure Evidence Standard

> **Bilingual Navigation:** [Versión en Español](./gap-closure-evidence-standard.es.md)

**Status:** Active  
**Owner:** Evolith Architecture Board  
**Machine-Readable Registry:** [`gap-closure-evidence.json`](./gap-closure-evidence.json)

## 1. Purpose

This standard makes a completed gap an evidence-backed governance claim. A consistent board row is necessary but not sufficient: closure must be reproducible from repository history and resolvable artifacts.

## 2. Required Closure Record

Every gap marked `DONE` must have exactly one entry in the canonical registry with:

| Field | Requirement |
|---|---|
| `id` | Existing `GT-nn` identifier present in the board and catalog |
| `closedAt` | ISO date that is not in the future |
| `closureCommit` | Existing Git commit containing or establishing the closure |
| `evidence` | One or more repository-relative files that demonstrate the result |
| `validationCommands` | One or more reproducible commands used to validate the result |
| `dependencyDisposition` | `none`, `satisfied`, `accepted-scope`, or `deferred` |
| `dependencyRationale` | Required whenever disposition is not `none` |

Machine-readable governance artifacts use English as their canonical language under [ADR-0090](../../sdlc/governance/adr-0090-rule-language-policy.md).

## 3. Semantic Enforcement

`node .harness/scripts/ci/08-validate-tracking.mjs` fails when:

1. a completed gap has no closure record;
2. a closure record points to a missing gap, commit, or evidence file;
3. a completed catalog section contains an unchecked `- [ ]` criterion;
4. closure metadata is incomplete, duplicated, future-dated, or uses an unsupported dependency disposition;
5. English and Spanish boards disagree on ID order or semantic status.

Pending, in-progress, and deferred gaps must not have active closure records. Historical rationale remains in the catalog.

## 4. Closure Workflow

1. Complete and validate the scoped work.
2. Commit the implementation or documentation evidence.
3. Add the closure record using that real commit.
4. Resolve every checkbox in both catalog languages.
5. Change the board status to `DONE` / `COMPLETADO`.
6. Run tracking, documentation, and bilingual validation.

No placeholder commit, speculative evidence, or waived checkbox may be used to satisfy closure.

---
[Back to Gap Tracking](../gaps/gap-tracking.md)
