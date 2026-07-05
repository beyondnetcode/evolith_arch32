import {
  CANONICAL_TOPOLOGIES,
  TOPOLOGY_IDS,
  PROGRESSIVE_AXIS,
  isCanonicalTopology,
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

  describe('isCanonicalTopology', () => {
    it('recognizes canonical ids only', () => {
      expect(isCanonicalTopology('serverless')).toBe(true);
      expect(isCanonicalTopology('F1')).toBe(false);
      expect(isCanonicalTopology('nope')).toBe(false);
    });
  });

  describe('normalizeTopology', () => {
    it('returns canonical ids unchanged (trimmed)', () => {
      expect(normalizeTopology('event-driven')).toBe('event-driven');
      expect(normalizeTopology('  microservices  ')).toBe('microservices');
    });
    it('returns null for legacy F1/F2/F3 and unknown input', () => {
      expect(normalizeTopology('F1')).toBeNull();
      expect(normalizeTopology('f2')).toBeNull();
      expect(normalizeTopology('nonsense')).toBeNull();
    });
  });

  describe('toLegacyLevel', () => {
    it('maps canonical progressive-axis ids to the internal level', () => {
      expect(toLegacyLevel('modular-monolith')).toBe('F1');
      expect(toLegacyLevel('distributed-modules')).toBe('F2');
      expect(toLegacyLevel('microservices')).toBe('F3');
    });
    it('returns null off the progressive axis and for F1/F2/F3 input', () => {
      expect(toLegacyLevel('serverless')).toBeNull();
      expect(toLegacyLevel('agentic-ai')).toBeNull();
      expect(toLegacyLevel('F2')).toBeNull();
    });
  });

  describe('toProgressivePhase', () => {
    it('accepts phase numbers and canonical progressive-axis ids', () => {
      expect(toProgressivePhase('1')).toBe('1');
      expect(toProgressivePhase('distributed-modules')).toBe('2');
      expect(toProgressivePhase('microservices')).toBe('3');
    });
    it('returns null off the progressive axis and for F1/F2/F3 input', () => {
      expect(toProgressivePhase('data-mesh')).toBeNull();
      expect(toProgressivePhase('9')).toBeNull();
      expect(toProgressivePhase('F3')).toBeNull();
    });
  });
});
