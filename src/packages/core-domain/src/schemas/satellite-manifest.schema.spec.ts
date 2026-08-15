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

  /**
   * GT-688 — the composition must survive the PARSER, not merely the TypeScript
   * type. `.strip()` is Zod's default and the MCP surface parses before running,
   * so a field declared only on the interface is dropped in silence on that path
   * while core-domain stays green — the exact hole GT-380 L1c (`facts`) and
   * GT-584 (`qualityEvidence`) fell into.
   */
  describe('topologies (GT-688)', () => {
    it('round-trips a composition through the parser', () => {
      const result = safeParseSatelliteManifest({
        satellitePath: '/s',
        topology: 'modular-monolith',
        topologies: ['modular-monolith', 'agentic-ai'],
      });
      expect(result.success).toBe(true);
      expect(result.data?.topologies).toHaveLength(2);
      expect(result.data?.topologies).toEqual(['modular-monolith', 'agentic-ai']);
      // The scalar is the PRIMARY member and is preserved alongside it.
      expect(result.data?.topology).toBe('modular-monolith');
    });

    it('stays optional — a scalar-only manifest is unchanged', () => {
      const result = safeParseSatelliteManifest({ satellitePath: '/s', topology: 'serverless' });
      expect(result.success).toBe(true);
      expect(result.data?.topologies).toBeUndefined();
    });

    it('rejects a non-string member rather than stripping the field', () => {
      const result = safeParseSatelliteManifest({ satellitePath: '/s', topologies: [42] });
      expect(result.success).toBe(false);
    });
  });
});
