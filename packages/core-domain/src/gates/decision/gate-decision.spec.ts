import { makeGateDecision } from './gate-decision';

describe('makeGateDecision', () => {
  it('should return PASS when score >= 80 and no violations', () => {
    const d = makeGateDecision('gate-1', 1, 90, []);
    expect(d.verdict).toBe('PASS');
  });
  it('should return FAIL when violations present', () => {
    const d = makeGateDecision('gate-1', 1, 90, ['missing artifact']);
    expect(d.verdict).toBe('FAIL');
  });
  it('should return FAIL when score < 80', () => {
    const d = makeGateDecision('gate-1', 1, 70, []);
    expect(d.verdict).toBe('FAIL');
  });
});
