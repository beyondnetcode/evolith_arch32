import {
  Verdict,
  VERDICT_VALUES,
  isVerdict,
  fromLegacyGateEvidence,
  fromLegacyGateDecision,
  toLegacyGateEvidence,
  makeVerdictRecord,
} from './verdict';

describe('verdict', () => {
  describe('Verdict enum', () => {
    it('has 4 values', () => {
      expect(VERDICT_VALUES).toHaveLength(4);
    });

    it('contains PASS, FAIL, WAIVE, SKIP', () => {
      expect(VERDICT_VALUES).toContain(Verdict.PASS);
      expect(VERDICT_VALUES).toContain(Verdict.FAIL);
      expect(VERDICT_VALUES).toContain(Verdict.WAIVE);
      expect(VERDICT_VALUES).toContain(Verdict.SKIP);
    });
  });

  describe('isVerdict', () => {
    it('returns true for valid verdict strings', () => {
      expect(isVerdict('PASS')).toBe(true);
      expect(isVerdict('FAIL')).toBe(true);
      expect(isVerdict('WAIVE')).toBe(true);
      expect(isVerdict('SKIP')).toBe(true);
    });

    it('returns false for invalid strings', () => {
      expect(isVerdict('pass')).toBe(false);
      expect(isVerdict('unknown')).toBe(false);
      expect(isVerdict('')).toBe(false);
    });
  });

  describe('fromLegacyGateEvidence', () => {
    it('converts passed to PASS', () => {
      expect(fromLegacyGateEvidence('passed')).toBe(Verdict.PASS);
    });

    it('converts failed to FAIL', () => {
      expect(fromLegacyGateEvidence('failed')).toBe(Verdict.FAIL);
    });

    it('converts skipped to SKIP', () => {
      expect(fromLegacyGateEvidence('skipped')).toBe(Verdict.SKIP);
    });
  });

  describe('fromLegacyGateDecision', () => {
    it('converts PASS to PASS', () => {
      expect(fromLegacyGateDecision('PASS')).toBe(Verdict.PASS);
    });

    it('converts FAIL to FAIL', () => {
      expect(fromLegacyGateDecision('FAIL')).toBe(Verdict.FAIL);
    });

    it('converts WAIVED to WAIVE', () => {
      expect(fromLegacyGateDecision('WAIVED')).toBe(Verdict.WAIVE);
    });
  });

  describe('toLegacyGateEvidence', () => {
    it('converts PASS to passed', () => {
      expect(toLegacyGateEvidence(Verdict.PASS)).toBe('passed');
    });

    it('converts FAIL to failed', () => {
      expect(toLegacyGateEvidence(Verdict.FAIL)).toBe('failed');
    });

    it('converts WAIVE to skipped', () => {
      expect(toLegacyGateEvidence(Verdict.WAIVE)).toBe('skipped');
    });

    it('converts SKIP to skipped', () => {
      expect(toLegacyGateEvidence(Verdict.SKIP)).toBe('skipped');
    });
  });

  describe('makeVerdictRecord', () => {
    it('creates a record with timestamp', () => {
      const record = makeVerdictRecord(Verdict.PASS);
      expect(record.verdict).toBe(Verdict.PASS);
      expect(record.decidedAt).toBeDefined();
      expect(new Date(record.decidedAt).getTime()).toBeLessThanOrEqual(Date.now());
    });

    it('includes decidedBy when provided', () => {
      const record = makeVerdictRecord(Verdict.FAIL, 'user-1');
      expect(record.decidedBy).toBe('user-1');
    });

    it('includes reason when provided', () => {
      const record = makeVerdictRecord(Verdict.FAIL, 'user-1', {
        code: 'SCORE_BELOW_THRESHOLD',
        message: 'Coverage below 80%',
      });
      expect(record.reason?.code).toBe('SCORE_BELOW_THRESHOLD');
    });
  });
});
