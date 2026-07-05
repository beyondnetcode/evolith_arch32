import {
  SatelliteManifestSchema,
  parseSatelliteManifest,
  safeParseSatelliteManifest,
  SATELLITE_PHASE_VALUES,
  SATELLITE_TOPOLOGY_VALUES,
} from './satellite-manifest.schema';

describe('SatelliteManifestSchema (GT-359)', () => {
  describe('valid inputs', () => {
    it('accepts a minimal manifest with only satellitePath', () => {
      const result = SatelliteManifestSchema.safeParse({ satellitePath: '/path/to/sat' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.satellitePath).toBe('/path/to/sat');
        expect(result.data.corePath).toBeUndefined();
        expect(result.data.topology).toBeUndefined();
        expect(result.data.phase).toBeUndefined();
      }
    });

    it('accepts a full manifest with all fields', () => {
      const input = {
        satellitePath: '/sat',
        corePath: '/core',
        topology: 'modular-monolith',
        phase: 'discovery',
      };
      const result = SatelliteManifestSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(input);
      }
    });

    it('accepts canonical phase values', () => {
      for (const phase of SATELLITE_PHASE_VALUES) {
        const result = SatelliteManifestSchema.safeParse({ satellitePath: '/s', phase });
        expect(result.success).toBe(true);
      }
    });

    it('accepts canonical topology values', () => {
      for (const topology of SATELLITE_TOPOLOGY_VALUES) {
        const result = SatelliteManifestSchema.safeParse({ satellitePath: '/s', topology });
        expect(result.success).toBe(true);
      }
    });

    it('accepts custom topology strings (pipeline validates further)', () => {
      const result = SatelliteManifestSchema.safeParse({
        satellitePath: '/s',
        topology: 'my-custom-topology',
      });
      expect(result.success).toBe(true);
    });

    it('strips unknown extra keys', () => {
      const result = SatelliteManifestSchema.safeParse({
        satellitePath: '/s',
        unknownField: 'should-be-stripped',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect((result.data as Record<string, unknown>)['unknownField']).toBeUndefined();
      }
    });
  });

  describe('invalid inputs', () => {
    it('rejects missing satellitePath', () => {
      const result = SatelliteManifestSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it('rejects empty satellitePath', () => {
      const result = SatelliteManifestSchema.safeParse({ satellitePath: '' });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toMatch(/satellitePath is required/);
      }
    });

    it('rejects non-string satellitePath', () => {
      const result = SatelliteManifestSchema.safeParse({ satellitePath: 42 });
      expect(result.success).toBe(false);
    });

    it('rejects null as input', () => {
      const result = SatelliteManifestSchema.safeParse(null);
      expect(result.success).toBe(false);
    });
  });

  describe('parseSatelliteManifest()', () => {
    it('returns parsed data for a valid manifest', () => {
      const data = parseSatelliteManifest({ satellitePath: '/repo', topology: 'microservices' });
      expect(data.satellitePath).toBe('/repo');
      expect(data.topology).toBe('microservices');
    });

    it('throws ZodError for invalid input', () => {
      expect(() => parseSatelliteManifest({})).toThrow();
    });
  });

  describe('safeParseSatelliteManifest()', () => {
    it('returns success: true for valid input', () => {
      const result = safeParseSatelliteManifest({ satellitePath: '/repo' });
      expect(result.success).toBe(true);
    });

    it('returns success: false without throwing for invalid input', () => {
      const result = safeParseSatelliteManifest({ satellitePath: '' });
      expect(result.success).toBe(false);
      expect(() => safeParseSatelliteManifest({ satellitePath: '' })).not.toThrow();
    });
  });
});
