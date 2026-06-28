import {
  CANONICAL_TOPOLOGIES,
  TOPOLOGY_IDS,
  PROGRESSIVE_AXIS,
  isCanonicalTopology,
  isLegacyLevel,
  normalizeTopology,
  toLegacyLevel,
  toProgressivePhase,
} from './topology-catalog';

describe('topology-catalog', () => {
  it('defines the 8 canonical topologies', () => {
    expect(TOPOLOGY_IDS).toHaveLength(8);
    expect(TOPOLOGY_IDS).toEqual(
      expect.arrayContaining([
        'modular-monolith',
        'distributed-modules',
        'microservices',
        'serverless',
        'edge-computing',
        'event-driven',
        'data-mesh',
        'agentic-ai',
      ]),
    );
  });

  it('orders the progressive axis modular-monolith → distributed-modules → microservices', () => {
    expect(PROGRESSIVE_AXIS).toEqual(['modular-monolith', 'distributed-modules', 'microservices']);
  });

  it('tags every progressive-axis topology with the right dimension', () => {
    const axis = CANONICAL_TOPOLOGIES.filter((t) => t.dimension === 'progressive-axis');
    expect(axis.map((t) => t.id)).toEqual(PROGRESSIVE_AXIS);
  });

  describe('isCanonicalTopology / isLegacyLevel', () => {
    it('recognizes canonical ids', () => {
      expect(isCanonicalTopology('serverless')).toBe(true);
      expect(isCanonicalTopology('F1')).toBe(false);
      expect(isCanonicalTopology('nope')).toBe(false);
    });
    it('recognizes F1/F2/F3 (case-insensitive) only', () => {
      expect(isLegacyLevel('F2')).toBe(true);
      expect(isLegacyLevel('f3')).toBe(true);
      expect(isLegacyLevel('F4')).toBe(false);
      expect(isLegacyLevel('microservices')).toBe(false);
    });
  });

  describe('normalizeTopology', () => {
    it('returns canonical ids unchanged', () => {
      expect(normalizeTopology('event-driven')).toBe('event-driven');
    });
    it('maps legacy F1/F2/F3 to the progressive axis', () => {
      expect(normalizeTopology('F1')).toBe('modular-monolith');
      expect(normalizeTopology('f2')).toBe('distributed-modules');
      expect(normalizeTopology('F3')).toBe('microservices');
    });
    it('returns null for unknown input', () => {
      expect(normalizeTopology('nonsense')).toBeNull();
    });
  });

  describe('toLegacyLevel', () => {
    it('maps progressive-axis ids and F1/F2/F3 to the level', () => {
      expect(toLegacyLevel('modular-monolith')).toBe('F1');
      expect(toLegacyLevel('microservices')).toBe('F3');
      expect(toLegacyLevel('F2')).toBe('F2');
    });
    it('returns null off the progressive axis', () => {
      expect(toLegacyLevel('serverless')).toBeNull();
      expect(toLegacyLevel('agentic-ai')).toBeNull();
    });
  });

  describe('toProgressivePhase', () => {
    it('accepts phase numbers, canonical ids and legacy levels', () => {
      expect(toProgressivePhase('1')).toBe('1');
      expect(toProgressivePhase('distributed-modules')).toBe('2');
      expect(toProgressivePhase('F3')).toBe('3');
    });
    it('returns null off the progressive axis', () => {
      expect(toProgressivePhase('data-mesh')).toBeNull();
      expect(toProgressivePhase('9')).toBeNull();
    });
  });
});
