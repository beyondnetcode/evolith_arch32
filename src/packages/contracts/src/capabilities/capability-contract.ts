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
  sha256: '8f5a75c912287ab182484b90e69272723b2fa83184778458eaee5028ec8f2d16',
}) as CapabilityManifestShape;

/**
 * Recompute the fingerprint of a manifest EXCLUDING its own `sha256`, exactly as
 * the domain does. A parity check compares this against `manifest.sha256`.
 */
export function capabilityManifestFingerprint(manifest: CapabilityManifestShape): string {
  const { sha256: _ignored, ...content } = manifest;
  void _ignored;
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

  const scalarKeys = ['name', 'version', 'schemaVersion', 'sha256'] as const;
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
