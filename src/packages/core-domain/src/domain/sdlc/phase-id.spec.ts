import {
  CANONICAL_PHASE_IDS,
  isCanonicalPhaseId,
  normalizePhaseId,
  toLegacyPhaseId,
} from './phase-id';

describe('GT-343 canonical PhaseId', () => {
  it('exposes the 5 canonical SDLC phase ids in order', () => {
    expect(CANONICAL_PHASE_IDS).toEqual(['discovery', 'design', 'construction', 'qa', 'release']);
  });

  it('normalizes legacy f1..f5 to canonical', () => {
    expect(normalizePhaseId('f1')).toBe('discovery');
    expect(normalizePhaseId('f2')).toBe('design');
    expect(normalizePhaseId('f3')).toBe('construction');
    expect(normalizePhaseId('f4')).toBe('qa');
    expect(normalizePhaseId('f5')).toBe('release');
  });

  it('accepts canonical ids, gate-f*, phase-* and bare numbers', () => {
    expect(normalizePhaseId('discovery')).toBe('discovery');
    expect(normalizePhaseId('DISCOVERY')).toBe('discovery');
    expect(normalizePhaseId('gate-f2')).toBe('design');
    expect(normalizePhaseId('phase-3')).toBe('construction');
    expect(normalizePhaseId('phase-f4')).toBe('qa');
    expect(normalizePhaseId('5')).toBe('release');
  });

  it('rejects unknown input and phase-0 (workflow foundation, not an SDLC gate phase)', () => {
    expect(normalizePhaseId('phase-0')).toBeUndefined();
    expect(normalizePhaseId('f6')).toBeUndefined();
    expect(normalizePhaseId('bogus')).toBeUndefined();
  });

  it('maps any accepted input back to the legacy on-disk f-id', () => {
    expect(toLegacyPhaseId('discovery')).toBe('f1');
    expect(toLegacyPhaseId('release')).toBe('f5');
    expect(toLegacyPhaseId('f3')).toBe('f3');
    expect(toLegacyPhaseId('phase-2')).toBe('f2');
    expect(toLegacyPhaseId('nope')).toBeUndefined();
  });

  it('isCanonicalPhaseId only accepts canonical ids', () => {
    expect(isCanonicalPhaseId('discovery')).toBe(true);
    expect(isCanonicalPhaseId('f1')).toBe(false);
  });
});
