import {
  createSuccessEnvelope,
  createErrorEnvelope,
  deriveVerdict,
  isGatePhase,
  isErrorCode,
  GATE_PHASES,
  GATE_VERDICTS,
  ERROR_CODES,
  type GateViolation,
  type OutputMeta,
} from './gate-evidence';

describe('gate-evidence', () => {
  const meta: OutputMeta = {
    command: 'test',
    executedAt: '2026-01-01T00:00:00Z',
    durationMs: 100,
    correlationId: 'test-123',
  };

  describe('createSuccessEnvelope', () => {
    it('creates success envelope with data and meta', () => {
      const envelope = createSuccessEnvelope({ result: 'ok' }, meta);
      expect(envelope.success).toBe(true);
      expect(envelope.data).toEqual({ result: 'ok' });
      expect(envelope.meta).toMatchObject(meta);
    });
  });

  describe('createErrorEnvelope', () => {
    it('creates error envelope without details', () => {
      const envelope = createErrorEnvelope('RULESET_NOT_FOUND', 'Not found', meta);
      expect(envelope.success).toBe(false);
      expect(envelope.error.code).toBe('RULESET_NOT_FOUND');
      expect(envelope.error.message).toBe('Not found');
    });

    it('creates error envelope with details', () => {
      const envelope = createErrorEnvelope('VALIDATION_FAILED', 'Invalid', meta, { path: '/test' });
      expect(envelope.error.details).toEqual({ path: '/test' });
    });
  });

  describe('deriveVerdict', () => {
    it('returns passed when no violations', () => {
      expect(deriveVerdict([])).toBe('passed');
    });

    it('returns passed when only warnings', () => {
      const violations: GateViolation[] = [
        { ruleId: 'R-1', rulePath: 'test', artifact: 'test', passed: false, message: 'warning', severity: 'warning', remediation: '', gateRef: 'gate-f1' },
      ];
      expect(deriveVerdict(violations)).toBe('passed');
    });

    it('returns failed when any error violation', () => {
      const violations: GateViolation[] = [
        { ruleId: 'R-1', rulePath: 'test', artifact: 'test', passed: false, message: 'error', severity: 'error', remediation: '', gateRef: 'gate-f1' },
      ];
      expect(deriveVerdict(violations)).toBe('failed');
    });
  });

  describe('isGatePhase', () => {
    it('returns true for valid phases', () => {
      for (const phase of GATE_PHASES) {
        expect(isGatePhase(phase)).toBe(true);
      }
    });

    it('returns false for invalid values', () => {
      expect(isGatePhase('invalid')).toBe(false);
      expect(isGatePhase('')).toBe(false);
    });
  });

  describe('isErrorCode', () => {
    it('returns true for valid error codes', () => {
      for (const code of ERROR_CODES) {
        expect(isErrorCode(code)).toBe(true);
      }
    });

    it('returns false for invalid values', () => {
      expect(isErrorCode('INVALID_CODE')).toBe(false);
    });
  });

  describe('constants', () => {
    it('GATE_PHASES has 5 phases', () => {
      expect(GATE_PHASES).toHaveLength(5);
    });

    it('GATE_VERDICTS has 3 verdicts', () => {
      expect(GATE_VERDICTS).toHaveLength(3);
    });
  });
});
