/**
 * GT-573 — the consumer oracle must be able to FAIL.
 *
 * Half of these cases are negative on purpose: a contract check that cannot go
 * red over the exact payload that caused the incident is a vacuous pass. The
 * legacy `{ topology, gates, summary }` envelope is therefore asserted to be
 * rejected AND to map to `SKIPPED`, which is precisely the regression.
 */

import {
  EVALUATION_RESULT_ATTRIBUTION_FIXTURE,
  EVALUATE_INLINE_ATTRIBUTED_REQUEST,
  EVALUATE_INLINE_FAIL_REQUEST,
  EVALUATE_INLINE_OPA_GATE_FAIL_REQUEST,
  EVALUATE_INLINE_PASS_REQUEST,
  EVALUATION_RESULT_FAIL_FIXTURE,
  EVALUATION_RESULT_OPA_GATE_FAIL_FIXTURE,
  EVALUATION_RESULT_PASS_FIXTURE,
  LEGACY_INLINE_ENVELOPE_FIXTURE,
  TRACKER_BOUND_GAP_KEYS,
  TRACKER_BOUND_GATE_KEYS,
  TRACKER_BOUND_RESULT_KEYS,
  assertFixtureCongruence,
  assertTrackerEvaluationContract,
  checkFixtureCongruence,
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

    it('the OPA-gate request is governance-conformant, so only the POLICY can fail it', () => {
      const files = EVALUATE_INLINE_OPA_GATE_FAIL_REQUEST.evaluationInput.files;
      // The manifest is present: GOV-000 cannot fire, so a FAIL cannot come from
      // the native governance evaluator.
      expect(files['evolith.yaml']).toContain('coreRef');
      // …and the phase's required artifact is present, so a FAIL cannot come
      // from artifact absence either. Only the .rego rule is left.
      expect(Object.keys(files)).toContain('docs/architecture.md');
    });
  });

  describe('response fixtures satisfy the bound surface', () => {
    it.each([
      ['PASS', EVALUATION_RESULT_PASS_FIXTURE],
      ['FAIL', EVALUATION_RESULT_FAIL_FIXTURE],
      ['OPA-gate FAIL', EVALUATION_RESULT_OPA_GATE_FAIL_FIXTURE],
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

  describe('the OPA-gate FAIL fixture is a POLICY decision, not a governance one', () => {
    const gate = EVALUATION_RESULT_OPA_GATE_FAIL_FIXTURE.results!.gate![0];

    it('names a real SDLC gate, not the synthetic general-rulesets bucket', () => {
      expect(gate.gateId).not.toBe('general-rulesets');
      expect(gate.gateId).toMatch(/^gate-/);
      // The governance FAIL fixture, by contrast, IS the synthetic bucket — the
      // two fixtures must not collapse into the same case.
      expect(EVALUATION_RESULT_FAIL_FIXTURE.results!.gate![0].gateId).toBe('general-rulesets');
    });

    it('is attributed to a phase, so the ledger row is placeable in the lifecycle', () => {
      expect(gate.phaseId).toBe('construction');
      expect(EVALUATION_RESULT_FAIL_FIXTURE.results!.gate![0].phaseId).toBeUndefined();
    });

    it('was executed by the OPA engine over a .rego rule', () => {
      const rules = EVALUATION_RESULT_OPA_GATE_FAIL_FIXTURE.rulesExecuted as ReadonlyArray<
        Record<string, unknown>
      >;
      expect(rules).toHaveLength(1);
      expect(rules[0].engine).toBe('opa');
      expect(String(rules[0].rulesetRef)).toMatch(/\.rego$/);
      expect(rules[0].verdict).toBe('FAIL');

      // Same assertion over the governance fixture must be the OTHER engine.
      const nativeRules = EVALUATION_RESULT_FAIL_FIXTURE.rulesExecuted as ReadonlyArray<
        Record<string, unknown>
      >;
      expect(nativeRules[0].engine).toBe('native');
    });

    it('reaches the consumer ledger as FAILED', () => {
      expect(trackerDecisionFrom(EVALUATION_RESULT_OPA_GATE_FAIL_FIXTURE)).toBe('FAILED');
      expect(trackerDecisionFrom(EVALUATION_RESULT_OPA_GATE_FAIL_FIXTURE)).not.toBe('SKIPPED');
    });
  });

  describe('checkFixtureCongruence — a fixture is only pinnable if it still matches reality', () => {
    it('accepts a live payload that is a superset of the fixture', () => {
      const live = { ...EVALUATION_RESULT_PASS_FIXTURE, brandNewField: 42 };
      expect(checkFixtureCongruence(live, EVALUATION_RESULT_PASS_FIXTURE)).toEqual({ ok: true, missing: [] });
      expect(() => assertFixtureCongruence(live, EVALUATION_RESULT_PASS_FIXTURE)).not.toThrow();
    });

    it('ignores values and compares only keys and types', () => {
      const live = {
        ...EVALUATION_RESULT_FAIL_FIXTURE,
        rationale: 'a completely different sentence',
        evaluatedAt: '2030-01-01T00:00:00.000Z',
      };
      expect(checkFixtureCongruence(live, EVALUATION_RESULT_FAIL_FIXTURE).ok).toBe(true);
    });

    it('goes red when the producer REMOVES a field the fixture pins', () => {
      const live = JSON.parse(JSON.stringify(EVALUATION_RESULT_FAIL_FIXTURE));
      delete live.results.compliance;
      const check = checkFixtureCongruence(live, EVALUATION_RESULT_FAIL_FIXTURE);
      expect(check.ok).toBe(false);
      expect(check.missing.join('\n')).toMatch(/\$\.results\.compliance/);
    });

    it('goes red when a field changes type', () => {
      const live = JSON.parse(JSON.stringify(EVALUATION_RESULT_FAIL_FIXTURE));
      live.results.gate = 'not-an-array';
      const check = checkFixtureCongruence(live, EVALUATION_RESULT_FAIL_FIXTURE);
      expect(check.ok).toBe(false);
      expect(check.missing.join('\n')).toMatch(/fixture is array but the live response is string/);
    });

    it('goes red when the fixture pins an element shape and the live array is empty', () => {
      const live = JSON.parse(JSON.stringify(EVALUATION_RESULT_FAIL_FIXTURE));
      live.results.gate = [];
      const check = checkFixtureCongruence(live, EVALUATION_RESULT_FAIL_FIXTURE);
      expect(check.ok).toBe(false);
      expect(check.missing.join('\n')).toMatch(/pins an element shape but the live array is empty/);
    });

    it('rejects the legacy envelope outright — the regression, seen through congruence', () => {
      expect(
        checkFixtureCongruence(LEGACY_INLINE_ENVELOPE_FIXTURE, EVALUATION_RESULT_FAIL_FIXTURE).ok,
      ).toBe(false);
      expect(() =>
        assertFixtureCongruence(LEGACY_INLINE_ENVELOPE_FIXTURE, EVALUATION_RESULT_FAIL_FIXTURE),
      ).toThrow(/no longer matches what the Core emits/);
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

  describe('GT-586 — a verdict says who asked for it and which revision it judged', () => {
    it('the attributed request carries a typed requester and a repository revision', () => {
      expect(EVALUATE_INLINE_ATTRIBUTED_REQUEST.requester.actorType).toBe('agent');
      expect(EVALUATE_INLINE_ATTRIBUTED_REQUEST.requester.actorId).toBe('winston@evolith');
      expect(EVALUATE_INLINE_ATTRIBUTED_REQUEST.repositoryRevision.revision).toBe('9f3c1ab');
    });

    it('the result echoes both back VERBATIM — nothing is derived', () => {
      // An invented commit sha in an audit trail is worse than an absent one, so
      // the fixture pins identity, not a transformation.
      expect(EVALUATION_RESULT_ATTRIBUTION_FIXTURE.requester)
        .toEqual(EVALUATE_INLINE_ATTRIBUTED_REQUEST.requester);
      expect(EVALUATION_RESULT_ATTRIBUTION_FIXTURE.repositoryRevision)
        .toEqual(EVALUATE_INLINE_ATTRIBUTED_REQUEST.repositoryRevision);
    });

    it('the fields are ADDITIVE: a verdict without them is still a valid result', () => {
      // The half that makes this safe to ship in a published package. The
      // pre-GT-586 fixtures must keep validating exactly as they did.
      expect(EVALUATION_RESULT_PASS_FIXTURE).not.toHaveProperty('requester');
      expect(EVALUATION_RESULT_PASS_FIXTURE).not.toHaveProperty('repositoryRevision');
      expect(trackerDecisionFrom(EVALUATION_RESULT_PASS_FIXTURE)).toBe('PASSED');
    });

    it('a caller that supplies no revision gets none back', () => {
      expect(EVALUATE_INLINE_PASS_REQUEST).not.toHaveProperty('repositoryRevision');
      expect(EVALUATE_INLINE_PASS_REQUEST).not.toHaveProperty('requester');
    });
  });
});
