import {
  Verdict,
  fromLegacyGateEvidence,
  fromLegacyGateDecision,
  toLegacyGateEvidence,
  makeVerdictRecord,
  isVerdict,
  VERDICT_VALUES,
} from './verdict';

describe('Verdict', () => {
  describe('enum values', () => {
    it('has four canonical values', () => {
      expect(VERDICT_VALUES).toEqual(['PASS', 'FAIL', 'WAIVE', 'SKIP']);
    });
  });

  describe('isVerdict()', () => {
    it('returns true for valid verdicts', () => {
      expect(isVerdict('PASS')).toBe(true);
      expect(isVerdict('FAIL')).toBe(true);
      expect(isVerdict('WAIVE')).toBe(true);
      expect(isVerdict('SKIP')).toBe(true);
    });

    it('returns false for invalid strings', () => {
      expect(isVerdict('passed')).toBe(false);
      expect(isVerdict('WAIVED')).toBe(false);
      expect(isVerdict('')).toBe(false);
    });
  });

  describe('fromLegacyGateEvidence()', () => {
    it("maps 'passed' → PASS", () => {
      expect(fromLegacyGateEvidence('passed')).toBe(Verdict.PASS);
    });

    it("maps 'failed' → FAIL", () => {
      expect(fromLegacyGateEvidence('failed')).toBe(Verdict.FAIL);
    });

    it("maps 'skipped' → SKIP", () => {
      expect(fromLegacyGateEvidence('skipped')).toBe(Verdict.SKIP);
    });
  });

  describe('fromLegacyGateDecision()', () => {
    it("maps 'PASS' → PASS", () => {
      expect(fromLegacyGateDecision('PASS')).toBe(Verdict.PASS);
    });

    it("maps 'FAIL' → FAIL", () => {
      expect(fromLegacyGateDecision('FAIL')).toBe(Verdict.FAIL);
    });

    it("maps 'WAIVED' → WAIVE", () => {
      expect(fromLegacyGateDecision('WAIVED')).toBe(Verdict.WAIVE);
    });
  });

  describe('toLegacyGateEvidence()', () => {
    it('maps PASS → passed', () => {
      expect(toLegacyGateEvidence(Verdict.PASS)).toBe('passed');
    });

    it('maps FAIL → failed', () => {
      expect(toLegacyGateEvidence(Verdict.FAIL)).toBe('failed');
    });

    it('maps WAIVE → skipped (closest legacy equivalent)', () => {
      expect(toLegacyGateEvidence(Verdict.WAIVE)).toBe('skipped');
    });

    it('maps SKIP → skipped', () => {
      expect(toLegacyGateEvidence(Verdict.SKIP)).toBe('skipped');
    });
  });

  describe('makeVerdictRecord()', () => {
    it('produces a record with ISO decidedAt', () => {
      const record = makeVerdictRecord(Verdict.PASS, 'agent');
      expect(record.verdict).toBe(Verdict.PASS);
      expect(record.decidedBy).toBe('agent');
      expect(record.decidedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it('includes optional reason', () => {
      const reason = { code: 'LOW_SCORE', message: 'Score below threshold' };
      const record = makeVerdictRecord(Verdict.FAIL, 'ci', reason);
      expect(record.reason).toEqual(reason);
    });
  });
});
