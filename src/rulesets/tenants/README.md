# Per-tenant rule overrides

This directory documents the two ways a tenant softens, hardens or disables ONE
Core rule without adopting or dropping a whole pack (pack-level selection is
`--select` / `policyRefs`, see GT-659). Both go through the same policy in
`src/packages/core-domain/src/application/validators/rule-overrides.ts`
(`applyRuleOverrides`), and both are named in every run's result under
`overrides.applied` / `overrides.rejected`. This README describes only what
exists and is read by code (GT-678); nothing here is enforced by a Rego policy.

## 1. The override document (what a satellite authors)

A satellite keeps a JSON document that validates against
[`../schema/rule-overrides.schema.json`](../schema/rule-overrides.schema.json)
and names it from its `evolith.yaml`:

```yaml
spec:
  rulesets:
    overrides: governance/rule-overrides.json   # relative to the satellite root, inside it
```

[`example/rule-overrides.json`](./example/rule-overrides.json) is a complete
example. Each entry is keyed by a Core rule id and sets any of `enabled`,
`severity`, `blocking`, always with a `rationale`, and where the policy demands
it an `approvedBy` and an `expiresOn`.

**Where it is read.** `RulesetValidatorService.validate` reads the document
right after `evolith.yaml`, validates it against the schema, and hands it to the
engine, which applies it AFTER pack selection and BEFORE applicability. That
service is the path every surface traverses, so the document reaches:

- CLI `evolith validate` and `evolith evaluate` (the latter through the
  evaluation pipeline);
- MCP `evolith-validate` and `evolith-evaluate`;
- REST `POST /api/v1/architecture/validate-satellite` and `POST /api/v1/evaluate`
  (the satellite is materialised from the inline files, `evolith.yaml` and the
  document included).

**What is rejected.**

| Situation | Outcome |
|---|---|
| The named file is missing, is not JSON, escapes the satellite, or fails the schema (including an unknown key such as `enabeld`) | The run ABORTS with `RuleOverridesInvalidError` -> `SCHEMA_INVALID` (CLI exit 3, REST 422). Never ignored. |
| `enabled: false` or `blocking: false` on a `blocking: true` rule without BOTH `approvedBy` and `expiresOn` | `OVR-BLOCKING-REMOVED`: the Core values stand and the run FAILS (blocking issue, CLI exit 2). A blocking criterion can be waived, time-boxed and approved, but not removed. |
| A severity downgrade of a `blocking: true` rule without `approvedBy` | `OVR-UNAPPROVED-DOWNGRADE`: same treatment. |
| `expiresOn` in the past (inclusive day, UTC) | `OVR-EXPIRED`: ignored and reported; the run stays at the Core values. |
| A rule id the corpus does not carry | `OVR-UNKNOWN-RULE`: reported; nothing is loosened by a typo. |
| A rule outside this run's `--select` | `OVR-NOT-SELECTED`: reported. |
| Every field already at its current value | `OVR-NOOP`: reported. |

The last four are a non-blocking `OVR-IGNORED` advisory in `issues`; the first
two blocking codes are their own blocking issues.

**What is recorded.** Every applied change is one record
`{ ruleId, field, from, to, approvedBy?, expiresOn?, source }` in
`overrides.applied`; a clean run reports `{ applied: [], rejected: [] }` (present
and empty, never absent). A rule disabled by an override is excluded before
evaluation and counted as `notApplicable` with reason `disabled`, so
`corpusTotal` still names the whole corpus.

## 2. A tenant pack inside the corpus (`tenants/<tenant-id>/*.rules.json`)

A `*.rules.json` under this directory is loaded like any other ruleset. When it
re-declares a Core rule id, the loader keeps ONE rule, the Core copy, with the
pack's authored `severity` / `blocking` / `enabled` / `rationale` / `approvedBy`
/ `expiresOn` attached as its delta; the engine applies that delta under the
same policy as the document above and records it with the pack's `sourceFile`
as `source`. Two NON-tenant files declaring the same id is a corrupt corpus and the
load fails with `DuplicateRuleIdError` naming both files.

A rule declared here with a new id is simply the tenant's own rule. Any key not
in `definitions.rule` of `ruleset-standard.schema.json` is rejected at load,
naming the key and the file.

## What is deliberately NOT here

- No `tenant.json` / `overrides.json` instances and no `tenant-override.schema.json`:
  that surface (gate-level JSON-pointer overrides) had no code reader and its
  README claimed `multi-tenancy.rego` enforced it, which was false. It was
  removed in GT-678; `MTN-01..08` read `input.satellite.multiTenancy.*` and are
  unrelated to rule overrides.
- No tenant entity: the Core never resolves `tenantId` (ADR-0101); it is echoed
  for audit.
