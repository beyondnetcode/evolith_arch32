# Evolith Machine Contract Compatibility

> **Bilingual Navigation:** [Versión en Español](./README.es.md)

The manifest in this directory is the canonical compatibility boundary between Evolith Core, the Smart CLI producer, and independent consumers such as Evolith Tracker.

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

