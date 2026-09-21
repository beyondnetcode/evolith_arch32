/**
 * #628 / GT-716 AC5 — `evolith validate` publishes every skip, and the row this
 * suite pins is the sentence that says whom a skip belongs to: the ENGINE the
 * reader chose, not their repository — and, since GT-716, WHY it happened.
 *
 * Two things make the row worth having: it fires on the shape a reader misreads
 * (more skipped than checked) and stays quiet otherwise, and what it says is the
 * run's own coverage split in the same terms the known-limitations page uses.
 */

import { RulesetValidatorService } from './ruleset-validator.service';
import type { RuleCoverage } from './ruleset-validator.types';

type Issue = { ruleId: string; blocking: boolean; severity: string; title: string; description: string };

function coverage(checked: number, skipped: number, total: number, split?: Record<string, number>): RuleCoverage {
  return {
    rulesChecked: checked,
    rulesSkipped: skipped,
    rulesErrored: 0,
    rulesTotal: total,
    skippedRuleIds: [],
    erroredRuleIds: [],
    ...(split ? { skippedByEvaluability: split } : {}),
  } as unknown as RuleCoverage;
}

function advisoryFor(engineType: 'native' | 'opa', c: RuleCoverage): Issue | undefined {
  const service = Object.create(RulesetValidatorService.prototype) as Record<string, unknown>;
  service.engineType = engineType;
  return (service as unknown as {
    engineCoverageAdvisory(c: RuleCoverage): Issue | undefined;
  }).engineCoverageAdvisory(c);
}

describe('engine coverage advisory (#628, GT-716 AC5)', () => {
  it('fires when the native engine skips more than it checks, and attributes the gap to the engine', () => {
    const issue = advisoryFor('native', coverage(41, 118, 159));

    expect(issue).toBeDefined();
    expect(issue!.ruleId).toBe('GOV-ENGINE-COVERAGE');
    expect(issue!.severity).toBe('COULD');
    // Reporting a coverage gap must not fail a run: the two engines are allowed
    // to differ on reach, and only on reach.
    expect(issue!.blocking).toBe(false);
    // The point of the row is the attribution, so it has to be in the title --
    // a reader who only sees the issue table still gets it.
    expect(issue!.title).toContain('this is the engine, not your repository');
    expect(issue!.title).toContain('native engine');
    expect(issue!.description).toContain('41');
    expect(issue!.description).toContain('118');
    expect(issue!.description).toContain('73-validate-engine-coverage-parity.mjs');
  });

  it('fires on the OPA engine too, in its own name — GT-716 AC5: coverage is stated per engine', () => {
    const issue = advisoryFor('opa', coverage(7, 152, 159));
    expect(issue).toBeDefined();
    expect(issue!.title).toContain('OPA engine');
    expect(issue!.description).toContain('--engine opa');
  });

  it('states the split of its skips by class, in the words a reader can act on', () => {
    const issue = advisoryFor('native', coverage(56, 103, 159, {
      'needs-supplied-facts': 31, 'needs-external-system': 20, 'needs-runtime': 14, 'documentation-only': 30, 'unimplemented-native': 8,
    }));
    const d = issue!.description;
    expect(d).toContain('31 read a fact this run did not supply (needs-supplied-facts)');
    expect(d).toContain('`facts.satellite`');
    expect(d).toContain('the OPA engine decides it');
    expect(d).toContain('34 need an adapter');
    expect(d).toContain('30 carry no check');
    expect(d).toContain('8 have no native handler yet');
    // What this row can NOT say: it never ran the other engine.
    expect(d).not.toMatch(/usually means the native evaluator has no handler/);
  });

  it('on the OPA engine the supplied-fact class is the policy\'s, and the debt is a missing policy', () => {
    const issue = advisoryFor('opa', coverage(7, 152, 159, { 'supplied-facet-absent': 120, 'no-policy-in-bundle': 25, 'documentation-only': 7 }));
    const d = issue!.description;
    expect(d).toContain('120 read a fact this run did not supply (supplied-facet-absent)');
    expect(d).toContain('the policy decides it');
    expect(d).toContain('25 have no policy in the bundle yet');
  });

  it('says nothing when the engine decided most of its scope', () => {
    expect(advisoryFor('native', coverage(133, 26, 159))).toBeUndefined();
    expect(advisoryFor('opa', coverage(133, 26, 159))).toBeUndefined();
  });

  it('does not fire on a tie, only when skips genuinely outnumber checks', () => {
    expect(advisoryFor('native', coverage(80, 80, 160))).toBeUndefined();
    expect(advisoryFor('native', coverage(79, 81, 160))).toBeDefined();
  });

  it('reports the skipped share, and does not divide by zero on an empty scope', () => {
    expect(advisoryFor('native', coverage(0, 0, 0))).toBeUndefined();
    const issue = advisoryFor('native', coverage(40, 160, 200));
    expect(issue!.description).toContain('80%');
  });
});
