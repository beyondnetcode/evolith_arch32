import { makeCoreGateVerdict, makeGateDecision, migrateLegacyGateDecision } from './gate-decision';
import { Verdict } from '../../domain/verdict/verdict';

describe('makeCoreGateVerdict (GT-376, renamed from makeGateDecision)', () => {
  it('should return PASS when score >= 80 and no violations', () => {
    const d = makeCoreGateVerdict('gate-1', 1, 90, []);
    expect(d.verdict).toBe('PASS');
  });
  it('should return FAIL when violations present', () => {
    const d = makeCoreGateVerdict('gate-1', 1, 90, ['missing artifact']);
    expect(d.verdict).toBe('FAIL');
  });
  it('should return FAIL when score < 80', () => {
    const d = makeCoreGateVerdict('gate-1', 1, 70, []);
    expect(d.verdict).toBe('FAIL');
  });
  it('keeps the deprecated makeGateDecision alias working', () => {
    expect(makeGateDecision).toBe(makeCoreGateVerdict);
    expect(makeGateDecision('gate-1', 1, 90, []).verdict).toBe('PASS');
  });
  it("migrates legacy 'WAIVED' to canonical Verdict.WAIVE", () => {
    const migrated = migrateLegacyGateDecision({
      gateId: 'gate-1', phase: 1, score: 80, violations: [], decidedAt: '2026-06-28T00:00:00.000Z', decidedBy: 'system', verdict: 'WAIVED',
    });
    expect(migrated.verdict).toBe(Verdict.WAIVE);
  });
});
