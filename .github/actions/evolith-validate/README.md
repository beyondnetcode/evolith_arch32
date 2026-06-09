# evolith-validate — GitHub Actions Composite Action

> **Bilingual Navigation:** [Versión en Español](./README.es.md)

Reusable composite action that runs `smart-cli validate` as a PR gate in any satellite repository that inherits from Evolith Core.

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
| `cli-version` | `@evolith/smart-cli` version to install | No | `latest` |
| `fail-on-violation` | Fail the job when violations are found | No | `true` |

## Outputs

| Output | Description |
|--------|-------------|
| `compliance-status` | `compliant` or `non-compliant` |
| `violations-count` | Number of violations found |
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

---

## Requirements

- The satellite repository must have an `evolith.yaml` at its root (or at `satellite-path`).
- The `smart-cli validate` command resolves Core rules via the `coreRef` field in `evolith.yaml`.

---

[Back to Evolith Core](../../../reference/governance/standards/vision/README.md)
