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
  // GT-660 — bumped deliberately: the surface gained an OPERATION, not just an
  // argument. `evolith-ruleset-list` (MCP) and `evolith rulesets` (CLI) publish
  // the menu that `select` has been referring to since GT-659, so the
  // per-operation schema catalog grows and both fingerprints move with it.
  //
  // Previous, for the record: GT-659 pinned
  //   operations 5f5d6e35…, manifest f5929804…
  // when `evolith-validate` gained its `select` argument.
  //
  // A pinned hash exists so a surface contract cannot move without somebody
  // saying so in a commit. Both values below were read off a FRESH build: the
  // suite is green against a stale `dist` and red against a rebuilt one, which
  // is how GT-659 nearly shipped the wrong pair.
  // GT-677 — re-pinned for an ARGUMENT, not an operation: `evolith-evaluate` gained an
  // optional `waiverStore` (the MCP surface now READS the same waiver store the CLI
  // writes, so an approved waiver suppresses a finding on both). The operation count is
  // unchanged at 52; only that tool's inputSchema grew, which is exactly what
  // `operationsSha256` exists to detect — the same re-pin GT-659 made when
  // `evolith-validate` gained `select`.
  //
  // Previous, for the record: GT-660 pinned
  //   operations 7ae01e03…, manifest 1ca58a31…
  // when `evolith-ruleset-list` was added as the 52nd operation.
  //
  // Both values below were read off a FRESH build (`rm tsconfig.tsbuildinfo` + rebuild of
  // core-domain/mcp, then `node .harness/scripts/generate-capability-operations.mjs`):
  // this suite is green against a stale `dist` and red against a rebuilt one.
  operationsSha256: 'e557b65205ef2a3c33d322a4649585809cd61237ddd6ddb3b66df41499ef59cf',
  sha256: '51da6f3f06e68878655d19ad2fe6805ff837a0a57f656f6fd6ab319faa24bf68',
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
