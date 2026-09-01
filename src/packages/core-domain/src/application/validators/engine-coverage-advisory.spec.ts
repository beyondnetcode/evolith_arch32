/**
 * #628 — `evolith validate` with no flag runs the native evaluator, which decides
 * materially fewer rules than `--engine opa` over the same corpus. Both totals
 * were honest and every skip was published; what was missing was the sentence
 * telling the reader the missing coverage belongs to the ENGINE THEY DID NOT
 * CHOOSE rather than to their repository.
 *
 * These tests pin the two things that make the row worth having: it fires on the
 * shape a reader misreads, and it stays quiet otherwise. A row on every run is
 * noise that teaches people to skim past it.
 */

import { RulesetValidatorService } from './ruleset-validator.service';
import type { RuleCoverage } from './ruleset-validator.types';

type Issue = { ruleId: string; blocking: boolean; severity: string; title: string; description: string };

function coverage(checked: number, skipped: number, total: number): RuleCoverage {
  return {
    rulesChecked: checked,
    rulesSkipped: skipped,
    rulesErrored: 0,
    rulesTotal: total,
    skippedRuleIds: [],
    erroredRuleIds: [],
  } as unknown as RuleCoverage;
}

function advisoryFor(engineType: 'native' | 'opa', c: RuleCoverage): Issue | undefined {
  const service = Object.create(RulesetValidatorService.prototype) as Record<string, unknown>;
  service.engineType = engineType;
  return (service as unknown as {
    engineCoverageAdvisory(c: RuleCoverage): Issue | undefined;
  }).engineCoverageAdvisory(c);
}

describe('engine coverage advisory (#628)', () => {
  it('fires when the native engine skips more than it checks', () => {
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
    expect(issue!.description).toContain('--engine opa');
    expect(issue!.description).toContain('41');
    expect(issue!.description).toContain('118');
  });

  it('says nothing on the opa engine, however little it decided', () => {
    expect(advisoryFor('opa', coverage(2, 157, 159))).toBeUndefined();
  });

  it('says nothing when the native engine decided most of its scope', () => {
    expect(advisoryFor('native', coverage(133, 26, 159))).toBeUndefined();
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
