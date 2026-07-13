# @beyondnet/evolith-contracts

The versioned **SemVer boundary** for the Evolith Core public contract (GT-513 · EAG-06).

External (non-Tracker) consumers depend on this package — not on the Core engine — to
discover, at a pinned SemVer + `sha256`, what the stateless Core can evaluate.

## What it exports

- **`MACHINE_CONTRACT_SET`** / **`CONTRACT_SET_SHA256`** — the machine-contract / schema
  set (id, version, path, per-file `sha256`) with a stable fingerprint over the schema
  list. Unlike the raw `evolith-machine-contracts.json` (which lists only
  `evolith_tracker`), this set advertises a first-class **`external`** consumer.
- **`EXPECTED_CAPABILITY_MANIFEST`** — the frozen snapshot of what
  `GET /api/v1/capabilities` returns for this contract version (name, SemVer, schema
  version, evaluation kinds, engines, surfaces, supported consumers, `sha256`).
- **`checkCapabilityManifestParity` / `assertCapabilityManifestParity`** — compare a live
  manifest against the declared snapshot and report/throw on drift.

## Parity guarantee

Contract-parity tests bind this package to the live producer (`buildCapabilityManifest`,
which is exactly what the REST endpoint serves) and **fail on any drift**, so a Core
capability change cannot ship without a package + SemVer bump.

```ts
import { checkCapabilityManifestParity } from '@beyondnet/evolith-contracts';

const env = await fetch(`${base}/api/v1/capabilities`).then((r) => r.json());
const { ok, mismatches } = checkCapabilityManifestParity(env.data);
if (!ok) throw new Error(`Core drifted from contract: ${mismatches.join(', ')}`);
```

REST-only per ADR-0074 (no GraphQL).
