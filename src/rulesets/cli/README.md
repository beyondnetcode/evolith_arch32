# CLI Rulesets

> **Bilingual navigation:** [Versión en Español](./README.es.md)

Machine-readable rules for Evolith Evolith CLI release readiness and parity with Evolith Core.

## Rulesets

| Ruleset | Purpose |
|---|---|
| [CLI Release Readiness](./release-readiness.rules.json) | Defines minimum build, test, package, and MCP smoke evidence before CLI release. |
| [CLI/Core Parity](./core-parity.rules.json) | Requires every Core rule capability to be traced to CLI, MCP, tests, and evidence status. |
| [CLI Exit-Code Taxonomy](./exit-code-taxonomy.rules.json) | Requires every CLI command to exit with a code drawn from the published taxonomy (`0` pass, `1` tool failure, `2` blocked, `3` invalid input), over a non-vacuous scan, without widening the taxonomy to absorb an offender. Rego parity in [`opa/cli-exit-code-taxonomy.rego`](../opa/cli-exit-code-taxonomy.rego). |

## Validation Intent

These rulesets are authoritative for release reviews and should be wired into CLI validation as executable checks before promoting a CLI version from beta to stable.

