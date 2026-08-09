/**
 * The declared capability contract an external consumer can pin against
 * (GT-513 · EAG-06 — Stable API + capabilities manifest).
 *
 * `EXPECTED_CAPABILITY_MANIFEST` is a frozen snapshot of exactly what
 * `GET /api/v1/capabilities` (backed by the domain's `buildCapabilityManifest`)
 * must return for the pinned contract version. The package is standalone — it
 * does NOT import the Core domain — so a non-Tracker consumer gets the stable
 * contract without pulling the engine. The monorepo's contract-parity tests
 * compare the LIVE manifest against this snapshot and FAIL on any drift, which
 * forces a package (and SemVer) bump whenever the Core's capabilities change.
 */

import { sha256Hex } from '../schemas/contract-hash';
import { CONTRACTS_PACKAGE_VERSION, SUPPORTED_CONSUMER_IDS } from '../schemas/machine-contract-set';

/**
 * Structural shape of the versioned capability manifest. Mirrors the domain's
 * `CapabilityManifest` without importing it, so the contract is self-contained.
 */
export interface CapabilityManifestShape {
  readonly name: 'evolith-core';
  readonly version: string;
  readonly schemaVersion: string;
  readonly evaluationKinds: readonly string[];
  readonly engines: readonly string[];
  readonly surfaces: readonly string[];
  readonly supportedConsumers: readonly string[];
  /**
   * GT-583 — sha256 of the manifest's per-operation schema catalog
   * (`inputSchema`/`outputSchema` for every governed operation).
   *
   * The catalog itself is fifty operations of JSON Schema and is deliberately
   * NOT embedded here: a contract package a consumer pins should stay small.
   * Pinning the fingerprint is equivalent — any change to any operation schema
   * changes it — and it is what the manifest's own `sha256` folds in on the
   * catalog's behalf, which is why `operations` is excluded from the manifest
   * fingerprint on both sides.
   */
  readonly operationsSha256: string;
  readonly sha256: string;
}

/**
 * The frozen expected manifest for {@link CONTRACTS_PACKAGE_VERSION}. Its
 * `sha256` is the canonical fingerprint the live endpoint must reproduce.
 */
export const EXPECTED_CAPABILITY_MANIFEST: CapabilityManifestShape = Object.freeze({
  name: 'evolith-core',
  version: CONTRACTS_PACKAGE_VERSION,
  schemaVersion: '1.0.0',
  evaluationKinds: Object.freeze([
    'gate',
    'artifact',
    'evidence',
    'architecture',
    'blueprint',
    'topology',
    'checkpoint',
    'deployment',
    'compliance',
    'design',
    'phaseArtifacts',
  ]),
  engines: Object.freeze(['native', 'opa', 'enforcer']),
  surfaces: Object.freeze(['rest', 'cli', 'mcp']),
  supportedConsumers: Object.freeze([...SUPPORTED_CONSUMER_IDS]),
  // GT-659 — bumped deliberately: `evolith-validate` gained a `select` argument
  // (the catalogue-based ruleset selection), which changes the per-operation
  // schema catalog and therefore this fingerprint. A pinned hash exists so that a
  // surface contract cannot move without somebody saying so in a commit.
  operationsSha256: '5f5d6e353e8ff089bc44e04ba0d90aec9b7a4b0ef02ba31217c369566defec27',
  sha256: 'f592980416ac91ee1db652eff1af28aa368449a9b7af26322c89edea794b6939',
}) as CapabilityManifestShape;

/**
 * Recompute the fingerprint of a manifest EXCLUDING its own `sha256` and its
 * `operations` array, exactly as the domain does. A parity check compares this
 * against `manifest.sha256`.
 *
 * GT-583 — `operations` is excluded because `operationsSha256` (which IS
 * hashed) covers it. That is what lets a live manifest carrying fifty operation
 * schemas and this package's compact snapshot produce the same fingerprint.
 */
export function capabilityManifestFingerprint(
  manifest: CapabilityManifestShape & { operations?: unknown },
): string {
  const { sha256: _ignored, operations: _operations, ...content } = manifest;
  void _ignored;
  void _operations;
  return sha256Hex(content);
}

/** Structured result of a capability-manifest parity check. */
export interface ManifestParityResult {
  readonly ok: boolean;
  /** Human-readable mismatch reasons; empty when `ok`. */
  readonly mismatches: readonly string[];
}

/**
 * Compare a LIVE capability manifest (as served by `GET /api/v1/capabilities`)
 * against the package's declared {@link EXPECTED_CAPABILITY_MANIFEST}. Returns a
 * list of every field that drifted, plus a self-consistency check that the live
 * `sha256` matches its own recomputed fingerprint.
 */
export function checkCapabilityManifestParity(
  live: CapabilityManifestShape,
): ManifestParityResult {
  const mismatches: string[] = [];
  const expected = EXPECTED_CAPABILITY_MANIFEST;

  const scalarKeys = ['name', 'version', 'schemaVersion', 'operationsSha256', 'sha256'] as const;
  for (const key of scalarKeys) {
    if (live[key] !== expected[key]) {
      mismatches.push(`${key}: expected "${expected[key]}", got "${live[key]}"`);
    }
  }

  const listKeys = [
    'evaluationKinds',
    'engines',
    'surfaces',
    'supportedConsumers',
  ] as const;
  for (const key of listKeys) {
    const e = JSON.stringify(expected[key]);
    const l = JSON.stringify(live[key]);
    if (e !== l) {
      mismatches.push(`${key}: expected ${e}, got ${l}`);
    }
  }

  const recomputed = capabilityManifestFingerprint(live);
  if (recomputed !== live.sha256) {
    mismatches.push(
      `sha256 self-consistency: manifest declares "${live.sha256}" but content hashes to "${recomputed}"`,
    );
  }

  return { ok: mismatches.length === 0, mismatches };
}

/**
 * Assert parity or throw with every mismatch. Used by contract-parity tests to
 * fail loudly on drift between the package and the live endpoint.
 */
export function assertCapabilityManifestParity(live: CapabilityManifestShape): void {
  const { ok, mismatches } = checkCapabilityManifestParity(live);
  if (!ok) {
    throw new Error(
      `Capability manifest drift vs @beyondnet/evolith-contracts@${CONTRACTS_PACKAGE_VERSION}:\n  - ${mismatches.join('\n  - ')}`,
    );
  }
}
