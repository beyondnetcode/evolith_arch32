# CLI Rulesets

> **Bilingual navigation:** [Versión en Español](./README.es.md)

Machine-readable rules for Evolith Evolith CLI release readiness and parity with Evolith Core.

## Rulesets

| Ruleset | Purpose |
|---|---|
| [CLI Release Readiness](./release-readiness.rules.json) | Defines minimum build, test, package, and MCP smoke evidence before CLI release. |
| [CLI/Core Parity](./core-parity.rules.json) | Requires every Core rule capability to be traced to CLI, MCP, tests, and evidence status. |

## Validation Intent

These rulesets are authoritative for release reviews and should be wired into CLI validation as executable checks before promoting a CLI version from beta to stable.

