import {
  isCanonicalPhaseId,
  normalizePhaseId,
  toLegacyPhaseId,
  CANONICAL_PHASE_IDS,
} from './phase-id';

describe('phase-id', () => {
  describe('CANONICAL_PHASE_IDS', () => {
    it('has 5 phases in lifecycle order', () => {
      expect(CANONICAL_PHASE_IDS).toEqual([
        'discovery', 'design', 'construction', 'qa', 'release',
      ]);
    });
  });

  describe('isCanonicalPhaseId', () => {
    it('returns true for canonical ids', () => {
      expect(isCanonicalPhaseId('discovery')).toBe(true);
      expect(isCanonicalPhaseId('design')).toBe(true);
      expect(isCanonicalPhaseId('construction')).toBe(true);
      expect(isCanonicalPhaseId('qa')).toBe(true);
      expect(isCanonicalPhaseId('release')).toBe(true);
    });

    it('returns false for non-canonical ids', () => {
      expect(isCanonicalPhaseId('f1')).toBe(false);
      expect(isCanonicalPhaseId('phase-1')).toBe(false);
      expect(isCanonicalPhaseId('invalid')).toBe(false);
    });
  });

  describe('normalizePhaseId', () => {
    it('accepts canonical ids', () => {
      expect(normalizePhaseId('discovery')).toBe('discovery');
      expect(normalizePhaseId('design')).toBe('design');
      expect(normalizePhaseId('construction')).toBe('construction');
      expect(normalizePhaseId('qa')).toBe('qa');
      expect(normalizePhaseId('release')).toBe('release');
    });

    it('accepts legacy f-ids (f1..f5)', () => {
      expect(normalizePhaseId('f1')).toBe('discovery');
      expect(normalizePhaseId('f2')).toBe('design');
      expect(normalizePhaseId('f3')).toBe('construction');
      expect(normalizePhaseId('f4')).toBe('qa');
      expect(normalizePhaseId('f5')).toBe('release');
    });

    it('accepts gate-f ids', () => {
      expect(normalizePhaseId('gate-f1')).toBe('discovery');
      expect(normalizePhaseId('gate-f3')).toBe('construction');
    });

    it('accepts phase-f ids', () => {
      expect(normalizePhaseId('phase-f1')).toBe('discovery');
      expect(normalizePhaseId('phase-f5')).toBe('release');
    });

    it('accepts phase-N ids', () => {
      expect(normalizePhaseId('phase-1')).toBe('discovery');
      expect(normalizePhaseId('phase-5')).toBe('release');
    });

    it('accepts bare numeric ids', () => {
      expect(normalizePhaseId('1')).toBe('discovery');
      expect(normalizePhaseId('5')).toBe('release');
    });

    it('returns undefined for unknown input', () => {
      expect(normalizePhaseId('invalid')).toBeUndefined();
      expect(normalizePhaseId('phase-0')).toBeUndefined();
      expect(normalizePhaseId('f6')).toBeUndefined();
    });

    it('is case-insensitive', () => {
      expect(normalizePhaseId('DISCOVERY')).toBe('discovery');
      expect(normalizePhaseId('Discovery')).toBe('discovery');
    });

    it('trims whitespace', () => {
      expect(normalizePhaseId('  design  ')).toBe('design');
    });
  });

  describe('toLegacyPhaseId', () => {
    it('converts canonical to legacy f-id', () => {
      expect(toLegacyPhaseId('discovery')).toBe('f1');
      expect(toLegacyPhaseId('design')).toBe('f2');
      expect(toLegacyPhaseId('construction')).toBe('f3');
      expect(toLegacyPhaseId('qa')).toBe('f4');
      expect(toLegacyPhaseId('release')).toBe('f5');
    });

    it('converts any accepted input to legacy f-id', () => {
      expect(toLegacyPhaseId('f1')).toBe('f1');
      expect(toLegacyPhaseId('gate-f3')).toBe('f3');
      expect(toLegacyPhaseId('phase-5')).toBe('f5');
    });

    it('returns undefined for unknown input', () => {
      expect(toLegacyPhaseId('invalid')).toBeUndefined();
    });
  });
});
