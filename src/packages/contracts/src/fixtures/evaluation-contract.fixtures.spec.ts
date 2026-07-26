/**
 * GT-573 — the consumer oracle must be able to FAIL.
 *
 * Half of these cases are negative on purpose: a contract check that cannot go
 * red over the exact payload that caused the incident is a vacuous pass. The
 * legacy `{ topology, gates, summary }` envelope is therefore asserted to be
 * rejected AND to map to `SKIPPED`, which is precisely the regression.
 */

import {
  EVALUATE_INLINE_FAIL_REQUEST,
  EVALUATE_INLINE_PASS_REQUEST,
  EVALUATION_RESULT_FAIL_FIXTURE,
  EVALUATION_RESULT_PASS_FIXTURE,
  LEGACY_INLINE_ENVELOPE_FIXTURE,
  TRACKER_BOUND_GAP_KEYS,
  TRACKER_BOUND_GATE_KEYS,
  TRACKER_BOUND_RESULT_KEYS,
  assertTrackerEvaluationContract,
  checkTrackerEvaluationContract,
  normalizeGateVerdict,
  trackerDecisionFrom,
  type TrackerBoundEvaluationResult,
} from './evaluation-contract.fixtures';

describe('Tracker consumer contract for POST /api/v1/evaluate (GT-573)', () => {
  describe('request fixtures', () => {
    it('the passing request carries the satellite manifest inline', () => {
      expect(EVALUATE_INLINE_PASS_REQUEST.evaluationInput.files['evolith.yaml']).toContain('coreRef');
    });

    it('the failing request deliberately omits evolith.yaml (a blocking violation)', () => {
      expect(
        Object.keys(EVALUATE_INLINE_FAIL_REQUEST.evaluationInput.files),
      ).not.toContain('evolith.yaml');
    });
  });

  describe('response fixtures satisfy the bound surface', () => {
    it.each([
      ['PASS', EVALUATION_RESULT_PASS_FIXTURE],
      ['FAIL', EVALUATION_RESULT_FAIL_FIXTURE],
    ])('%s fixture exposes every bound top-level key, populated', (_label, fixture) => {
      for (const key of TRACKER_BOUND_RESULT_KEYS) {
        expect(fixture).toHaveProperty(key);
      }
      expect(checkTrackerEvaluationContract(fixture)).toEqual({ ok: true, missing: [] });
      expect(() => assertTrackerEvaluationContract(fixture)).not.toThrow();
    });

    it('the FAIL fixture exposes every bound gate and gap key', () => {
      const gate = EVALUATION_RESULT_FAIL_FIXTURE.results!.gate![0];
      for (const key of TRACKER_BOUND_GATE_KEYS) expect(gate).toHaveProperty(key);
      for (const key of TRACKER_BOUND_GAP_KEYS) expect(gate.gaps![0]).toHaveProperty(key);
    });
  });

  describe('trackerDecisionFrom — the consumer decision the ledger persists', () => {
    it('records PASSED for a passing canonical result', () => {
      expect(trackerDecisionFrom(EVALUATION_RESULT_PASS_FIXTURE)).toBe('PASSED');
    });

    it('records FAILED — never SKIPPED — for a failing canonical result', () => {
      expect(trackerDecisionFrom(EVALUATION_RESULT_FAIL_FIXTURE)).toBe('FAILED');
    });

    it('falls back to the gate verdicts when overallVerdict is absent', () => {
      const partial: TrackerBoundEvaluationResult = {
        results: { gate: [{ gateId: 'g', verdict: 'failed' }] },
      };
      expect(trackerDecisionFrom(partial)).toBe('FAILED');
    });

    it('records SKIPPED only when nothing was evaluated', () => {
      expect(trackerDecisionFrom({ results: { gate: [] } })).toBe('SKIPPED');
      expect(trackerDecisionFrom(undefined)).toBe('SKIPPED');
    });
  });

  describe('the legacy inline envelope — the regression itself', () => {
    it('is REJECTED by the contract check, naming overallVerdict', () => {
      const check = checkTrackerEvaluationContract(
        LEGACY_INLINE_ENVELOPE_FIXTURE as unknown as TrackerBoundEvaluationResult,
      );
      expect(check.ok).toBe(false);
      expect(check.missing.join('\n')).toMatch(/overallVerdict/);
      expect(() =>
        assertTrackerEvaluationContract(
          LEGACY_INLINE_ENVELOPE_FIXTURE as unknown as TrackerBoundEvaluationResult,
        ),
      ).toThrow(/drifted from the Tracker consumer contract/);
    });

    it('maps to SKIPPED even though it reports a FAILED gate — the exact incident', () => {
      expect(LEGACY_INLINE_ENVELOPE_FIXTURE.gates[0].verdict).toBe('failed');
      expect(
        trackerDecisionFrom(LEGACY_INLINE_ENVELOPE_FIXTURE as unknown as TrackerBoundEvaluationResult),
      ).toBe('SKIPPED');
    });
  });

  describe('normalizeGateVerdict mirrors the consumer', () => {
    it.each([
      ['PASS', 'passed'],
      ['FAIL', 'failed'],
      ['passed', 'passed'],
      ['error', 'failed'],
      ['skipped', 'skipped'],
      [undefined, 'skipped'],
    ])('%s → %s', (input, expected) => {
      expect(normalizeGateVerdict(input as string | undefined)).toBe(expected);
    });
  });
});
