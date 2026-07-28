# Evolith Machine Contract Compatibility

> **Bilingual Navigation:** [Versión en Español](./README.es.md)

The manifest in this directory is the canonical compatibility boundary between Evolith Core, the Evolith CLI producer, and independent consumers such as Evolith Tracker.

- Contract and schema versions follow semantic versioning.
- Additive compatible changes increment a minor version.
- Breaking changes increment the major version and require an explicit consumer migration.
- Consumers pin the contract version, each schema version, and its SHA-256 digest.
- Core CI validates the producer declaration and schema digests. Consumer CI runs the same validator against its pinned manifest.

Run:

```bash
node .harness/scripts/ci/10-validate-contract-conformance.mjs
node .harness/scripts/ci/10-validate-contract-conformance.mjs --consumer /path/to/consumer-contracts.json
```

## Pinned schemas

| Schema id | Version | Path | What it governs |
| --- | --- | --- | --- |
| `gate-evidence` | 1.0.0 | `src/rulesets/schema/gate-evidence.schema.json` | Evidence attached to a gate decision. |
| `output-envelope` | 1.0.0 | `src/rulesets/schema/output-envelope.schema.json` | The ADR-0073 transport envelope every surface returns. |
| `evaluation-context` | 1.0.0 | `src/rulesets/schema/evaluation-context.schema.json` | The evaluate REQUEST — what a consumer sends to `POST /api/v1/evaluate`. |
| `evaluation-result` | 1.0.0 | `src/rulesets/schema/evaluation-result.schema.json` | The evaluate RESPONSE — the canonical `EvaluationResult` carried in `data`. |

The last two were added for GT-573. Before that, the flagship integration's request and response had no pinned schema on either side of the wire, which is how the Core could answer with a different envelope than the consumer bound and leave both CIs green.

Every consumer must pin all four ids, each at the version and SHA-256 declared here, or `--consumer` fails with `Consumer does not pin schema: <id>`. For `beyondnetcode/evolith_tracker` that means adding the `evaluation-context` and `evaluation-result` entries to `contracts/evolith-core-contracts.json` and keeping `contractVersion` at `1.0.0`.

