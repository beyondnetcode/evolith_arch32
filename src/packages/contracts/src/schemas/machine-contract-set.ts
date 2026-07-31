/**
 * The versioned machine-contract / schema set exposed to EXTERNAL consumers
 * (GT-513 · EAG-06 — Stable API + capabilities manifest).
 *
 * This is the SemVer boundary of the Evolith Core public contract. It mirrors
 * `src/rulesets/contracts/evolith-machine-contracts.json` (the producer-side
 * descriptor authored by the CLI) but is packaged as a standalone,
 * self-contained module so a non-Tracker consumer can depend on it directly:
 *
 *  - `MACHINE_CONTRACT_SET` — the declared schema set (id/version/path/sha256)
 *    plus the officially supported consumers. Unlike the raw JSON — which lists
 *    only `evolith_tracker` — this set adds a first-class `external` consumer,
 *    which is the whole point of publishing the package: the contract is now
 *    stable and public.
 *  - `CONTRACT_SET_SHA256` — a sha256 over the canonical JSON of the schema
 *    descriptor list, the single value an external consumer pins against.
 *
 * Everything here is deeply `readonly`: the Core measures/exposes, never mutates.
 */

import { sha256Hex } from './contract-hash';

/** A single machine-readable schema advertised in the contract set. */
export interface ContractSchemaDescriptor {
  /** Stable schema id (e.g. `gate-evidence`). */
  readonly id: string;
  /** SemVer of this individual schema. */
  readonly version: string;
  /** Repo-relative path to the JSON Schema file (single source of truth). */
  readonly path: string;
  /** sha256 hex of the raw schema file bytes. */
  readonly sha256: string;
}

/** A consumer the Core officially supports for the contract set. */
export interface SupportedConsumer {
  /** Logical consumer id — matches a `supportedConsumers` entry of the manifest. */
  readonly consumer: string;
  /** Consumer repository, or `null` for the open/anonymous external consumer. */
  readonly repository: string | null;
  /** Path to the consumer-side manifest, or `null` when not applicable. */
  readonly manifestPath: string | null;
  /** Contract version the consumer is pinned to. */
  readonly contractVersion: string;
}

/** The versioned machine-contract / schema set. */
export interface MachineContractSet {
  /** SemVer of the contract set as a whole (== the package version). */
  readonly contractVersion: string;
  /** Compatibility policy consumers can rely on. */
  readonly compatibilityPolicy: 'semver-major';
  /** The advertised schema descriptors. */
  readonly schemas: readonly ContractSchemaDescriptor[];
  /** Consumers the Core officially supports (now includes `external`). */
  readonly supportedConsumers: readonly SupportedConsumer[];
}

/**
 * SemVer version of THIS published contract package. Bumping the Core's public
 * contract (schemas, hashes, capability manifest) requires bumping this in
 * lockstep with `package.json#version` — the contract-parity tests enforce it.
 */
export const CONTRACTS_PACKAGE_VERSION = '1.0.0';

/**
 * The frozen, versioned machine-contract set. Mirrors
 * `rulesets/contracts/evolith-machine-contracts.json` and extends its
 * `supportedConsumers` with the first-class `external` consumer.
 */
export const MACHINE_CONTRACT_SET: MachineContractSet = Object.freeze({
  contractVersion: CONTRACTS_PACKAGE_VERSION,
  compatibilityPolicy: 'semver-major',
  schemas: Object.freeze([
    Object.freeze({
      id: 'gate-evidence',
      version: '1.0.0',
      path: 'rulesets/schema/gate-evidence.schema.json',
      sha256: '9225090e2ee851dbd2d5c22e7a0a6e2d7f97db9835f7f3822ac7d9f861b75754',
    }),
    Object.freeze({
      id: 'output-envelope',
      version: '1.0.0',
      path: 'rulesets/schema/output-envelope.schema.json',
      sha256: '07eaffaae2c33071ea105fbcbdc497c06d149143f6cc9b94555170740707fd0b',
    }),
    // GT-573: the `POST /api/v1/evaluate` request/response pair. Until now the
    // flagship integration had no published schema at all on either side of the
    // wire, which is how the inline branch could answer with a completely
    // different envelope and stay green in both repositories.
    Object.freeze({
      id: 'evaluation-context',
      // GT-589 added optional `repoFacts` / `structuralFacts`. GT-594 added optional
      // `repoFacts.symbols[].structuralHash`/`structuralSize`, `repoFacts.errorMasking`
      // and `baselineRepoFacts`. Additive only in both cases, so a minor bump: a 1.0.0
      // consumer keeps validating against 1.2.0 payloads.
      version: '1.2.0',
      path: 'rulesets/schema/evaluation-context.schema.json',
      sha256: 'd62d557c6258ca6cc154e88850fd4879eb21d32dd3e4e9400aa25182c200cd69',
    }),
    Object.freeze({
      id: 'evaluation-result',
      // GT-589 added optional `repoFacts` / `structuralFacts`. Additive only, so a
      // minor bump: a 1.0.0 consumer keeps validating against 1.1.0 payloads.
      version: '1.1.0',
      path: 'rulesets/schema/evaluation-result.schema.json',
      sha256: 'b0cad39fb15f0dccd1adbcc0f59aa26aee2a0f9a13ad250ffe031db7a0875d9d',
    }),
  ]),
  supportedConsumers: Object.freeze([
    Object.freeze({
      consumer: 'evolith_tracker',
      repository: 'beyondnetcode/evolith_tracker',
      manifestPath: 'contracts/evolith-core-contracts.json',
      contractVersion: '1.0.0',
    }),
    Object.freeze({
      consumer: 'external',
      repository: null,
      manifestPath: null,
      contractVersion: '1.0.0',
    }),
  ]),
}) as MachineContractSet;

/**
 * sha256 hex over the canonical JSON of the schema descriptor list — the stable
 * fingerprint of the schema set an external consumer pins against. Recomputable,
 * so a drift test can detect any change to the advertised schemas.
 */
export const CONTRACT_SET_SHA256: string = sha256Hex(MACHINE_CONTRACT_SET.schemas);

/** Recompute the schema-set fingerprint from a set (for drift detection). */
export function contractSetFingerprint(set: MachineContractSet): string {
  return sha256Hex(set.schemas);
}

/** Logical consumer ids the contract set officially supports. */
export const SUPPORTED_CONSUMER_IDS: readonly string[] = Object.freeze(
  MACHINE_CONTRACT_SET.supportedConsumers.map((c) => c.consumer),
);
