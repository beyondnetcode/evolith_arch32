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
    expect(live).toEqual(EXPECTED_CAPABILITY_MANIFEST);
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
