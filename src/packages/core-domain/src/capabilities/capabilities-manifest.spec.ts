/**
 * Tests for the versioned capability manifest (GT-513 · EAG-06).
 *
 * AC1 (content): the manifest advertises the Core's identity, schema version,
 *   evaluation kinds, engines, surfaces and supported consumers.
 * AC2 (versioning): SemVer `version` + a stable, self-consistent sha256.
 * AC3 (parity fails on drift): recomputing the fingerprint after mutating any
 *   capability field no longer matches the original sha256.
 */

import { EVALUATION_RESULT_SCHEMA_VERSION } from '../evaluation/contracts/evaluation-result';
import {
  buildCapabilityManifest,
  capabilityManifestFingerprint,
  isSemVer,
  type CapabilityManifest,
} from './capabilities-manifest';

const SEMVER_RE = /^\d+\.\d+\.\d+(?:[-+].+)?$/;
const HEX64_RE = /^[0-9a-f]{64}$/;

describe('buildCapabilityManifest — content (AC1)', () => {
  const manifest = buildCapabilityManifest();

  it('names the Core and pins the evaluation schema version', () => {
    expect(manifest.name).toBe('evolith-core');
    expect(manifest.schemaVersion).toBe(EVALUATION_RESULT_SCHEMA_VERSION);
  });

  it('exposes a SemVer manifest version', () => {
    expect(manifest.version).toMatch(SEMVER_RE);
    expect(isSemVer(manifest.version)).toBe(true);
  });

  it('lists non-empty evaluation kinds, engines and surfaces', () => {
    expect(manifest.evaluationKinds.length).toBeGreaterThan(0);
    expect(manifest.engines.length).toBeGreaterThan(0);
    expect(manifest.surfaces.length).toBeGreaterThan(0);
  });

  it('covers the known evaluation kinds and engines', () => {
    expect(manifest.evaluationKinds).toEqual(
      expect.arrayContaining(['gate', 'architecture', 'design', 'phaseArtifacts']),
    );
    expect(manifest.engines).toEqual(expect.arrayContaining(['native', 'opa']));
    expect(manifest.surfaces).toEqual(expect.arrayContaining(['rest', 'cli', 'mcp']));
  });

  it('supports evolith_tracker and an external consumer (fixes single-consumer gap)', () => {
    expect(manifest.supportedConsumers).toContain('evolith_tracker');
    expect(manifest.supportedConsumers).toContain('external');
  });
});

describe('capability manifest fingerprint — versioning (AC2)', () => {
  it('sha256 is a 64-hex string', () => {
    expect(buildCapabilityManifest().sha256).toMatch(HEX64_RE);
  });

  it('sha256 is stable across calls (deterministic)', () => {
    const a = buildCapabilityManifest();
    const b = buildCapabilityManifest();
    expect(a.sha256).toBe(b.sha256);
  });

  it('fingerprint is self-consistent with the manifest sha256', () => {
    const manifest = buildCapabilityManifest();
    expect(capabilityManifestFingerprint(manifest)).toBe(manifest.sha256);
  });

  it('rejects a non-SemVer version override', () => {
    expect(() => buildCapabilityManifest({ version: 'v1' })).toThrow(RangeError);
    expect(() => buildCapabilityManifest({ version: '1.0' })).toThrow(RangeError);
  });

  it('a different manifest version yields a different fingerprint', () => {
    const base = buildCapabilityManifest();
    const next = buildCapabilityManifest({ version: '2.0.0' });
    expect(next.sha256).not.toBe(base.sha256);
  });
});

describe('capability manifest parity — fails on drift (AC3)', () => {
  const original = buildCapabilityManifest();

  it('detects an added evaluation kind', () => {
    const mutated: CapabilityManifest = {
      ...original,
      evaluationKinds: [...original.evaluationKinds, 'ghostKind'],
    };
    expect(capabilityManifestFingerprint(mutated)).not.toBe(original.sha256);
  });

  it('detects an added engine', () => {
    const mutated: CapabilityManifest = {
      ...original,
      engines: [...original.engines, 'rego-v2'],
    };
    expect(capabilityManifestFingerprint(mutated)).not.toBe(original.sha256);
  });

  it('detects a changed supported-consumer list', () => {
    const mutated: CapabilityManifest = {
      ...original,
      supportedConsumers: ['evolith_tracker'],
    };
    expect(capabilityManifestFingerprint(mutated)).not.toBe(original.sha256);
  });

  it('detects a changed schema version', () => {
    const mutated: CapabilityManifest = { ...original, schemaVersion: '9.9.9' };
    expect(capabilityManifestFingerprint(mutated)).not.toBe(original.sha256);
  });

  it('ignores the sha256 field itself when fingerprinting (stable identity)', () => {
    const tampered: CapabilityManifest = { ...original, sha256: 'deadbeef' };
    // Only sha256 changed → recomputed fingerprint still matches the real content.
    expect(capabilityManifestFingerprint(tampered)).toBe(original.sha256);
  });
});
