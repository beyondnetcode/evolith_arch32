/**
 * Contract-parity: the package's declared capability contract vs the LIVE
 * producer (GT-513 · EAG-06). `buildCapabilityManifest` from the Core domain is
 * exactly what `GET /api/v1/capabilities` returns (bound by the core-api
 * `CapabilitiesController` spec), so asserting parity here fails the build on any
 * drift between `@beyondnet/evolith-contracts` and the live endpoint.
 */

import {
  buildCapabilityManifest,
  type CapabilityManifest,
} from '@beyondnet/evolith-core-domain/capabilities/capabilities-manifest';

import {
  EXPECTED_CAPABILITY_MANIFEST,
  assertCapabilityManifestParity,
  capabilityManifestFingerprint,
  checkCapabilityManifestParity,
  type CapabilityManifestShape,
} from './capability-contract';

describe('capability manifest contract parity', () => {
  const live = buildCapabilityManifest() as CapabilityManifest & CapabilityManifestShape;

  it('the live manifest deep-equals the package-declared snapshot', () => {
    // GT-583 — `operations` (fifty operation schemas) is pinned by its
    // fingerprint, not embedded, so it is compared through `operationsSha256`
    // by the assertion below rather than duplicated into this package.
    const { operations: _operations, ...liveWithoutOperations } = live;
    void _operations;
    expect(liveWithoutOperations).toEqual(EXPECTED_CAPABILITY_MANIFEST);
  });

  it('the live per-operation catalog is real and matches the pinned fingerprint', () => {
    // Anti-vacuous: an EMPTY catalog would also "match a fingerprint" — of
    // nothing. The per-operation contract is the point of GT-583, so its
    // presence is asserted before its fingerprint.
    expect(live.operations.length).toBeGreaterThanOrEqual(40);
    expect(live.operationsSha256).toBe(EXPECTED_CAPABILITY_MANIFEST.operationsSha256);
    for (const op of live.operations) {
      expect(typeof op.name).toBe('string');
      expect(op.inputSchema).toBeDefined();
      expect(op.outputSchema).toBeDefined();
    }
  });

  it('FAILS when a single operation schema changes', () => {
    const tampered = live.operations.map((op, i) =>
      i === 0 ? { ...op, inputSchema: { ...op.inputSchema, properties: {} } } : op,
    );
    const drifted = buildCapabilityManifest({ operations: tampered });
    expect(drifted.operationsSha256).not.toBe(EXPECTED_CAPABILITY_MANIFEST.operationsSha256);
    const result = checkCapabilityManifestParity(drifted as unknown as CapabilityManifestShape);
    expect(result.ok).toBe(false);
    expect(result.mismatches.join('\n')).toContain('operationsSha256');
  });

  it('the declared snapshot sha256 matches its own recomputed fingerprint', () => {
    expect(capabilityManifestFingerprint(EXPECTED_CAPABILITY_MANIFEST)).toBe(
      EXPECTED_CAPABILITY_MANIFEST.sha256,
    );
  });

  it('the live manifest sha256 matches the package fingerprint algorithm', () => {
    expect(capabilityManifestFingerprint(live)).toBe(live.sha256);
    expect(live.sha256).toBe(EXPECTED_CAPABILITY_MANIFEST.sha256);
  });

  it('checkCapabilityManifestParity reports OK for the live manifest', () => {
    const result = checkCapabilityManifestParity(live);
    expect(result.mismatches).toEqual([]);
    expect(result.ok).toBe(true);
  });

  it('assertCapabilityManifestParity does not throw for the live manifest', () => {
    expect(() => assertCapabilityManifestParity(live)).not.toThrow();
  });

  it('FAILS (throws with a precise reason) when a capability drifts', () => {
    const drifted: CapabilityManifestShape = {
      ...EXPECTED_CAPABILITY_MANIFEST,
      engines: [...EXPECTED_CAPABILITY_MANIFEST.engines, 'ghost-engine'],
    };
    const result = checkCapabilityManifestParity(drifted);
    expect(result.ok).toBe(false);
    expect(result.mismatches.join('\n')).toContain('engines');
    expect(() => assertCapabilityManifestParity(drifted)).toThrow(/drift/i);
  });

  it('FAILS when the supported-consumer set drifts (single-consumer regression)', () => {
    const regressed: CapabilityManifestShape = {
      ...EXPECTED_CAPABILITY_MANIFEST,
      supportedConsumers: ['evolith_tracker'],
    };
    const result = checkCapabilityManifestParity(regressed);
    expect(result.ok).toBe(false);
    expect(result.mismatches.join('\n')).toContain('supportedConsumers');
  });
});
