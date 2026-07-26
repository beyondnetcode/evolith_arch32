# evolith-validate — GitHub Actions Composite Action

> **Bilingual Navigation:** [Versión en Español](./README.es.md)

Reusable composite action that runs `evolith-cli validate` as a PR gate in any satellite repository that inherits from Evolith Core.

---

## Usage

### Minimal (all rulesets)

```yaml
# .github/workflows/governance.yml  (in your satellite repo)
name: Evolith Governance Gate

on:
  pull_request:
    branches: [main, develop]

jobs:
  governance:
    name: Governance Compliance
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Validate Evolith governance
        uses: beyondnetcode/evolith_arch32/.github/actions/evolith-validate@main
```

### Inheritance ruleset only

```yaml
      - name: Validate Evolith inheritance
        uses: beyondnetcode/evolith_arch32/.github/actions/evolith-validate@main
        with:
          ruleset: inheritance
```

### Full configuration

```yaml
      - name: Validate Evolith governance
        uses: beyondnetcode/evolith_arch32/.github/actions/evolith-validate@main
        with:
          satellite-path: '.'
          ruleset: 'inheritance'
          node-version: '20'
          cli-version: '0.0.3-beta'
          fail-on-violation: 'true'

      - name: Upload compliance report
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: evolith-compliance-report
          path: ${{ steps.validate.outputs.report-path }}
```

---

## Inputs

| Input | Description | Required | Default |
|-------|-------------|----------|---------|
| `satellite-path` | Path to the satellite repo root | No | `.` |
| `core-path` | Path to Evolith Core (monorepo use) | No | `''` |
| `ruleset` | Ruleset to validate: `acl`, `open-core`, `inheritance`, or empty for all | No | `''` |
| `node-version` | Node.js version | No | `20` |
| `cli-version` | `@beyondnet/evolith-cli` version to install | No | `latest` |
| `cli-command` | Command used to invoke the CLI. Empty installs the published CLI; set it (e.g. `node ./src/sdk/cli/dist/main.js`) to run a local build and skip both the npm install and the Node.js setup | No | `''` |
| `fail-on-violation` | Fail the job when violations are found | No | `true` |

## Outputs

| Output | Description |
|--------|-------------|
| `compliance-status` | `compliant` or `non-compliant` |
| `violations-count` | Number of **blocking** issues found (`data.issues[].blocking == true`) |
| `issues-count` | Total issues found, blocking and advisory |
| `report-path` | Absolute path to the generated JSON report |

---

## Rulesets

| Ruleset | What it validates |
|---------|------------------|
| `inheritance` | Satellite inherits Core version, required ADRs, phase gate contracts |
| `acl` | Anti-corruption layer boundaries (external integrations) |
| `open-core` | Open-Core boundary rules (what belongs to Core vs. Tracker SaaS) |
| *(empty)* | All rulesets above combined |

---

## Job Summary

The action writes a compliance summary to the GitHub Actions job summary on every run (including failures), showing compliance status, violation count, and configuration used.

The count is read from the CLI's ADR-0073 envelope — `{ success, data: { status, rulesChecked, issues[], coreRef, timestamp }, meta }` — with `[.data.issues[]? | select(.blocking == true)] | length`. It depends on no other key, so keys added to the envelope cannot move it.

---

## Dogfooding and regression tests

This action is exercised by [`evolith-validate-dogfood.yml`](../../workflows/evolith-validate-dogfood.yml) in Evolith Core:

- `test/action-step.test.mjs` executes the action's own `run:` scripts against recorded CLI envelopes (`node --test .github/actions/evolith-validate/test/action-step.test.mjs`).
- The `dogfood` job builds this commit's CLI and runs the action against `test/fixtures/noncompliant-satellite/`, asserting a non-zero violation count and a blocked job.

---

## Requirements

- The satellite repository must have an `evolith.yaml` at its root (or at `satellite-path`).
- The `evolith-cli validate` command resolves Core rules via the `coreRef` field in `evolith.yaml`.

---

[Back to Evolith Core](../../../reference/core/control-center/README.md)
