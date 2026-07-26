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
      sha256: 'ea092910e12f771e840177e6f1ae6f305516847664ece6ef1f0a759699293253',
    }),
    Object.freeze({
      id: 'output-envelope',
      version: '1.0.0',
      path: 'rulesets/schema/output-envelope.schema.json',
      sha256: '099e70c6f496bac4e239074cda54f514a115980b4579345cdf2da359664f4a60',
    }),
    // GT-573: the `POST /api/v1/evaluate` request/response pair. Until now the
    // flagship integration had no published schema at all on either side of the
    // wire, which is how the inline branch could answer with a completely
    // different envelope and stay green in both repositories.
    Object.freeze({
      id: 'evaluation-context',
      version: '1.0.0',
      path: 'rulesets/schema/evaluation-context.schema.json',
      sha256: 'dfa2cd9f2e5757a9dcff2d0e0cfd5acc459bf9cca8fc85c586b2e70f92001ea6',
    }),
    Object.freeze({
      id: 'evaluation-result',
      version: '1.0.0',
      path: 'rulesets/schema/evaluation-result.schema.json',
      sha256: '37e64db0ac8049ffa6b12e91b43405af527cfca02ae7f90e5368d1b4d12dc9c7',
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
